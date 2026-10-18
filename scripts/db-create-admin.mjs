// สร้างบัญชีผู้ดูแลระบบ หรือรีเซ็ตรหัส: npm run db:admin
// อ่าน ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD จาก env (.env บนเครื่องพัฒนา) ไม่รับรหัสทาง argument กันติดใน shell history
import pg from 'pg';
import { upsertAdmin } from '../lib/server/auth.ts';

const { ADMIN_EMAIL, ADMIN_NAME = '', ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ต้องตั้ง ADMIN_EMAIL และ ADMIN_PASSWORD');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await upsertAdmin(pool, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD);
  console.log(`บันทึกผู้ดูแลระบบ ${ADMIN_EMAIL.trim().toLowerCase()} แล้ว`);
} finally {
  await pool.end();
}
