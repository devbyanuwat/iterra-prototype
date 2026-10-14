// รหัสผ่าน session และการกันเดารหัส
// import ได้แค่ node: กับ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
export type Admin = { id: number; email: string; name: string };

export const SESSION_COOKIE = 'iterra_session';
const MAX_ATTEMPTS = 10;
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
  await db.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), u.rows[0].id, expires]);
  return { token, expires };
}

export async function sessionUser(db: Db, token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const r = await db.query(
    `select u.id::int as id, u.email, u.name
       from sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null`,
    [sha256(token)],
  );
  return r.rows[0] ?? null;
}

export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (token) await db.query('delete from sessions where token_hash = $1', [sha256(token)]);
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
