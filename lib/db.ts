import { Pool } from 'pg';

// pool เดียวต่อ process · dev server โหลดโมดูลใหม่บ่อย จึงเก็บไว้ที่ globalThis กันเปิด connection ซ้ำ
// สร้าง Pool ยังไม่ต่อ DB จนกว่าจะ query ครั้งแรก next build จึงไม่ต้องมี DB
const g = globalThis as unknown as { iterraPool?: Pool };
export const db = g.iterraPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') g.iterraPool = db;
