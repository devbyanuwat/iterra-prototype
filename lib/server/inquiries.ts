// ข้อความจากฟอร์มติดต่อ: รับจากหน้าเว็บ (ไม่ต้องเข้าสู่ระบบ) และอ่านในหลังบ้าน
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// ยังไม่ส่งอีเมล (SMTP ทำรอบถัดไป) emailed_at จึงเป็น null · ไม่มีอะไรลบแถวในตารางนี้ รอฝ่ายกฎหมายกำหนดระยะเก็บ
// ก่อนฟอร์มเก็บข้อมูลจริงบน production นโยบายความเป็นส่วนตัวต้องผ่านการตรวจทางกฎหมาย (docs/pm/standards.md หมวด 3)

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

// ทุกช่องมาจากเบราว์เซอร์ จึงเป็น unknown จนกว่าจะตรวจ
export type InquiryInput = { name: unknown; email: unknown; message: unknown; website?: unknown };
// หน้าเว็บแปลรหัสเป็นข้อความไทยหรืออังกฤษเอง (t.contact.errors ใน lib/i18n.ts)
export type InquiryError = 'name' | 'email' | 'message' | 'chars' | 'limit';
export type AdminInquiry = { id: number; name: string; email: string; message: string; created: string; handled: boolean };

const LIMIT = 3;
const WINDOW_MIN = 10;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// ช่องเดิมบนหน้าเว็บคือ "อีเมลหรือเบอร์โทร" จึงรับเบอร์โทรด้วย: ตัวเลข 9 ถึง 15 หลัก คั่นด้วยช่องว่างหรือ - ได้ ขึ้นต้น + ได้
const PHONE = /^\+?[0-9][0-9 -]{7,20}$/;
const digits = (s: string) => s.replace(/\D/g, '').length;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// คืน null = รับแล้ว (หรือเป็นบอทที่ตอบเหมือนรับ) · คืนรหัส = ไม่เก็บ
export async function submitInquiry(db: Db, input: InquiryInput, ipHash: string): Promise<InquiryError | null> {
  // เรียกมือด้วยค่าว่างหรือไม่ใช่ object: ตอบเป็นข้อมูลผิด ไม่ใช่ error ของ server
  if (!input || typeof input !== 'object') return 'name';
  // บอทกรอกช่องที่คนมองไม่เห็น: ตอบเหมือนสำเร็จ ไม่บอกว่าโดนจับ และไม่เก็บ
  if (str(input.website)) return null;
  const name = str(input.name);
  const email = str(input.email);
  const message = str(input.message);
  if (/[<>]/.test(name + email + message)) return 'chars';
  if (!name || name.length > 100) return 'name';
  const phone = PHONE.test(email) && digits(email) >= 9 && digits(email) <= 15;
  if (email.length > 200 || !(EMAIL.test(email) || phone)) return 'email';
  if (!message || message.length > 2000) return 'message';
  // ล็อกรายค่า ip hash ให้คำขอที่มาพร้อมกันจาก IP เดียวต่อคิวกัน การนับจึงเชื่อถือได้
  // ล็อกนี้ใช้ได้เฉพาะใน transaction (ปล่อยเมื่อ commit) ตัว action เรียกผ่าน inTx
  await db.query('select pg_advisory_xact_lock(hashtext($1))', [ipHash]);
  const n = await db.query(
    'select count(*)::int as n from inquiries where ip_hash = $1 and created_at > now() - make_interval(mins => $2)',
    [ipHash, WINDOW_MIN],
  );
  if (n.rows[0].n >= LIMIT) return 'limit';
  await db.query('insert into inquiries (name, email, message, ip_hash) values ($1, $2, $3, $4)', [name, email, message, ipHash]);
  return null;
}

// ponytail: โหลดทุกข้อความในครั้งเดียว พอสำหรับหลักร้อย ถ้าเกินหลักพันค่อยแบ่งหน้า
export async function listInquiries(db: Db): Promise<AdminInquiry[]> {
  const r = await db.query(
    `select id::int as id, name, email, message, handled_at is not null as handled,
            to_char(created_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') as created
       from inquiries order by created_at desc, id desc`,
  );
  return r.rows;
}

// ทำซ้ำได้ เวลาที่จัดการครั้งแรกไม่เปลี่ยน
export async function markHandled(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบข้อความนี้');
  const r = await db.query('update inquiries set handled_at = coalesce(handled_at, now()) where id = $1', [id]);
  if (r.rowCount === 0) throw new InputError('ไม่พบข้อความนี้');
}
