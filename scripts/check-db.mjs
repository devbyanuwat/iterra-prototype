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

  console.log('ผ่าน: ฐานข้อมูล');
} finally {
  c.release();
  await pool.end();
}
