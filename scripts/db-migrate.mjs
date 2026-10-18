// รันไฟล์ใน db/migrations ที่ยังไม่เคยรัน เรียงตามชื่อ: npm run db:migrate
// ไฟล์ละ 1 transaction · ไฟล์ไหนพัง ไฟล์นั้นถอยกลับทั้งไฟล์ แล้วหยุด
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// client ต้องเป็น connection เดียว (pg.Client หรือ pool.connect()) ไม่ใช่ Pool เพราะ begin/commit ต้องอยู่ connection เดียวกัน
export async function migrate(client, dir = new URL('../db/migrations/', import.meta.url)) {
  await client.query('create table if not exists schema_migrations (name text primary key, run_at timestamptz not null default now())');
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const ran = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(new URL(f, dir), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [f]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw new Error(`${f}: ${e.message}`);
    }
    ran.push(f);
  }
  return ran;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ran = await migrate(client);
    console.log(ran.length ? `รันแล้ว: ${ran.join(', ')}` : 'ไม่มี migration ใหม่');
  } finally {
    await client.end();
  }
}
