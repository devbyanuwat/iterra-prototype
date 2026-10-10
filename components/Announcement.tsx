'use client';

// ประกาศตอนเข้าเว็บ: เปิดราว 1 วินาทีหลังหน้าแรกของรอบนั้นโหลด ครั้งเดียวต่อการเปิดแท็บ (sessionStorage)
// อยู่ใน layout จึง mount ครั้งเดียวต่อการโหลดเว็บ ไม่เด้งซ้ำตอนเปลี่ยนหน้า

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import { ANNOUNCEMENT as A, markSeen, shouldShow } from '@/lib/announcement';

// การอ่าน window.sessionStorage เองก็โยน error ได้เมื่อเบราว์เซอร์บล็อกข้อมูลไซต์
const store = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export default function Announcement() {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!shouldShow(A, store())) return;
    const timer = setTimeout(() => {
      // มี dialog อื่นเปิดอยู่ (กำลังค้นหา): ไม่เด้งทับ รอบนี้ข้ามไป
      if (document.querySelector('dialog[open]')) return;
      ref.current?.showModal();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      aria-labelledby="announcement-title"
      onClose={() => markSeen(A.id, store())}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="w-[min(92vw,440px)] bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="relative">
        <img src={A.image} alt="" className="aspect-[16/9] w-full object-cover" />
        <button type="button" onClick={close} aria-label={t.announce.close} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center bg-paper text-2xl font-extralight text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
          ×
        </button>
      </div>
      <div className="p-6">
        <h2 id="announcement-title" className="text-xl font-light tracking-wide">{A.title[lang]}</h2>
        <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{A.body[lang]}</p>
        <Link href={A.cta.href} onClick={close} className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-[11px] font-normal uppercase tracking-widest2 text-paper hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink">
          {A.cta.label[lang]}
        </Link>
      </div>
    </dialog>
  );
}
