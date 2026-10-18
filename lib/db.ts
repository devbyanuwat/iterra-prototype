import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import type { PGlite } from '@electric-sql/pglite';

// pool เดียวต่อ process · dev server โหลดโมดูลใหม่บ่อย จึงเก็บไว้ที่ globalThis กันเปิด connection ซ้ำ
// สร้าง Pool ยังไม่ต่อ DB จนกว่าจะ query ครั้งแรก next build จึงไม่ต้องมี DB
// ITERRA_DEMO=1: โหมดนำเสนอ ใช้ PGlite ในหน่วยความจำแทน Postgres (ขึ้น Vercel ได้โดยไม่มี DB) ข้อมูลกลับเป็นค่าเริ่มต้นทุกครั้งที่ process เริ่มใหม่
// บน Vercel ที่ไม่ได้ตั้ง DATABASE_URL ก็เข้าโหมดนำเสนอเอง (ไม่ต้องตั้ง env) · เครื่องจริงที่ลืมตั้ง DATABASE_URL ยัง error ตามเดิม ไม่เปิดบัญชีเดโมเงียบ ๆ
export const DEMO = process.env.ITERRA_DEMO === '1' || (process.env.VERCEL === '1' && !process.env.DATABASE_URL);
// บัญชีหลังบ้านเดโมเมื่อไม่ได้ตั้ง DEMO_ADMIN_*: เก็บแค่ hash ของรหัสสุ่ม รหัสจริงอยู่นอก repo (.env.demo ของผู้ดูแล)
const DEMO_EMAIL = 'demo@iterra.test';
const DEMO_HASH = 'scrypt$1e1efd954fe76dff50cf43bb3b1a7e1d$6a02cf4b248793025282fa99797c4744cf4ef69a33dc4d502e6d30dfedbe0eb779da342cb35029c1b4a000ee8dbc231896964c1ee3d9b36e53959fa816d61745';

type Result = { rows: any[]; rowCount: number | null };

function demoPool(): Pool {
  let ready: Promise<PGlite> | undefined;
  const open = () =>
    (ready ??= (async () => {
      const { PGlite } = await import('@electric-sql/pglite');
      const pg = new PGlite();
      const c = { query: (t: string, v?: unknown[]) => run(pg, t, v) };
      const { seed } = await import('../db/seed.mjs');
      const { upsertAdmin } = await import('./server/auth');
      // DB ใหม่ทุกครั้ง รันทุกไฟล์ตามลำดับชื่อได้เลย ไม่ต้องจด schema_migrations
      const dir = path.join(process.cwd(), 'db/migrations');
      for (const f of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) await pg.exec(await readFile(path.join(dir, f), 'utf8'));
      await seed(c);
      const { DEMO_ADMIN_EMAIL: email, DEMO_ADMIN_PASSWORD: pw } = process.env;
      if (email && pw) await upsertAdmin(c, email, 'ผู้ดูแลเดโม', pw);
      else await c.query('insert into admin_users (email, name, password_hash) values ($1, $2, $3)', [DEMO_EMAIL, 'ผู้ดูแลเดโม', DEMO_HASH]);
      return pg;
    })());
  // PGlite มี connection เดียว: transaction ต้องเข้าคิวทีละอัน
  // ponytail: query นอก transaction ไม่เข้าคิว อาจวิ่งแทรกกลาง transaction ของคนอื่นได้ พอสำหรับเดโมคนใช้คนเดียว
  let queue = Promise.resolve();
  return {
    query: async (t: string, v?: unknown[]) => run(await open(), t, v),
    connect: async () => {
      let release!: () => void;
      const prev = queue;
      queue = new Promise<void>((r) => (release = r));
      await prev;
      const pg = await open();
      return { query: (t: string, v?: unknown[]) => run(pg, t, v), release };
    },
  } as unknown as Pool;
}

// แปลงผลให้หน้าตาเหมือน pg · ไม่มีพารามิเตอร์ใช้ exec เพราะ migration มีหลายคำสั่งในไฟล์เดียว
async function run(pg: PGlite, text: string, values?: unknown[]): Promise<Result> {
  const r = values?.length ? await pg.query(text, values) : (await pg.exec(text)).at(-1);
  return { rows: r?.rows ?? [], rowCount: r ? r.affectedRows || r.rows.length : 0 };
}

const g = globalThis as unknown as { iterraPool?: Pool };
export const db = g.iterraPool ?? (DEMO ? demoPool() : new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }));
// โหมดนำเสนอต้องเก็บเสมอ: route handler ถูก bundle แยกจากหน้า ถ้าไม่แชร์จะได้ PGlite คนละก้อน ข้อมูลไม่ตรงกัน
if (DEMO || process.env.NODE_ENV !== 'production') g.iterraPool = db;
