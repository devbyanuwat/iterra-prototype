// ปิดบัญชีผู้ดูแลระบบ (พนักงานลาออก): ADMIN_EMAIL=someone@example.com npm run db:disable-admin
// อ่าน ADMIN_EMAIL จาก env แบบเดียวกับ db:admin · ตั้ง disabled_at ลบ session ทั้งหมด และเขียน audit ในคำสั่งเดียว
// .env บนเครื่องพัฒนามี ADMIN_EMAIL ของบัญชีพัฒนา จึงต้องใส่ ADMIN_EMAIL=... นำหน้าคำสั่งทุกครั้ง (env มาก่อนไฟล์ .env)
// เปิดใช้ใหม่: npm run db:admin ด้วยอีเมลเดิมและรหัสใหม่
import pg from 'pg';
import { disableAdmin } from '../lib/server/auth.ts';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error('ต้องตั้ง ADMIN_EMAIL');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const id = await disableAdmin(pool, email);
  if (id === null) {
    console.error(`ไม่พบบัญชีที่ใช้งานอยู่: ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`ปิดบัญชี ${email} แล้ว ตัด session ทั้งหมดแล้ว`);
  }
} finally {
  await pool.end();
}
