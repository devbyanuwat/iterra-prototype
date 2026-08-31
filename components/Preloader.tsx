'use client';

// Entry gate: โลโก้ + เปอร์เซ็นต์จริง + ปุ่ม "เข้าสู่โชว์รูม"
//
// เปอร์เซ็นต์ผูกกับสถานะโหลดจริง ไม่ใช่ timer ปลอม:
//   readyState interactive 20% · complete 15% · document.fonts.ready 25% · รูปที่ decode แล้ว 40%
// ตัวเลขวิ่งเข้าหาค่าจริงแบบ tween จึงไม่กระตุก แต่ไม่เคยแซงสถานะจริง
//
// ห้ามขังผู้ใช้: ปุ่มเข้ากดได้ตั้งแต่วินาทีแรกไม่ว่าโหลดถึงไหน และมี watchdog
// ถ้าค้างเกิน stallMs จะดัน 100% พร้อมเปลี่ยนข้อความบอกว่าข้ามได้
//
// gate ครั้งเดียวต่อ session ผ่าน sessionStorage · prefers-reduced-motion
// = ข้ามอนิเมชันแต่ยังมี gate

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

type Props = {
  brand?: string;
  tagline?: string;
  enterLabel?: string;
  /** ข้อความเมื่อ watchdog ตัดสินว่าโหลดค้าง */
  stalledLabel?: string;
  storageKey?: string;
  /** โหลดค้างเกินกี่ ms ถึงจะดัน 100% (ปุ่มกดได้อยู่แล้วตั้งแต่ต้น) */
  stallMs?: number;
  onEnter?: () => void;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export default function Preloader({
  brand = 'ITERRA',
  tagline = 'PREMIUM KITCHEN & BATH',
  enterLabel = 'เข้าสู่โชว์รูม',
  stalledLabel = 'เข้าสู่โชว์รูม — ข้ามการโหลด',
  storageKey = 'iterra:entered',
  stallMs = 6000,
  onEnter,
}: Props) {
  // เริ่มด้วย true ให้ตรงกับ HTML ที่ server ส่งมา แล้วค่อยตัดออกใน effect
  // (สคริปต์ inline ด้านล่างเป็นตัวกัน flash สำหรับคนที่ผ่าน gate มาแล้ว)
  const [gated, setGated] = useState(true);
  const [pct, setPct] = useState(0);
  const [stalled, setStalled] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const exiting = useRef(false);

  const leave = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // sessionStorage อาจถูกปิด (private mode / เข้ม cookie) — gate แค่ไม่จำ ไม่ควรพัง
    }
    document.documentElement.setAttribute('data-iterra-entered', '1');

    const done = () => {
      setGated(false);
      onEnter?.();
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !root.current) {
      done();
      return;
    }
    gsap.to(root.current, {
      opacity: 0,
      duration: 0.55,
      ease: 'power2.inOut',
      onComplete: done,
    });
  }, [onEnter, storageKey]);

  // ── ผ่าน gate มาแล้วใน session นี้หรือยัง ──
  useEffect(() => {
    let already = false;
    try {
      already = sessionStorage.getItem(storageKey) === '1';
    } catch {
      already = false;
    }
    if (already) {
      exiting.current = true;
      setGated(false);
    }
  }, [storageKey]);

  // ── ล็อกการเลื่อนหน้าจอระหว่างที่ยังไม่ผ่าน gate ──
  useEffect(() => {
    if (!gated) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [gated]);

  // ── ความคืบหน้าจริง ──
  useEffect(() => {
    if (!gated) return;

    let fontsReady = false;
    let alive = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.fonts?.ready.then(() => {
      fontsReady = true;
    });

    const real = () => {
      let p = 0;
      if (document.readyState !== 'loading') p += 0.2;
      if (document.readyState === 'complete') p += 0.15;
      if (fontsReady) p += 0.25;
      const imgs = Array.from(document.images);
      const decoded = imgs.filter((i) => i.complete).length;
      p += 0.4 * (imgs.length ? decoded / imgs.length : 1);
      return clamp01(p);
    };

    // proxy ให้ gsap tween ตัวเลขเข้าหาค่าจริง — ค่าที่แสดงจึงไม่กระโดด
    // แต่เพดานคือค่าจริงเสมอ ไม่มีการเดินหน้าไปเองแบบ timer ปลอม
    const proxy = { v: 0 };
    let target = 0;
    const tick = () => {
      if (!alive) return;
      target = Math.max(target, real());
      if (reduced) {
        proxy.v = target;
        setPct(Math.round(target * 100));
      } else {
        gsap.to(proxy, {
          v: target,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: true,
          onUpdate: () => setPct(Math.round(proxy.v * 100)),
        });
      }
    };

    tick();
    const poll = window.setInterval(tick, 180);
    window.addEventListener('load', tick);

    // watchdog: โหลดค้าง = ยังเข้าได้ ไม่ขังไว้
    const watchdog = window.setTimeout(() => {
      if (!alive || target >= 1) return;
      setStalled(true);
      target = 1;
      if (reduced) {
        setPct(100);
      } else {
        gsap.to(proxy, {
          v: 1,
          duration: 0.5,
          overwrite: true,
          onUpdate: () => setPct(Math.round(proxy.v * 100)),
        });
      }
    }, stallMs);

    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearTimeout(watchdog);
      window.removeEventListener('load', tick);
      gsap.killTweensOf(proxy);
    };
  }, [gated, stallMs]);

  // ── intro + โฟกัสไปที่ปุ่ม (ปุ่มเดียวที่ focus ได้ = trap ในตัว) ──
  useEffect(() => {
    if (!gated) return;
    btn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave();
      // กัน Tab หลุดออกไปหาเนื้อหาที่ยังถูกบังอยู่
      if (e.key === 'Tab') {
        e.preventDefault();
        btn.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current;
      if (!el) return;
      gsap.from(el.querySelectorAll('[data-pre-fade]'), {
        opacity: 0,
        y: 18,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
      });
    });

    return () => {
      window.removeEventListener('keydown', onKey);
      mm.revert();
    };
  }, [gated, leave]);

  if (!gated) return null;

  return (
    <>
      {/* กัน flash ของ overlay สำหรับคนที่ผ่าน gate มาแล้วใน session นี้:
          สคริปต์อยู่ใน HTML ที่ export ออกมา จึงรันก่อน React hydrate
          ต้องเขียนเป็น data-attribute ไม่ใช่ className — className ของ <html>
          เป็นของ app/layout.tsx (ตัวแปรฟอนต์) ถ้าไปเติมคลาสก่อน hydrate
          React จะฟ้อง hydration mismatch ส่วน attribute ที่ React ไม่ได้ render
          จะไม่ถูกนำมาเทียบ */}
      <style
        dangerouslySetInnerHTML={{
          __html: '[data-iterra-entered] [data-preloader]{display:none!important}',
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('" +
            storageKey +
            "')==='1')document.documentElement.setAttribute('data-iterra-entered','1')}catch(e){}",
        }}
      />
      <div
        ref={root}
        data-preloader
        role="dialog"
        aria-modal="true"
        aria-label={brand}
        className="fixed inset-0 z-[100] flex flex-col justify-between bg-base px-6 py-10 text-cream md:px-[8vw] md:py-14"
      >
        <div data-pre-fade className="flex items-baseline justify-between">
          <span className="font-display text-lg font-medium tracking-[0.3em]">{brand}</span>
          <span className="micro">{tagline}</span>
        </div>

        <div className="flex flex-col items-start gap-8">
          <p
            data-pre-fade
            className="font-display text-[22vw] font-extralight leading-[0.8] tabular-nums text-cream md:text-[14vw]"
            style={{ fontVariationSettings: '"wdth" 80' }}
            aria-live="polite"
            aria-label={`${pct} percent`}
          >
            {String(pct).padStart(2, '0')}
            <span className="text-accent">%</span>
          </p>

          {/* แถบความคืบหน้า — scaleX เท่านั้น ไม่แตะ width */}
          <div data-pre-fade className="h-px w-full max-w-lg bg-line-12" aria-hidden>
            <div
              className="h-full origin-left bg-accent transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          </div>
        </div>

        <div data-pre-fade className="flex items-end justify-between gap-6">
          <button
            ref={btn}
            type="button"
            onClick={leave}
            className="group inline-flex items-center gap-4 border border-line-12 px-8 py-4 text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">{stalled ? stalledLabel : enterLabel}</span>
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>
          <span className="micro hidden md:block">ESC</span>
        </div>
      </div>
    </>
  );
}
