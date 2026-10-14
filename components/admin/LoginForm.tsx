'use client';

// หน้าเข้าสู่ระบบหลังบ้าน · ทับโครงเว็บด้วย fixed overlay แบบเดียวกับหน้าหลังบ้านอื่น
import { useActionState } from 'react';
import { loginAction } from '@/app/admin/login/actions';
import { danger, input, label, solid } from './ui';

export default function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-warm-200 p-4 font-normal text-ink"
      style={{ '--glass': 0.85 } as React.CSSProperties}
    >
      <form action={action} className="glass w-full max-w-sm space-y-5 rounded-[28px] p-6">
        <div>
          <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
          <h1 className="mt-1 text-xl font-light">เข้าสู่ระบบหลังบ้าน</h1>
        </div>
        <label className={label}>
          อีเมล
          <input name="email" type="email" autoComplete="username" required className={`${input} mt-2`} />
        </label>
        <label className={label}>
          รหัสผ่าน
          <input name="password" type="password" autoComplete="current-password" required className={`${input} mt-2`} />
        </label>
        <p role="alert" className={`min-h-5 text-sm ${danger}`}>
          {error}
        </p>
        <button type="submit" disabled={pending} className={`${solid} w-full justify-center`}>
          {pending ? 'กำลังเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
