// เช็ก DB ทั้งชุดกับฐานข้อมูลทดสอบ: npm run check:db
// ล้าง schema public ทุกครั้งที่รัน จึงยอมรันเฉพาะ DB ที่ชื่อลงท้าย _test
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { migrate } from './db-migrate.mjs';
import { seed } from '../db/seed.mjs';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT } from '../lib/announcement.ts';
import * as tax from '../lib/server/taxonomy.ts';
import * as prod from '../lib/server/products.ts';
import { getAnnouncement, saveAnnouncement } from '../lib/server/announcement.ts';
import { imageExt, newName, resolveInside, toWebp, MAX_EDGE } from '../lib/server/uploads.ts';
import { login, logout, sessionUser, sha256, upsertAdmin, verifyPassword } from '../lib/server/auth.ts';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5433/iterra_test';
assert.ok(new URL(url).pathname.endsWith('_test'), `ไม่รันกับ ${url}: ชื่อ DB ต้องลงท้าย _test`);

const pool = new pg.Pool({ connectionString: url });
const c = await pool.connect();
try {
  await c.query('drop schema public cascade; create schema public');

  // ── migrate (Task 1) ──
  assert.deepEqual(await migrate(c), ['001_init.sql']);
  assert.deepEqual(await migrate(c), [], 'รันซ้ำต้องไม่รันไฟล์เดิม');
  const tables = (await c.query("select table_name from information_schema.tables where table_schema = 'public'")).rows
    .map((r) => r.table_name)
    .sort();
  assert.deepEqual(tables, [
    'admin_users', 'announcement', 'brands', 'catalog', 'categories', 'inquiries', 'login_attempts',
    'materials', 'posts', 'products', 'project_products', 'projects', 'schema_migrations', 'sessions',
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
  console.log('ผ่าน: ฐานข้อมูล');
} finally {
  c.release();
  await pool.end();
}
