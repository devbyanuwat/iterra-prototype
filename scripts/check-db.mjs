// เช็ก DB ทั้งชุดกับฐานข้อมูลทดสอบ: npm run check:db
// ล้าง schema public ทุกครั้งที่รัน จึงยอมรันเฉพาะ DB ที่ชื่อลงท้าย _test
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from './db-migrate.mjs';
import { seed } from '../db/seed.mjs';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT } from '../lib/announcement.ts';
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
  // ผิด 10 ครั้งจาก IP เดียว: ครั้งต่อไปรหัสถูกก็ไม่ผ่าน · IP อื่นยังเข้าได้
  for (let i = 0; i < 10; i++) assert.deepEqual(await login(c, 'admin@example.test', 'wrong', 'ip-b', 14), { error: 'invalid' });
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

  console.log('ผ่าน: ฐานข้อมูล');
} finally {
  c.release();
  await pool.end();
}
