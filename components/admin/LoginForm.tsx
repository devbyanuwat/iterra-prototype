'use client';

// หน้าเข้าสู่ระบบหลังบ้าน · ทับโครงเว็บด้วย fixed overlay แบบเดียวกับหน้าหลังบ้านอื่น
import { useActionState, useEffect, useRef, useState } from 'react';
import { loginAction } from '@/app/admin/login/actions';
import { danger, input, label, solid } from './ui';

export default function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  // React ล้างช่องที่ไม่ผูก state ทุกครั้งหลังส่งฟอร์ม · อีเมลผูก state ไว้จึงค้างอยู่ ล้างแค่รหัสผ่าน แล้วย้ายเคอร์เซอร์ไปช่องรหัสให้กรอกใหม่
  const [email, setEmail] = useState('');
  const pw = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (error) pw.current?.focus();
  }, [error]);
  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-warm-200 p-4 font-normal text-ink"
      style={{ '--glass': 0.85 } as React.CSSProperties}
    >
      <form action={action} onSubmit={() => setShow(false)} className="glass w-full max-w-sm space-y-5 rounded-[28px] p-6">
        <div>
          <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
          <h1 className="mt-1 text-xl font-light">เข้าสู่ระบบหลังบ้าน</h1>
        </div>
        <label className={label}>
          อีเมล
          <input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} mt-2`} />
        </label>
        <div>
          <label htmlFor="admin-password" className={label}>
            รหัสผ่าน
          </label>
          {/* ปุ่มตาอยู่นอก label ไม่ให้ชื่อปุ่มไปปนกับชื่อช่อง · ส่งฟอร์มแล้วกลับเป็นซ่อน */}
          <div className="relative">
            <input
              id="admin-password"
              ref={pw}
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-xl text-stone-600 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="3" />
                {show && <path d="m4 4 16 16" />}
              </svg>
            </button>
          </div>
        </div>
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
