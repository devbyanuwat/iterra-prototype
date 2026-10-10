'use client';

// ปุ่มลอยมุมขวาล่าง: กลับขึ้นด้านบน (โผล่เมื่อเลื่อนเกิน 300px) อยู่บน · LINE อยู่ล่าง เห็นตลอด
// z-40: อยู่เหนือเนื้อหา ใต้แถบเมนู (z-50) และเมนูมือถือ (z-60) · แผงค้นหากับประกาศเป็น <dialog> อยู่ชั้นบนสุดเอง

import { useEffect, useState } from 'react';
import { useLang } from './LangProvider';
import { scrollToTop } from './SmoothScroll';
import { CONTACT } from '@/lib/site';

const round = 'flex h-12 w-12 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(28,25,23,0.18)] transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.94] motion-reduce:transition-none';

export default function FloatingActions() {
  const { t } = useLang();
  const [far, setFar] = useState(false);

  useEffect(() => {
    const check = () => setFar(window.scrollY > 300);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-3 md:bottom-6 md:right-6">
      {far && (
        <button type="button" onClick={scrollToTop} aria-label={t.float.top} title={t.float.top} className={`${round} border border-warm-300 bg-paper text-ink`}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
      {/* ไอคอนสีเข้มบนเขียว LINE: ขาวบน #06C755 ได้ contrast ราว 2.3:1 ไม่ผ่าน */}
      <a
        href={`https://line.me/R/ti/p/${encodeURIComponent(CONTACT.line)}`}
        target="_blank"
        rel="noopener"
        aria-label={t.float.line}
        title={t.float.line}
        className={`${round} bg-[#06C755] text-ink`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M12 4c-4.7 0-8.5 3.1-8.5 7 0 2.2 1.2 4.1 3.1 5.4L6 20l3.7-1.8c.7.1 1.5.2 2.3.2 4.7 0 8.5-3.1 8.5-7S16.7 4 12 4z" />
        </svg>
      </a>
    </div>
  );
}
