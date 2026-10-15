// เช็ก DB ทั้งชุดกับฐานข้อมูลทดสอบ: npm run check:db
// ล้าง schema public ทุกครั้งที่รัน จึงยอมรันเฉพาะ DB ที่ชื่อลงท้าย _test
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { migrate } from './db-migrate.mjs';
import { prune } from './db-prune.mjs';
import * as slog from '../lib/server/search-log.ts';
import * as inq from '../lib/server/inquiries.ts';
import { readFileSync } from 'node:fs';
import { CATALOG } from '../lib/catalog.ts';
import * as cat from '../lib/server/catalog.ts';
import * as proj from '../lib/server/projects.ts';
import * as post from '../lib/server/posts.ts';
import { audit } from '../lib/server/audit.ts';
import { seed } from '../db/seed.mjs';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT } from '../lib/announcement.ts';
import * as tax from '../lib/server/taxonomy.ts';
import * as prod from '../lib/server/products.ts';
import { getAnnouncement, saveAnnouncement } from '../lib/server/announcement.ts';
import { imageExt, newName, resolveInside, toWebp, MAX_EDGE } from '../lib/server/uploads.ts';
import { disableAdmin, login, logout, sessionUser, sha256, upsertAdmin, verifyPassword } from '../lib/server/auth.ts';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5433/iterra_test';
assert.ok(new URL(url).pathname.endsWith('_test'), `ไม่รันกับ ${url}: ชื่อ DB ต้องลงท้าย _test`);

const pool = new pg.Pool({ connectionString: url });
const c = await pool.connect();
try {
  await c.query('drop schema public cascade; create schema public');

  // ── migrate (Task 1) ──
  assert.deepEqual(await migrate(c), ['001_init.sql', '002_audit_session_idle.sql', '003_search_queries.sql']);
  assert.deepEqual(await migrate(c), [], 'รันซ้ำต้องไม่รันไฟล์เดิม');
  const tables = (await c.query("select table_name from information_schema.tables where table_schema = 'public'")).rows
    .map((r) => r.table_name)
    .sort();
  assert.deepEqual(tables, [
    'admin_users', 'announcement', 'audit_log', 'brands', 'catalog', 'categories', 'inquiries', 'login_attempts',
    'materials', 'posts', 'products', 'project_products', 'projects', 'schema_migrations', 'search_queries', 'sessions',
  ]);
  // ตารางค่าชุดเดียวมีได้แถวเดียว
  await assert.rejects(
    c.query("insert into catalog (id, pdf, page_count, size_mb) values (2, '/x.pdf', 1, 1)"),
    /catalog_id_check/,
  );

  // ── seed (Task 2) ──
  await seed(c);
  const count = async (from) => (await c.query(`select count(*)::int as n from ${from}`)).rows[0].n;
  assert.equal(await count('categories'), 7);
  assert.equal(await count('materials'), 3);
  assert.equal(await count('brands'), new Set(products.map((p) => p.brand)).size);
  assert.equal(await count('products'), products.length);
  assert.equal(await count('products where published'), products.length);
  assert.equal(await count('posts'), posts.length);
  assert.equal(await count('projects'), projects.length);
  assert.equal(await count('project_products'), projects.reduce((s, p) => s + new Set(p.products).size, 0));
  assert.equal((await c.query('select seen_key from announcement')).rows[0].seen_key, ANNOUNCEMENT.id);
  assert.equal(await count('catalog'), 1);
  // "สอบถามราคา" เก็บเป็น null: DB ต้องไม่มีราคาที่ไม่ได้มาจากข้อมูลเดิม
  assert.equal(await count('products where price_th is not null'), products.filter((p) => p.price.th !== 'สอบถามราคา').length);
  await assert.rejects(seed(c), /DB มีข้อมูลแล้ว/);

  // ── login (Task 3) ──
  const pw = 'correct horse battery';
  await upsertAdmin(c, ' Admin@Example.test ', 'ผู้ทดสอบ', pw);
  assert.ok(await verifyPassword(pw, (await c.query('select password_hash from admin_users')).rows[0].password_hash));
  assert.equal(await verifyPassword('wrong', (await c.query('select password_hash from admin_users')).rows[0].password_hash), false);
  await assert.rejects(upsertAdmin(c, 'b@example.test', 'B', 'short'), /12/);
  assert.equal(await verifyPassword('anything', 'scrypt$ab$zz'), false);
  // อีเมลไม่สนตัวพิมพ์และช่องว่าง
  const s1 = await login(c, ' ADMIN@example.test', pw, 'ip-a', 14);
  assert.ok('token' in s1);
  assert.equal((await sessionUser(c, s1.token))?.email, 'admin@example.test');
  assert.equal(await sessionUser(c, 'not-a-token'), null);
  assert.equal(await sessionUser(c, undefined), null);
  // ผิด 5 ครั้งจาก IP เดียว: ครั้งต่อไปรหัสถูกก็ไม่ผ่าน · IP อื่นยังเข้าได้
  for (let i = 0; i < 5; i++) assert.deepEqual(await login(c, 'admin@example.test', 'wrong', 'ip-b', 14), { error: 'invalid' });
  assert.deepEqual(await login(c, 'admin@example.test', pw, 'ip-b', 14), { error: 'locked' });
  assert.ok('token' in (await login(c, 'admin@example.test', pw, 'ip-c', 14)));
  // หมดอายุ
  await c.query("update sessions set expires_at = now() - interval '1 second' where token_hash = $1", [sha256(s1.token)]);
  assert.equal(await sessionUser(c, s1.token), null);
  // ปิดบัญชีแล้วใช้ session เดิมไม่ได้ และเข้าใหม่ไม่ได้
  const s2 = await login(c, 'admin@example.test', pw, 'ip-d', 14);
  await c.query('update admin_users set disabled_at = now()');
  assert.equal(await sessionUser(c, s2.token), null);
  assert.deepEqual(await login(c, 'admin@example.test', pw, 'ip-e', 14), { error: 'invalid' });
  await c.query('update admin_users set disabled_at = null');
  // ออกจากระบบ
  assert.ok(await sessionUser(c, s2.token));
  await logout(c, s2.token);
  assert.equal(await sessionUser(c, s2.token), null);
  // รีเซ็ตรหัสแล้ว session เก่าทุกอันใช้ไม่ได้
  const s3 = await login(c, 'admin@example.test', pw, 'ip-f', 14);
  await upsertAdmin(c, 'admin@example.test', 'ผู้ทดสอบ', 'another long password');
  assert.equal(await sessionUser(c, s3.token), null);

  // ── หมวด แบรนด์ วัสดุ (Task 4) ──
  const cats = await tax.listCategories(c);
  assert.equal(cats.length, 7);
  assert.ok(cats.find((x) => x.key === 'faucet').count > 0);
  assert.equal(cats.find((x) => x.key === 'wardrobe').count, 0);
  assert.equal(cats[0].key, 'kitchen', 'เรียงตาม sort ของ seed');
  // ลบหมวดที่มีสินค้าไม่ได้ · หมวดว่างลบได้
  await assert.rejects(tax.deleteCategory(c, 'faucet'), (e) => e.code === '23503');
  await tax.deleteCategory(c, 'wardrobe');
  assert.equal((await tax.listCategories(c)).length, 6);
  // เพิ่มใหม่ไปอยู่ท้าย · รหัสซ้ำ · รหัสผิดรูป · ชื่อว่าง
  await tax.saveCategory(c, { key: 'wardrobe', th: 'ตู้เสื้อผ้า', en: 'Wardrobes', multiBrand: false }, true);
  assert.equal((await tax.listCategories(c)).at(-1).key, 'wardrobe');
  await assert.rejects(tax.saveCategory(c, { key: 'wardrobe', th: 'x', en: 'x', multiBrand: false }, true), (e) => e.code === '23505');
  await assert.rejects(tax.saveCategory(c, { key: 'Bad Key', th: 'x', en: 'x', multiBrand: false }, true), { name: 'InputError' });
  await assert.rejects(tax.saveCategory(c, { key: 'tiles', th: '  ', en: 'Tiles', multiBrand: false }, true), { name: 'InputError' });
  // ช่องข้อความหลังบ้านไม่รับ < และ > (เลือกปฏิเสธ ไม่ลบเงียบ ๆ)
  await assert.rejects(tax.saveCategory(c, { key: 'tiles', th: 'กระเบื้อง<b>', en: 'Tiles', multiBrand: false }, true), /< หรือ >/);
  await assert.rejects(tax.saveBrand(c, null, '<img src=x onerror=alert(1)>'), /< หรือ >/);
  await assert.rejects(tax.saveMaterial(c, { key: 'glass', th: 'แก้ว', en: 'Glass >' }, true), /< หรือ >/);
  // แก้ชื่อและ multiBrand · แก้รายการที่ไม่มีอยู่
  await tax.saveCategory(c, { key: 'wardrobe', th: 'ตู้', en: 'Closets', multiBrand: true }, false);
  assert.deepEqual((await tax.listCategories(c)).find((x) => x.key === 'wardrobe').name, { th: 'ตู้', en: 'Closets' });
  await assert.rejects(tax.saveCategory(c, { key: 'ghost', th: 'x', en: 'x', multiBrand: false }, false), { name: 'InputError' });

  const brandRows = await tax.listBrands(c);
  const kohler = brandRows.find((b) => b.name === 'KOHLER');
  assert.equal(kohler.count, products.length);
  await assert.rejects(tax.deleteBrand(c, kohler.id), (e) => e.code === '23503');
  await tax.saveBrand(c, null, 'Franke');
  await assert.rejects(tax.saveBrand(c, null, 'Franke'), (e) => e.code === '23505');
  const franke = (await tax.listBrands(c)).find((b) => b.name === 'Franke');
  await tax.saveBrand(c, franke.id, 'FRANKE');
  await tax.deleteBrand(c, franke.id);
  assert.equal((await tax.listBrands(c)).length, brandRows.length);

  const mats = await tax.listMaterials(c);
  assert.deepEqual(mats.map((m) => m.key), ['brass', 'stainless', 'castIron']);
  await tax.saveMaterial(c, { key: 'quartz', th: 'ควอตซ์', en: 'Quartz' }, true);
  await tax.deleteMaterial(c, 'quartz');
  await assert.rejects(tax.deleteMaterial(c, 'stainless'), (e) => e.code === '23503');

  // ── อัปโหลด (Task 5) ──
  const bytes = (...xs) => new Uint8Array([...xs, ...new Array(16).fill(0)]);
  const ascii = (s) => new Uint8Array([...Buffer.from(s), ...new Array(16).fill(0)]);
  assert.equal(imageExt(bytes(0xff, 0xd8, 0xff, 0xe0)), 'jpg');
  assert.equal(imageExt(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'png');
  assert.equal(imageExt(ascii('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  // ชื่อไฟล์ .jpg แต่ข้างในเป็น SVG หรือ HTML ต้องไม่ผ่าน
  assert.equal(imageExt(ascii('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(imageExt(ascii('<!doctype html><script>')), null);
  assert.equal(imageExt(new Uint8Array(0)), null);
  assert.match(newName('webp', new Date(2026, 9, 15)), /^2026\/10\/[0-9a-f]{24}\.webp$/);
  assert.equal(resolveInside('/srv/up', ['2026', '10', 'a.webp']), '/srv/up/2026/10/a.webp');
  assert.equal(resolveInside('/srv/up', ['..', 'etc', 'passwd']), null);
  assert.equal(resolveInside('/srv/up', ['2026', '..', '..', 'x']), null);
  assert.equal(resolveInside('/srv/up', ['..', 'up-evil', 'x']), null);
  assert.equal(resolveInside('/srv/up', []), null);

  // ── สินค้าหลังบ้าน (Task 6) ──
  assert.deepEqual(prod.parseSpecs('สี: โครเมียม (Chrome)\n\n  ขนาด : 20 x 30 ซม. '), [
    { label: 'สี', value: 'โครเมียม (Chrome)' },
    { label: 'ขนาด', value: '20 x 30 ซม.' },
  ]);
  assert.throws(() => prod.parseSpecs('ไม่มีโคลอน'), { name: 'InputError' });
  assert.equal(prod.slugFrom('  Elate Touchless Pull-down!  '), 'elate-touchless-pull-down');
  assert.equal(prod.slugFrom('ก๊อกน้ำ'), '');

  const all = await prod.listAdmin(c);
  assert.equal(all.length, products.length);
  const elate = all.find((p) => p.slug === 'elate-13963t-c4');
  assert.equal(elate.brand, 'KOHLER');
  assert.ok(elate.specs.includes(': '), 'สเปกแปลงเป็นข้อความบรรทัดละข้อ');
  // วันที่แก้ล่าสุดเป็นเวลาไทย: 20:00 UTC = 03:00 วันถัดไปที่กรุงเทพ
  await c.query("update products set updated_at = '2026-10-14T20:00:00Z' where id = $1", [elate.id]);
  assert.equal((await prod.listAdmin(c)).find((p) => p.id === elate.id).updated, '2026-10-15');

  const draft = {
    slug: '', category: 'sink', brandId: elate.brandId, material: 'stainless', series: 'Test',
    th: 'ซิงก์ทดสอบ', en: 'Test Sink 90', descTh: '', descEn: '', specs: 'ขนาด: 90 ซม.',
    images: ['/uploads/2026/10/a.webp'], published: false, featured: false,
  };
  const id = await prod.saveProduct(c, null, draft);
  let row = (await prod.listAdmin(c)).find((p) => p.id === id);
  assert.equal(row.slug, 'test-sink-90', 'slug ว่าง = สร้างจากชื่ออังกฤษ');
  assert.equal(row.published, false);
  // แก้แล้ว scenes และราคาเดิมต้องไม่หาย
  await c.query("update products set scenes = '{/media/scenes/x.webp}', price_th = 'ทดสอบ' where id = $1", [id]);
  await prod.saveProduct(c, id, { ...draft, slug: 'test-sink-90', th: 'ซิงก์ทดสอบ 2' });
  const raw = (await c.query('select name_th, scenes, price_th from products where id = $1', [id])).rows[0];
  assert.deepEqual(raw, { name_th: 'ซิงก์ทดสอบ 2', scenes: ['/media/scenes/x.webp'], price_th: 'ทดสอบ' });
  await prod.setPublished(c, id, true);
  assert.equal((await prod.listAdmin(c)).find((p) => p.id === id).published, true);
  // ข้อมูลผิด
  await assert.rejects(prod.saveProduct(c, null, { ...draft, th: ' ' }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, category: 'nope' }), /ไม่พบหมวด/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, brandId: 999999 }), /ไม่พบแบรนด์/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, material: 'gold' }), /ไม่พบวัสดุ/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, slug: 'Bad Slug' }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, images: ['javascript:alert(1)'] }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, images: ['/uploads/../../etc/passwd'] }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, th: 'ซิงก์ </script><script>x()</script>' }), /< หรือ >/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, series: 'A>B' }), /< หรือ >/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, specs: 'วัสดุ: <b>ทอง</b>' }), /< หรือ >/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, slug: 'test-sink-90' }), (e) => e.code === '23505');
  // แท็บอื่นลบไปแล้ว: แก้ไม่ได้ และไม่สร้างใหม่
  await prod.deleteProduct(c, id);
  await assert.rejects(prod.saveProduct(c, id, draft), /ไม่พบสินค้านี้/);
  await assert.rejects(prod.setPublished(c, id, true), /ไม่พบสินค้านี้/);
  assert.equal((await prod.listAdmin(c)).length, products.length);

  // ── หน้าเว็บอ่าน DB (Task 8) ──
  const pub = await prod.listPublished(c);
  assert.deepEqual(pub.map((p) => p.slug).sort(), products.map((p) => p.slug).sort());
  for (const seedP of products) {
    const p = pub.find((x) => x.slug === seedP.slug);
    assert.deepEqual(
      [p.category, p.brand, p.series, p.material, p.name, p.desc, p.specs, p.price, p.images, p.scenes, !!p.featured],
      [seedP.category, seedP.brand, seedP.series, seedP.material, seedP.name, seedP.desc, seedP.specs, seedP.price, seedP.images, seedP.scenes, !!seedP.featured],
      `สินค้า ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`,
    );
  }
  // ซ่อนแล้วหายจากหน้าเว็บ ทั้งรายการและหน้ารายละเอียด
  await c.query("update products set published = false where slug = 'elate-13963t-c4'");
  assert.ok(!(await prod.listPublished(c)).some((p) => p.slug === 'elate-13963t-c4'));
  assert.equal(await prod.getPublished(c, 'elate-13963t-c4'), null);
  await c.query("update products set published = true where slug = 'elate-13963t-c4'");
  assert.equal((await prod.getPublished(c, 'elate-13963t-c4')).name.en, products.find((p) => p.slug === 'elate-13963t-c4').name.en);
  assert.equal(await prod.getPublished(c, 'no-such-product'), null);
  // ── ประกาศ (Task 9) ──
  const a0 = await getAnnouncement(c);
  assert.equal(a0.id, ANNOUNCEMENT.id);
  assert.deepEqual(a0.cta, { label: ANNOUNCEMENT.cta.label, href: ANNOUNCEMENT.cta.href });
  const input = {
    enabled: true, titleTh: 'ลดราคา', titleEn: '', bodyTh: 'รายละเอียด', bodyEn: '', image: '',
    ctaTh: '', ctaEn: '', href: '', resetSeen: false,
  };
  await saveAnnouncement(c, input);
  const a1 = await getAnnouncement(c);
  assert.equal(a1.id, ANNOUNCEMENT.id, 'ไม่ติ๊กแสดงอีกครั้ง = คนที่ปิดไปแล้วไม่เห็นซ้ำ');
  assert.deepEqual(a1.title, { th: 'ลดราคา', en: 'ลดราคา' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
  assert.equal(a1.cta, null);
  assert.equal(a1.image, null);
  await saveAnnouncement(c, { ...input, resetSeen: true });
  assert.notEqual((await getAnnouncement(c)).id, ANNOUNCEMENT.id, 'ติ๊กแสดงอีกครั้ง = seen_key ใหม่');
  await assert.rejects(saveAnnouncement(c, { ...input, titleTh: ' ' }), { name: 'InputError' });
  await assert.rejects(saveAnnouncement(c, { ...input, href: 'javascript:alert(1)', ctaTh: 'กด' }), { name: 'InputError' });
  await assert.rejects(saveAnnouncement(c, { ...input, href: '/contact/' }), /ข้อความปุ่ม/);
  await assert.rejects(saveAnnouncement(c, { ...input, image: 'https://evil.example/x.png' }), { name: 'InputError' });
  await assert.rejects(saveAnnouncement(c, { ...input, titleTh: 'นัดชม<img src=x>' }), /< หรือ >/);
  await assert.rejects(saveAnnouncement(c, { ...input, bodyEn: 'Book <b>now</b>' }), /< หรือ >/);
  await assert.rejects(saveAnnouncement(c, { ...input, href: '/contact/', ctaTh: 'นัด<b>' }), /< หรือ >/);
  // /\evil.com เบราว์เซอร์อ่านเป็น //evil.com พาออกนอกเว็บ
  await assert.rejects(saveAnnouncement(c, { ...input, href: '/\\evil.com', ctaTh: 'กด' }), /ลิงก์ต้อง/);
  await saveAnnouncement(c, { ...input, href: 'https://line.me/ti/p/x', ctaTh: 'แชต', image: '/uploads/2026/10/a.webp' });
  assert.deepEqual((await getAnnouncement(c)).cta, { label: { th: 'แชต', en: 'แชต' }, href: 'https://line.me/ti/p/x' });
  // ── แปลงรูปเป็น WebP (Task 10) ──
  {
    // PNG กว้างเกินเพดาน: ได้ WebP ด้านยาวเท่า MAX_EDGE ไม่ขยายรูปเล็ก
    const big = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#c8b49a' } }).png().toBuffer();
    const out = await toWebp(new Uint8Array(big));
    assert.equal(imageExt(out), 'webp');
    const m = await sharp(out).metadata();
    assert.equal(m.width, MAX_EDGE);
    assert.equal(m.height, Math.round((1000 * MAX_EDGE) / 3000));
    const small = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#000' } }).jpeg().toBuffer();
    assert.equal((await sharp(await toWebp(new Uint8Array(small))).metadata()).width, 40);
    // JPEG orientation 6 (หมุน 90°) พร้อม EXIF: หมุนให้ตรงแล้วตัด metadata ทิ้ง
    const turned = await sharp({ create: { width: 60, height: 20, channels: 3, background: '#fff' } })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: 'test' } } })
      .toBuffer();
    const fixed = await sharp(await toWebp(new Uint8Array(turned))).metadata();
    assert.deepEqual([fixed.width, fixed.height], [20, 60]);
    assert.equal(fixed.exif, undefined);
    assert.equal(fixed.orientation, undefined);
    // ไฟล์เสียหรือไม่ใช่รูป: InputError ข้อความไทย
    await assert.rejects(toWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])), (e) => e.name === 'InputError');
  }
  // ── audit log, session ไม่ได้ใช้นาน, ปิดบัญชี (แผน 2 Task 1) ──
  {
    const pw2 = 'another long password';
    const uid = (await c.query("select id::int as id from admin_users where email = 'admin@example.test'")).rows[0].id;
    const last = async () =>
      (await c.query('select user_id::int as u, action, entity, entity_id, detail from audit_log order by id desc limit 1')).rows[0];
    // login สำเร็จเขียน audit · login ผิดไม่เขียน (อยู่ใน login_attempts แทน)
    const logins = await count("audit_log where action = 'login'");
    const s = await login(c, 'admin@example.test', pw2, 'ip-g', 14);
    assert.ok('token' in s);
    assert.deepEqual(await last(), { u: uid, action: 'login', entity: 'admin_user', entity_id: String(uid), detail: null });
    assert.deepEqual(await login(c, 'admin@example.test', 'wrong', 'ip-g', 14), { error: 'invalid' });
    assert.equal(await count("audit_log where action = 'login'"), logins + 1);
    // ออกจากระบบเขียน audit · token ที่ไม่มีจริงไม่เขียน
    await logout(c, s.token);
    assert.deepEqual(await last(), { u: uid, action: 'logout', entity: 'admin_user', entity_id: String(uid), detail: null });
    const rows = await count('audit_log');
    await logout(c, 'not-a-token');
    assert.equal(await count('audit_log'), rows);
    // audit() เก็บ id เป็นข้อความ และ detail เป็น jsonb · ผู้ใช้ที่ไม่มีจริงโดน FK
    await audit(c, uid, 'update', 'product', 42, { name: 'ซิงก์' });
    assert.deepEqual(await last(), { u: uid, action: 'update', entity: 'product', entity_id: '42', detail: { name: 'ซิงก์' } });
    await audit(c, null, 'disable', 'admin_user', null);
    assert.deepEqual(await last(), { u: null, action: 'disable', entity: 'admin_user', entity_id: null, detail: null });
    await assert.rejects(audit(c, 999999, 'update', 'product', 1), (e) => e.code === '23503');
    // ลบสินค้าคืน slug ให้ audit · ไม่มีแถวแล้วได้ null
    const brandId = (await tax.listBrands(c))[0].id;
    const tmp = await prod.saveProduct(c, null, {
      slug: 'audit-tmp', category: 'sink', brandId, material: '', series: '', th: 'ชั่วคราว', en: '', descTh: '', descEn: '',
      specs: '', images: [], published: false, featured: false,
    });
    assert.equal(await prod.deleteProduct(c, tmp), 'audit-tmp');
    assert.equal(await prod.deleteProduct(c, tmp), null);

    // session ไม่ได้ใช้เกิน 120 นาที (ค่าเริ่มต้น) ใช้ไม่ได้ แม้ยังไม่ครบ 14 วัน
    const t = (await login(c, 'admin@example.test', pw2, 'ip-h', 14)).token;
    const seen = (mins) =>
      c.query('update sessions set last_seen_at = now() - make_interval(mins => $2) where token_hash = $1', [sha256(t), mins]);
    const fresh = async () =>
      (await c.query("select last_seen_at > now() - interval '1 minute' as f from sessions where token_hash = $1", [sha256(t)])).rows[0].f;
    await seen(121);
    assert.equal(await sessionUser(c, t), null);
    await seen(119);
    assert.equal((await sessionUser(c, t))?.id, uid);
    assert.equal(await fresh(), true, 'ใช้หลังห่างเกิน 5 นาที: เขียนเวลาใช้งานใหม่');
    await seen(3);
    assert.ok(await sessionUser(c, t));
    assert.equal(await fresh(), false, 'ห่างไม่ถึง 5 นาที: ไม่เขียน DB');
    assert.equal(await sessionUser(c, t, 2), null, 'ตั้ง SESSION_IDLE_MIN สั้นลงได้');

    // ปิดบัญชี: ตั้ง disabled_at ลบ session ทั้งหมด เขียน audit (ผู้ทำคือสคริปต์ จึงไม่มี user_id)
    assert.equal(await disableAdmin(c, ' ADMIN@Example.test '), uid);
    assert.equal(await count(`sessions where user_id = ${uid}`), 0);
    assert.ok((await c.query('select disabled_at from admin_users where id = $1', [uid])).rows[0].disabled_at);
    assert.deepEqual(await last(), {
      u: null, action: 'disable', entity: 'admin_user', entity_id: String(uid), detail: { email: 'admin@example.test' },
    });
    assert.equal(await sessionUser(c, t), null);
    assert.equal(await disableAdmin(c, 'admin@example.test'), null, 'ปิดซ้ำ = ไม่พบบัญชีที่ใช้งานอยู่');
    assert.equal(await disableAdmin(c, 'nobody@example.test'), null);
    // เปิดใช้ใหม่ด้วย db:admin (upsertAdmin ล้าง disabled_at) ให้ส่วนถัดไปใช้บัญชีนี้ต่อ
    await upsertAdmin(c, 'admin@example.test', 'ผู้ทดสอบ', pw2);
    assert.ok('token' in (await login(c, 'admin@example.test', pw2, 'ip-i', 14)));
  }
  // ── บทความ (แผน 2 Task 2) ──
  {
    // หน้าเว็บ: ตรงกับข้อมูลเดิมทุกช่อง เรียงวันที่ใหม่ก่อน (หน้าบทความจึงแสดงเหมือนเดิม)
    const cards = await post.listPublishedPosts(c);
    assert.deepEqual(cards.map((p) => p.slug), posts.map((p) => p.slug));
    for (const seedP of posts) {
      const { body: _b, inline: _i, ...card } = seedP;
      assert.deepEqual(cards.find((p) => p.slug === seedP.slug), card, `การ์ดบทความ ${seedP.slug}`);
      assert.deepEqual(await post.getPublishedPost(c, seedP.slug), { ...seedP }, `บทความ ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`);
    }
    assert.equal(await post.getPublishedPost(c, 'no-such-post'), null);
    assert.deepEqual(post.paragraphs('ก\n\nข\n \n\nค\n'), ['ก', 'ข', 'ค']);

    // หลังบ้าน: ร่างไม่ขึ้นหน้าเว็บ และเปิดจากลิงก์ตรงไม่ได้
    assert.equal((await post.listAdminPosts(c)).length, posts.length);
    const draft = {
      slug: '', titleTh: 'ทดสอบบทความ', titleEn: 'Test Post One', excerptTh: 'สั้น ๆ', excerptEn: '', tagTh: 'ทดสอบ',
      bodyTh: 'ย่อหน้าแรก\n\nย่อหน้าสอง\n\n\nย่อหน้าสาม', cover: '/uploads/2026/10/a.webp', inline: [], published: false,
    };
    const pid = await post.savePost(c, null, draft);
    const row = (await post.listAdminPosts(c)).find((p) => p.id === pid);
    assert.equal(row.slug, 'test-post-one', 'slug ว่าง = สร้างจากหัวข้ออังกฤษ');
    assert.equal(row.date, '', 'ไม่ติ๊กเผยแพร่ = ร่าง');
    assert.equal(row.published, false);
    assert.equal(await post.getPublishedPost(c, 'test-post-one'), null);
    assert.ok(!(await post.listPublishedPosts(c)).some((p) => p.slug === 'test-post-one'));
    // เผยแพร่: วันที่วันนี้ตามเวลาไทย ขึ้นเป็นบทความล่าสุด
    await post.setPostPublished(c, pid, true);
    const today = (await c.query("select to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD') as d")).rows[0].d;
    const shown = await post.getPublishedPost(c, 'test-post-one');
    assert.equal(shown.date, today);
    assert.deepEqual(shown.body, ['ย่อหน้าแรก', 'ย่อหน้าสอง', 'ย่อหน้าสาม']);
    assert.deepEqual(shown.excerpt, { th: 'สั้น ๆ', en: 'สั้น ๆ' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
    assert.deepEqual(shown.title, { th: 'ทดสอบบทความ', en: 'Test Post One' });
    assert.equal((await post.listPublishedPosts(c))[0].slug, 'test-post-one');
    // แก้แล้ววันเผยแพร่เดิมไม่เปลี่ยน · ซ่อนแล้วหายจากหน้าเว็บ
    await c.query("update posts set published_at = '2026-01-02' where id = $1", [pid]);
    await post.savePost(c, pid, { ...draft, slug: 'test-post-one', titleTh: 'ทดสอบ 2', inline: ['/media/scenes/a.webp'], published: true });
    assert.equal((await post.getPublishedPost(c, 'test-post-one')).date, '2026-01-02');
    assert.deepEqual((await post.getPublishedPost(c, 'test-post-one')).inline, ['/media/scenes/a.webp']);
    // ล้างช่อง slug ตอนแก้ = ใช้ slug เดิม ลิงก์สาธารณะไม่เปลี่ยน
    await post.savePost(c, pid, { ...draft, slug: '', titleEn: 'Changed Title', published: true });
    assert.equal((await post.listAdminPosts(c)).find((p) => p.id === pid).slug, 'test-post-one', 'แก้แล้วล้าง slug ต้องคง slug เดิม');
    await post.setPostPublished(c, pid, false);
    assert.equal(await post.getPublishedPost(c, 'test-post-one'), null);
    // ข้อมูลผิด
    await assert.rejects(post.savePost(c, null, { ...draft, titleTh: ' ' }), /หัวข้อ/);
    await assert.rejects(post.savePost(c, null, { ...draft, bodyTh: '' }), /เนื้อหา/);
    await assert.rejects(post.savePost(c, null, { ...draft, cover: '' }), /รูปปก/);
    await assert.rejects(post.savePost(c, null, { ...draft, cover: 'https://evil.example/x.webp' }), /ที่อยู่รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, inline: ['/media/a.webp', '/media/b.webp', '/media/c.webp'] }), /ไม่เกิน 2 รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, inline: ['/uploads/../../etc/passwd'] }), /ที่อยู่รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, slug: 'Bad Slug' }), { name: 'InputError' });
    await assert.rejects(post.savePost(c, null, { ...draft, bodyTh: 'ดู <script>x()</script>' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, titleEn: 'A > B' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, tagTh: 'a<b' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, slug: 'test-post-one' }), (e) => e.code === '23505');
    // แท็บอื่นลบไปแล้ว: แก้ไม่ได้ และไม่สร้างใหม่
    assert.equal(await post.deletePost(c, pid), 'test-post-one');
    assert.equal(await post.deletePost(c, pid), null);
    await assert.rejects(post.savePost(c, pid, draft), /ไม่พบบทความนี้/);
    await assert.rejects(post.setPostPublished(c, pid, true), /ไม่พบบทความนี้/);
    assert.equal((await post.listAdminPosts(c)).length, posts.length);
  }
  // ── ผลงาน (แผน 2 Task 3) ──
  {
    // หน้าเว็บ: ตรงกับข้อมูลเดิม (สินค้าเทียบเป็นชุด เพราะเรียงตาม sort ของสินค้า project_products ไม่มีลำดับ)
    const pub = await proj.listPublishedProjects(c);
    assert.deepEqual(pub.map((p) => p.slug), projects.map((p) => p.slug));
    for (const seedP of projects) {
      const p = pub.find((x) => x.slug === seedP.slug);
      assert.deepEqual(
        { ...p, products: [...p.products].sort() },
        { ...seedP, products: [...new Set(seedP.products)].sort() },
        `ผลงาน ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`,
      );
    }
    // หลังบ้าน: สร้างแบบยังไม่เผยแพร่ สินค้าซ้ำเก็บครั้งเดียว
    const ids = (await prod.listAdmin(c)).slice(0, 2).map((p) => p.id);
    const num = (a) => [...a].sort((x, y) => x - y);
    const draft = {
      slug: '', th: 'บ้านทดสอบ', en: 'Test House', locationTh: 'กรุงเทพฯ', locationEn: '', typeTh: 'บ้านเดี่ยว', typeEn: '',
      year: '2026', images: ['/uploads/2026/10/a.webp'], products: [ids[0], ids[1], ids[0]], published: false,
    };
    const id = await proj.saveProject(c, null, draft);
    const row = (await proj.listAdminProjects(c)).find((p) => p.id === id);
    assert.equal(row.slug, 'test-house', 'slug ว่าง = สร้างจากชื่ออังกฤษ');
    assert.deepEqual(num(row.products), num(ids));
    assert.equal(row.year, '2026');
    assert.ok(!(await proj.listPublishedProjects(c)).some((p) => p.slug === 'test-house'), 'ยังไม่เผยแพร่ ต้องไม่เห็น');
    await proj.setProjectPublished(c, id, true);
    const shown = (await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house');
    assert.ok(shown, 'เผยแพร่แล้วต้องเห็น');
    assert.deepEqual(shown.location, { th: 'กรุงเทพฯ', en: 'กรุงเทพฯ' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
    assert.equal(shown.year, 2026);
    assert.equal((await proj.listPublishedProjects(c)).at(-1).slug, 'test-house', 'ผลงานใหม่ไปอยู่ท้าย');
    // แก้รายการสินค้า = แทนทั้งชุด · สินค้าที่ซ่อนอยู่ไม่โผล่บนหน้าเว็บ
    await proj.saveProject(c, id, { ...draft, slug: 'test-house', products: [ids[1]], published: true });
    assert.deepEqual((await proj.listAdminProjects(c)).find((p) => p.id === id).products, [ids[1]]);
    // ล้างช่อง slug ตอนแก้ = ใช้ slug เดิม
    await proj.saveProject(c, id, { ...draft, slug: '', en: 'Changed Name', products: [ids[1]], published: true });
    assert.equal((await proj.listAdminProjects(c)).find((p) => p.id === id).slug, 'test-house', 'แก้แล้วล้าง slug ต้องคง slug เดิม');
    await c.query('update products set published = false where id = $1', [ids[1]]);
    assert.deepEqual((await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house').products, []);
    await c.query('update products set published = true where id = $1', [ids[1]]);
    assert.equal((await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house').products.length, 1);
    // ข้อมูลผิด
    await assert.rejects(proj.saveProject(c, null, { ...draft, th: '' }), /ชื่อผลงาน/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, year: '26' }), /ปี/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, year: '1500' }), /ปี/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, images: [] }), /อย่างน้อย 1 รูป/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, images: ['javascript:alert(1)'] }), /ที่อยู่รูป/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, products: [999999] }), /ไม่พบสินค้า/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, products: ['1'] }), /ไม่พบสินค้า/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, locationTh: 'กทม<b>' }), /< หรือ >/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, typeEn: 'House >' }), /< หรือ >/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, slug: 'test-house' }), (e) => e.code === '23505');
    // ลบ: ลิงก์สินค้าหายตาม (on delete cascade) แต่สินค้ายังอยู่
    assert.equal(await proj.deleteProject(c, id), 'test-house');
    assert.equal(await proj.deleteProject(c, id), null);
    assert.equal(await count(`project_products where project_id = ${id}`), 0);
    assert.equal(await count(`products where id = ${ids[1]}`), 1);
    await assert.rejects(proj.saveProject(c, id, draft), /ไม่พบผลงานนี้/);
    await assert.rejects(proj.setProjectPublished(c, id, true), /ไม่พบผลงานนี้/);
  }
  // ── แคตตาล็อก PDF (แผน 2 Task 4) ──
  {
    const pdf = (s) => new Uint8Array(Buffer.from(s, 'latin1'));
    const two = pdf(
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n' +
        '3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n4 0 obj << /Type/Page/Parent 2 0 R >> endobj\n%%EOF\n',
    );
    assert.equal(cat.isPdf(two), true);
    assert.equal(cat.pdfPageCount(two), 2);
    // ไฟล์จริงที่หน้าเว็บใช้อยู่: 49 หน้า 18 MB (ปัดขึ้นแบบ du -m)
    const real = new Uint8Array(readFileSync('public/media/catalog/kohler-kitchens-2026.pdf'));
    assert.equal(cat.pdfPageCount(real), CATALOG.pages);
    assert.equal(cat.pdfSizeMb(real.length), CATALOG.pdfSizeMB);
    assert.equal(cat.pdfSizeMb(1), 1);
    // ชื่อ .pdf แต่ข้างในเป็นอย่างอื่น
    assert.equal(cat.isPdf(pdf('<!doctype html><script>alert(1)</script>')), false);
    assert.equal(cat.isPdf(pdf(' %PDF-1.4')), false);
    assert.equal(cat.isPdf(new Uint8Array(0)), false);
    // หาโครงหน้าไม่เจอ = 0 (ไม่ทราบ หน้าเว็บไม่แสดงจำนวนหน้า)
    assert.equal(cat.pdfPageCount(pdf('%PDF-1.7\n%%EOF\n')), 0);
    assert.equal(cat.MAX_PDF, 30 * 1024 * 1024);
    assert.equal(cat.BUILT_PDF, CATALOG.pdf, 'ภาพรายหน้าใน public/media/catalog สร้างจากไฟล์นี้');
    const info = async () => {
      const { updated: _u, ...x } = await cat.getCatalog(c);
      return x;
    };
    // seed: ไฟล์เดิม มีภาพรายหน้า
    assert.deepEqual(await info(), { pdf: CATALOG.pdf, pages: 49, sizeMb: 18, images: true });
    // เปลี่ยนไฟล์แล้ว ภาพรายหน้าชุดเดิมต้องไม่แสดง
    await cat.saveCatalog(c, '/uploads/2026/10/abc.pdf', 12, 3);
    assert.deepEqual(await info(), { pdf: '/uploads/2026/10/abc.pdf', pages: 12, sizeMb: 3, images: false });
    for (const bad of ['/etc/passwd', 'https://evil.example/x.pdf', '/uploads/../x.pdf', '/uploads/2026/10/a.webp', 'javascript:alert(1)']) {
      await assert.rejects(cat.saveCatalog(c, bad, 1, 1), { name: 'InputError' }, bad);
    }
    await assert.rejects(cat.saveCatalog(c, '/uploads/a.pdf', -1, 1), { name: 'InputError' });
    await assert.rejects(cat.saveCatalog(c, '/uploads/a.pdf', 1, 0), { name: 'InputError' });
    assert.equal((await info()).pdf, '/uploads/2026/10/abc.pdf', 'ข้อมูลผิดไม่แตะแถวเดิม');
    // กลับเป็นไฟล์เดิม: ภาพรายหน้ากลับมา
    await cat.saveCatalog(c, CATALOG.pdf, 49, 18);
    assert.equal((await info()).images, true);
  }
  // ── ฟอร์มติดต่อ (แผน 2 Task 5) ──
  {
    const ok = { name: 'คุณทดสอบ', email: 'buyer@example.test', message: 'สนใจซิงก์ 90 ซม.', hp_x: '' };
    assert.equal(await inq.submitInquiry(c, ok, 'ip-q'), null);
    assert.deepEqual(
      (await c.query('select name, email, message, ip_hash, emailed_at, handled_at from inquiries order by id desc limit 1')).rows[0],
      { name: 'คุณทดสอบ', email: 'buyer@example.test', message: 'สนใจซิงก์ 90 ซม.', ip_hash: 'ip-q', emailed_at: null, handled_at: null },
    );
    // ช่องบนหน้าเว็บคือ อีเมลหรือเบอร์โทร: เบอร์โทรผ่าน
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '081-234 5678' }, 'ip-q2'), null);
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '+66 81 234 5678' }, 'ip-q2'), null);
    const stored = await count('inquiries');
    // ช่องดักบอทมีค่า: ตอบเหมือนสำเร็จ แต่ไม่เก็บ
    assert.equal(await inq.submitInquiry(c, { ...ok, hp_x: 'http://spam.example' }, 'ip-q3'), null);
    // ข้อมูลผิด: ได้รหัสข้อผิด และไม่เก็บ
    assert.equal(await inq.submitInquiry(c, { ...ok, name: '  ' }, 'ip-q3'), 'name');
    assert.equal(await inq.submitInquiry(c, { ...ok, name: 'ก'.repeat(101) }, 'ip-q3'), 'name');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: 'not-an-email' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '12345' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: '' }, 'ip-q3'), 'message');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: 'ก'.repeat(2001) }, 'ip-q3'), 'message');
    assert.equal(await inq.submitInquiry(c, { ...ok, name: '<b>x</b>' }, 'ip-q3'), 'chars');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: 'hi <script>alert(1)</script>' }, 'ip-q3'), 'chars');
    assert.equal(await inq.submitInquiry(c, { name: 1, email: null, message: {} }, 'ip-q3'), 'name');
    assert.equal(await inq.submitInquiry(c, null, 'ip-q3'), 'name');
    assert.equal(await count('inquiries'), stored);
    // 3 ข้อความต่อ IP ใน 10 นาที · IP อื่นยังส่งได้ · พ้น 10 นาทีส่งได้อีก
    for (let i = 0; i < 3; i++) assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), null);
    const beforeLimit = await count('inquiries');
    assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), 'limit');
    assert.equal(await count('inquiries'), beforeLimit, 'ถูกปฏิเสธแล้วไม่เก็บ');
    assert.equal(await inq.submitInquiry(c, ok, 'ip-s'), null);
    await c.query("update inquiries set created_at = now() - interval '11 minutes' where ip_hash = 'ip-r'");
    assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), null);
    // กล่องข้อความหลังบ้าน: ใหม่สุดก่อน ไม่ส่ง ip_hash ไปหน้าจอ · ทำเครื่องหมายจัดการแล้ว
    const list = await inq.listInquiries(c);
    assert.equal(list.length, await count('inquiries'));
    assert.deepEqual(Object.keys(list[0]).sort(), ['created', 'email', 'handled', 'id', 'message', 'name']);
    // แถวที่ย้อนเวลาไปแล้ว (ip-r รอบแรก) ต้องอยู่ท้าย · ที่เหลือเรียง id มากไปน้อย (created มีความละเอียดระดับนาที จึงเทียบ id)
    const oldIds = (await c.query("select id::int as id from inquiries where created_at < now() - interval '5 minutes' order by id desc")).rows.map((r) => r.id);
    assert.equal(oldIds.length, 3);
    assert.deepEqual(list.slice(-3).map((x) => x.id), oldIds, 'แถวเก่าอยู่ท้าย');
    const fresh = list.slice(0, -3);
    assert.ok(fresh.every((x, i) => i === 0 || fresh[i - 1].id > x.id), 'ใหม่สุดก่อน');
    assert.equal(list[0].handled, false);
    await inq.markHandled(c, list[0].id);
    assert.equal((await inq.listInquiries(c)).find((x) => x.id === list[0].id).handled, true);
    await inq.markHandled(c, list[0].id);
    await assert.rejects(inq.markHandled(c, 999999), /ไม่พบข้อความนี้/);
    await assert.rejects(inq.markHandled(c, 'x'), /ไม่พบข้อความนี้/);
  }
  // ── สถิติคำค้น (แผน 2 Task 6) ──
  {
    const N = slog.normalizeQuery;
    assert.equal(N('  Elate   SINK '), 'elate sink');
    assert.equal(N('ซิงก์'), 'ซิงก์');
    assert.equal(N('KOHLER 2026'), 'kohler 2026');
    assert.equal(N('1234567'), '1234567', '7 หลักยังเก็บได้ เช่นรหัสรุ่น');
    assert.equal(N('x'.repeat(70)).length, 60);
    // สั้นเกิน ว่าง ไม่ใช่ข้อความ ไม่เก็บ
    assert.equal(N('a'), null);
    assert.equal(N('   '), null);
    assert.equal(N(42), null);
    assert.equal(N(null), null);
    // ข้อมูลส่วนบุคคลไม่เก็บ: อีเมล เบอร์โทร เลขยาว (ทั้งเลขอารบิกและเลขไทย)
    assert.equal(N('me@example.com'), null);
    assert.equal(N('ติดต่อ somchai@mail.co.th'), null);
    assert.equal(N('0812345678'), null);
    assert.equal(N('081 234 5678'), null);
    assert.equal(N('081-234-5678'), null);
    assert.equal(N('๐๘๑๒๓๔๕๖๗๘'), null);
    assert.equal(N('<script>'), null);
    // รูปแบบที่เคยหลุด: วงเล็บ จุด ทับ ช่องว่างรอบ @ @ เต็มความกว้าง เลขเต็มความกว้าง ช่องว่างความกว้างศูนย์
    assert.equal(N('(02) 123-4567'), null);
    assert.equal(N('081.234.5678'), null);
    assert.equal(N('081/234/5678'), null);
    assert.equal(N('4111.1111.1111.1111'), null);
    assert.equal(N('me @ example.com'), null);
    assert.equal(N('me@ gmail.com'), null);
    assert.equal(N('me\uFF20example.com'), null);
    assert.equal(N('\uFF10\uFF18\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18'), null);
    assert.equal(N('081\u200B2345678'), null);
    // ต้องยังเก็บ: ที่เก็บคือคำเดิม ไม่ใช่รูป NFKC (NFKC เปลี่ยนสระอำ)
    assert.equal(N('สมชาย 0812345'), 'สมชาย 0812345');
    assert.equal(N('น้ำ'), 'น้ำ');

    const day = (await c.query("select (now() at time zone 'Asia/Bangkok')::date::text as d")).rows[0].d;
    const row = async (q) =>
      (await c.query('select searches, clicks, zero_results from search_queries where day = $1 and query = $2', [day, q])).rows[0];
    // กดผล = ค้น 1 กด 1 · ปิดแผงโดยไม่กด = ค้น 1 (ไม่พบผล 1 เมื่อผลเป็น 0)
    assert.equal(await slog.logSearch(c, 'Elate', true, 3), true);
    assert.equal(await slog.logSearch(c, ' elate ', false, 3), true);
    assert.equal(await slog.logSearch(c, 'zzqq', false, 0), true);
    assert.deepEqual(await row('elate'), { searches: 2, clicks: 1, zero_results: 0 });
    assert.deepEqual(await row('zzqq'), { searches: 1, clicks: 0, zero_results: 1 });
    assert.equal(await slog.logSearch(c, 'me@example.com', false, 0), false);
    assert.equal(await count("search_queries where query like '%@%'"), 0);
    // ตารางไม่มีคอลัมน์ที่ระบุตัวคน
    const cols = (
      await c.query("select column_name from information_schema.columns where table_name = 'search_queries' order by ordinal_position")
    ).rows.map((r) => r.column_name);
    assert.deepEqual(cols, ['day', 'query', 'searches', 'clicks', 'zero_results']);
    // เพดานคำใหม่ต่อวัน: คำที่มีแล้วยังนับต่อ คำใหม่ไม่เพิ่มแถว
    assert.equal(await count(`search_queries where day = '${day}'`), 2);
    assert.equal(await slog.logSearch(c, 'brand new', false, 1, 2), false, 'มี 2 คำแล้ว = เต็มเพดาน 2');
    assert.equal(await slog.logSearch(c, 'elate', false, 1, 2), true);
    assert.equal((await row('elate')).searches, 3);
  }
  // ── ล้างข้อมูลเก่า (แผน 2 Task 7) ──
  {
    const uid = (await c.query("select id::int as id from admin_users where email = 'admin@example.test'")).rows[0].id;
    await c.query(
      "insert into login_attempts (ip_hash, at) values ('prune-old', now() - interval '91 days'), ('prune-new', now() - interval '89 days')",
    );
    await c.query(
      `insert into sessions (token_hash, user_id, expires_at, last_seen_at) values
         ('prune-expired', $1, now() - interval '1 second', now()),
         ('prune-idle', $1, now() + interval '1 day', now() - interval '121 minutes'),
         ('prune-live', $1, now() + interval '1 day', now())`,
      [uid],
    );
    await c.query(
      `insert into audit_log (at, action, entity) values
         (now() - interval '366 days', 'prune-old', 'test'), (now() - interval '364 days', 'prune-new', 'test')`,
    );
    await c.query(
      "insert into search_queries (day, query, searches) values (current_date - 401, 'prune-old', 1), (current_date - 399, 'prune-new', 1)",
    );
    await c.query(
      "insert into inquiries (name, email, message, ip_hash, created_at) values ('เก่า', 'old@example.test', 'เก่ามาก', 'prune', now() - interval '1000 days')",
    );
    const r = await prune(c, 120);
    assert.ok(r.loginAttempts >= 1 && r.sessions >= 2 && r.audit >= 1 && r.searches >= 1, JSON.stringify(r));
    const left = async (sql) => (await c.query(sql)).rows.map((x) => Object.values(x)[0]).sort();
    assert.deepEqual(await left("select ip_hash from login_attempts where ip_hash like 'prune-%'"), ['prune-new']);
    assert.deepEqual(await left("select token_hash from sessions where token_hash like 'prune-%'"), ['prune-live']);
    assert.deepEqual(await left("select action from audit_log where action like 'prune-%'"), ['prune-new']);
    assert.deepEqual(await left("select query from search_queries where query like 'prune-%'"), ['prune-new']);
    assert.equal(await count("inquiries where ip_hash = 'prune'"), 1, 'ข้อความติดต่อไม่ลบ รอฝ่ายกฎหมาย');
    // รันซ้ำทันที ไม่มีอะไรให้ลบ
    assert.deepEqual(await prune(c, 120), { loginAttempts: 0, sessions: 0, audit: 0, searches: 0 });
  }
  console.log('ผ่าน: ฐานข้อมูล');
} finally {
  c.release();
  await pool.end();
}
