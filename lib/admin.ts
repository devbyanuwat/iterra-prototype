import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { SESSION_COOKIE, sessionUser, sha256 } from './server/auth';

export type Result = { ok: true } | { ok: false; error: string };

// ตรวจ session จริงจาก DB ทุกหน้าและทุก Server Function ของหลังบ้าน (proxy.ts แค่ดูว่ามี cookie)
export const currentAdmin = cache(async () => sessionUser(db, (await cookies()).get(SESSION_COOKIE)?.value));

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login/');
  return admin;
}

// IP มาจาก nginx · ผสม IP_SALT ก่อน hash เพราะ IPv4 มีน้อยพอจะไล่ย้อนกลับได้
// nginx ต้องตั้ง `proxy_set_header X-Real-IP $remote_addr;` และห้ามเปิดพอร์ต Node ตรงสู่ภายนอก ไม่งั้น header นี้ปลอมได้
export async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'local';
  const salt = process.env.IP_SALT;
  if (!salt && process.env.NODE_ENV === 'production') throw new Error('IP_SALT is not set');
  return sha256(`${salt ?? ''}:${ip}`);
}

// ทุก Server Function ของหลังบ้านผ่านตัวนี้: ตรวจ session ก่อนเสมอ แล้วแปล error ที่ผู้ใช้แก้เองได้เป็นข้อความ
// error อื่นโยนต่อ ให้ Next แสดงหน้า error แทนการกลืนเงียบ
export async function adminAction(fn: () => Promise<unknown>): Promise<Result> {
  await requireAdmin();
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === 'InputError') return { ok: false, error: e.message };
    const code = (e as { code?: string }).code;
    if (code === '23503') return { ok: false, error: 'ลบไม่ได้ เพราะยังมีสินค้าใช้อยู่' };
    if (code === '23505') return { ok: false, error: 'มีรายการนี้อยู่แล้ว' };
    throw e;
  }
}
