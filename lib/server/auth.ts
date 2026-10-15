// รหัสผ่าน session และการกันเดารหัส
// import ได้แค่ node: กับ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
export type Admin = { id: number; email: string; name: string };

export const SESSION_COOKIE = 'iterra_session';
const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;

const scryptAsync = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((ok, fail) => scrypt(pw, salt, len, (e, key) => (e ? fail(e) : ok(key))));

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// เก็บเป็น scrypt$<salt hex>$<hash hex>
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scryptAsync(pw, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'hex');
  if (want.length !== 64) return false;
  const got = await scryptAsync(pw, Buffer.from(salt, 'hex'), want.length);
  return timingSafeEqual(got, want);
}

// ไม่มีอีเมลนี้ก็ยังคำนวณ scrypt หนึ่งรอบ เวลาตอบจะได้ไม่บอกว่าอีเมลไหนมีจริง
const NOBODY = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export async function login(
  db: Db,
  email: string,
  password: string,
  ipHash: string,
  days: number,
): Promise<{ token: string; expires: Date } | { error: 'locked' | 'invalid' }> {
  const tries = await db.query(
    'select count(*)::int as n from login_attempts where ip_hash = $1 and at > now() - make_interval(mins => $2)',
    [ipHash, WINDOW_MIN],
  );
  if (tries.rows[0].n >= MAX_ATTEMPTS) return { error: 'locked' };
  const u = await db.query('select id, password_hash from admin_users where email = $1 and disabled_at is null', [
    email.trim().toLowerCase(),
  ]);
  const ok = await verifyPassword(password, u.rows[0]?.password_hash ?? NOBODY);
  if (!ok || !u.rows[0]) {
    await db.query('insert into login_attempts (ip_hash) values ($1)', [ipHash]);
    return { error: 'invalid' };
  }
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + days * 86_400_000);
  // สร้าง session กับ audit login ในคำสั่งเดียว
  await db.query(
    `with s as (insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3) returning user_id)
     insert into audit_log (user_id, action, entity, entity_id) select user_id, 'login', 'admin_user', user_id::text from s`,
    [sha256(token), u.rows[0].id, expires],
  );
  return { token, expires };
}

// ไม่ได้ใช้เกิน idleMin นาที = ใช้ไม่ได้ (spec หัวข้อ 11.3) · อายุสูงสุดยังเป็น expires_at
// เขียน last_seen_at ไม่เกินทุก 5 นาที ไม่ให้ทุกการกดเขียน DB
export async function sessionUser(db: Db, token: string | undefined, idleMin = 120): Promise<Admin | null> {
  if (!token) return null;
  const hash = sha256(token);
  const r = await db.query(
    `select u.id::int as id, u.email, u.name, s.last_seen_at < now() - interval '5 minutes' as stale
       from sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null
        and s.last_seen_at > now() - make_interval(mins => $2)`,
    [hash, idleMin],
  );
  const row = r.rows[0];
  if (!row) return null;
  if (row.stale) await db.query('update sessions set last_seen_at = now() where token_hash = $1', [hash]);
  return { id: row.id, email: row.email, name: row.name };
}

// ลบ session กับเขียน audit logout ในคำสั่งเดียว · token ที่ไม่มีจริงไม่เขียนอะไร
export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.query(
    `with d as (delete from sessions where token_hash = $1 returning user_id)
     insert into audit_log (user_id, action, entity, entity_id) select user_id, 'logout', 'admin_user', user_id::text from d`,
    [sha256(token)],
  );
}

// ปิดบัญชี (พนักงานลาออก): ตั้ง disabled_at ลบ session ทั้งหมด และเขียน audit ในคำสั่งเดียว
// คืน id ของบัญชีที่ปิด · ไม่พบบัญชีที่ยังใช้งานอยู่ = null · เปิดใหม่ด้วย upsertAdmin (npm run db:admin)
export async function disableAdmin(db: Db, email: string): Promise<number | null> {
  const r = await db.query(
    `with u as (update admin_users set disabled_at = now() where email = $1 and disabled_at is null returning id),
          s as (delete from sessions where user_id in (select id from u)),
          a as (insert into audit_log (action, entity, entity_id, detail)
                select 'disable', 'admin_user', id::text, jsonb_build_object('email', $1::text) from u)
     select id::int as id from u`,
    [email.trim().toLowerCase()],
  );
  return r.rows[0]?.id ?? null;
}

// สร้างบัญชีใหม่ หรือรีเซ็ตรหัสบัญชีเดิม · รีเซ็ตแล้วตัด session เก่าทั้งหมดของบัญชีนั้น
export async function upsertAdmin(db: Db, email: string, name: string, password: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(e)) throw new Error('อีเมลไม่ถูกต้อง');
  if (password.length < 12) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 12 ตัว');
  const r = await db.query(
    `insert into admin_users (email, name, password_hash) values ($1, $2, $3)
     on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, disabled_at = null
     returning id`,
    [e, name.trim() || e, await hashPassword(password)],
  );
  await db.query('delete from sessions where user_id = $1', [r.rows[0].id]);
}
