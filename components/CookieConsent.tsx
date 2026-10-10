'use client';

// แถบคุกกี้ (มุมซ้ายล่าง เต็มความกว้างบนมือถือ) + หน้าต่างตั้งค่า 3 หมวด + ตัวนับสถิติของ Vercel
// ตัวนับสถิติโหลดเฉพาะเมื่อผู้ใช้เปิดหมวดสถิติ · ยังไม่เลือกหรือปฏิเสธ = ไม่โหลด
// เปิดหน้าต่างตั้งค่าจากที่อื่น (ลิงก์ท้ายเว็บ): window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { useLang } from './LangProvider';
import { ALL, NONE, readConsent, writeConsent, type Consent } from '@/lib/consent';

export const OPEN_COOKIE_SETTINGS = 'cookie-settings';

// การอ่าน window.localStorage เองก็โยน error ได้เมื่อเบราว์เซอร์บล็อกข้อมูลไซต์
const store = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const btn = 'min-h-11 border px-4 text-[11px] font-normal uppercase tracking-widest2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';
const solid = `${btn} border-ink bg-ink text-paper hover:bg-paper hover:text-ink`;
const plain = `${btn} border-ink bg-paper text-ink hover:bg-ink hover:text-paper`;

export default function CookieConsent() {
  const { t } = useLang();
  const c = t.cookie;
  // undefined = ยังไม่ได้อ่านจากเบราว์เซอร์ (ไม่แสดงอะไร กันแถบกะพริบ) · null = ยังไม่เคยเลือก
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [draft, setDraft] = useState<Consent>(NONE);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setConsent(readConsent(store()));
  }, []);

  useEffect(() => {
    const open = () => {
      setDraft(readConsent(store()) ?? NONE);
      if (!dialog.current?.open) dialog.current?.showModal();
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
  }, []);

  const choose = (next: Consent) => {
    writeConsent(next, store());
    dialog.current?.close();
    // ถอนความยินยอมเรื่องสถิติ: สคริปต์ที่โหลดไปแล้วถอดไม่ได้ จึงโหลดหน้าใหม่ให้หยุดนับจริง
    if (consent?.analytics && !next.analytics) window.location.reload();
    else setConsent(next);
  };
  const openSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));

  const rows = [
    { key: 'analytics', name: c.analytics, note: c.analyticsNote },
    { key: 'marketing', name: c.marketing, note: c.marketingNote },
  ] as const;

  return (
    <>
      {consent?.analytics && <Analytics />}

      {consent === null && (
        <section aria-label={c.title} className="fixed inset-x-0 bottom-0 z-[45] border-t border-warm-300 bg-paper p-5 text-ink shadow-[0_-6px_24px_rgba(28,25,23,0.12)] md:inset-x-auto md:bottom-6 md:left-6 md:max-w-sm md:border">
          <h2 className="text-sm font-normal tracking-wide">{c.title}</h2>
          <p className="mt-2 text-[13px] font-light leading-relaxed text-stone-600">
            {c.body}{' '}
            <Link href="/privacy/" className="underline underline-offset-4 hover:text-ink">
              {c.policy}
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose(NONE)} className={plain}>
              {c.reject}
            </button>
            <button type="button" onClick={() => choose(ALL)} className={solid}>
              {c.accept}
            </button>
            <button type="button" onClick={openSettings} className="col-span-2 min-h-11 text-[11px] font-normal uppercase tracking-widest2 underline underline-offset-4 hover:text-warm-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
              {c.settings}
            </button>
          </div>
        </section>
      )}

      <dialog
        ref={dialog}
        data-lenis-prevent
        aria-labelledby="cookie-settings-title"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="w-[min(92vw,480px)] bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="cookie-settings-title" className="text-xl font-light tracking-wide">
              {c.settings}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={c.close} className="-mr-3 -mt-3 flex h-11 w-11 items-center justify-center text-2xl font-extralight focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
              ×
            </button>
          </div>
          <ul className="mt-4 divide-y divide-warm-200 border-y border-warm-200">
            <li className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-normal">{c.necessary}</p>
                <p className="mt-1 text-[13px] font-light leading-relaxed text-stone-600">{c.necessaryNote}</p>
              </div>
              <span className="shrink-0 pt-0.5 text-[11px] font-normal uppercase tracking-widest2 text-stone-600">{c.always}</span>
            </li>
            {rows.map((r) => (
              <li key={r.key}>
                <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4 py-4">
                  <span>
                    <span className="block text-sm font-normal">{r.name}</span>
                    <span className="mt-1 block text-[13px] font-light leading-relaxed text-stone-600">{r.note}</span>
                  </span>
                  <input type="checkbox" checked={draft[r.key]} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-ink" />
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose(draft)} className={plain}>
              {c.save}
            </button>
            <button type="button" onClick={() => choose(ALL)} className={solid}>
              {c.accept}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
