'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ipHash } from '@/lib/admin';
import { SESSION_COOKIE, login, logout } from '@/lib/server/auth';

// ล็อกเพราะผิดเกินจำนวน ตอบข้อความเดียวกับรหัสผิด ไม่บอกผู้เดาว่าโดนล็อก
export async function loginAction(_prev: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  if (!email.trim() || !password) return 'กรุณากรอกอีเมลและรหัสผ่าน';
  const r = await login(db, email, password, await ipHash(), Number(process.env.SESSION_DAYS) || 14);
  if ('error' in r) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  (await cookies()).set(SESSION_COOKIE, r.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: r.expires,
  });
  redirect('/admin/products/');
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  await logout(db, jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect('/admin/login/');
}
