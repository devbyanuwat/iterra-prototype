'use client';

// แคตตาล็อก: grid ภาพย่อทุกหน้า → กดแล้วเปิดดูเต็มจอ
// ปุ่มก่อน/ถัดไป (ทุกความกว้าง) · คีย์ ← → Esc · ปัดซ้าย/ขวาบนมือถือ · ล็อก scroll ของ Lenis ระหว่างเปิด
// โฟกัส: ย้ายเข้า dialog ตอนเปิด · Tab วนอยู่ใน dialog · คืนโฟกัสให้ปุ่มเดิมตอนปิด

import { useCallback, useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogViewer() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(null); // เลขหน้า 1..49
  const go = useCallback(
    (d: number) => setOpen((n) => (n === null ? n : Math.min(CATALOG.pages, Math.max(1, n + d)))),
    [],
  );

  const isOpen = open !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // ผูกตามแค่ isOpen (ไม่ใช่เลขหน้า) — เปลี่ยนหน้าไม่ต้องถอด/ใส่ล็อกกับ listener ใหม่
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null; // ปุ่มภาพย่อที่กดเปิด
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Tab' && dialogRef.current) {
        // วนโฟกัสใน dialog: ข้ามปุ่มที่ซ่อน (display:none) และปุ่ม disabled
        const f = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
          (el) => el.getClientRects().length > 0,
        );
        const [first, last] = [f[0], f[f.length - 1]];
        const a = document.activeElement;
        if (!first) return;
        if (!a || !f.includes(a as HTMLElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && a === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && a === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [isOpen, go]);

  const touch = useRef({ x: 0, y: 0 });
  const pages = Array.from({ length: CATALOG.pages }, (_, i) => i + 1);

  // ปุ่มก่อน/ถัดไป: ฟังก์ชันคืน JSX (ไม่ใช่ component — กัน remount ทำโฟกัสหลุด) ใช้ซ้ำทั้งแถบล่างมือถือและลูกศรข้างจอ md+
  const arrow = (d: 1 | -1, className: string) => (
    <button
      type="button"
      onClick={() => go(d)}
      disabled={d < 0 ? open === 1 : open === CATALOG.pages}
      aria-label={d < 0 ? t.catalog.prev : t.catalog.next}
      className={`text-3xl font-extralight disabled:opacity-20 ${className}`}
    >
      {d < 0 ? '←' : '→'}
    </button>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {pages.map((n) => (
          <Reveal key={n} delay={(n % 5) * 0.05} y={20}>
            <button type="button" onClick={() => setOpen(n)} className="group block w-full text-left">
              <div className="overflow-hidden bg-warm-100">
                <img
                  src={CATALOG.thumb(n)}
                  alt={`${t.catalog.page} ${n}`}
                  loading="lazy"
                  className="aspect-[1.414/1] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest2 text-warm-500">
                {String(n).padStart(2, '0')}
              </p>
            </button>
          </Reveal>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${t.catalog.page} ${open} ${t.catalog.of} ${CATALOG.pages}`}
          ref={dialogRef}
          data-lenis-prevent
          className="fixed inset-0 z-[70] flex flex-col bg-ink text-paper"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touch.current.x;
            const dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between px-6 py-5 text-[11px] uppercase tracking-widest2">
            <span>
              {t.catalog.page} {open} {t.catalog.of} {CATALOG.pages}
            </span>
            <div className="flex items-center gap-6">
              <a href={CATALOG.pdf} download className="underline-offset-8 hover:underline">
                {t.catalog.download}
              </a>
              <button type="button" ref={closeRef} onClick={() => setOpen(null)} aria-label={t.catalog.close} className="text-2xl font-extralight">
                ×
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 md:px-20">
            <img
              key={open}
              src={CATALOG.page(open)}
              alt={`${t.catalog.page} ${open}`}
              className="max-h-full max-w-full object-contain shadow-2xl shadow-black/50"
            />
            {arrow(-1, 'absolute left-2 top-1/2 hidden -translate-y-1/2 px-4 py-6 md:block')}
            {arrow(1, 'absolute right-2 top-1/2 hidden -translate-y-1/2 px-4 py-6 md:block')}
          </div>
          <div className="flex justify-center gap-10 pb-6 md:hidden">
            {arrow(-1, 'px-6 py-3')}
            {arrow(1, 'px-6 py-3')}
          </div>
        </div>
      )}
    </>
  );
}
