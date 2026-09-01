'use client';

// Entry gate: แกลเลอรีสินค้า + เปอร์เซ็นต์จริง + ปุ่ม "เข้าสู่โชว์รูม"
//
// ลูกค้าถามว่าหน้านี้มีไว้ทำไม ซึ่งเป็นคำถามที่ถูก: ของเดิมเป็นเลข 100% โดด ๆ
// บนพื้นเปล่า ไม่ได้ขายอะไร เป็นแค่ประตูที่ต้องกดผ่าน
// (spec 2026-09-01-products-as-motion §2) ตอนนี้เลขลดชั้นเป็นตัวเล็กมุมล่าง
// และของที่เต็มจอคือสินค้าจริงพื้นโปร่ง ซึ่งเป็นทรัพย์สินที่ดีที่สุดของงานนี้
//
// เปอร์เซ็นต์ผูกกับสถานะโหลดจริง ไม่ใช่ timer ปลอม:
//   readyState interactive 20% · complete 15% · document.fonts.ready 25% · รูปที่ decode แล้ว 40%
// ตัวเลขวิ่งเข้าหาค่าจริงแบบ tween จึงไม่กระตุก แต่ไม่เคยแซงสถานะจริง
// สินค้าชิ้นที่ n โผล่เมื่อค่านี้ถึง n/total — ผูกกับการโหลดจริง ไม่ใช่ setTimeout
//
// ห้ามขังผู้ใช้: ปุ่มเข้ากดได้ตั้งแต่วินาทีแรกไม่ว่าโหลดถึงไหน และมี watchdog
// ถ้าค้างเกิน stallMs จะดัน 100% พร้อมเปลี่ยนข้อความบอกว่าข้ามได้
//
// gate ครั้งเดียวต่อ session ผ่าน sessionStorage · prefers-reduced-motion
// = ข้ามอนิเมชันแต่ยังมี gate

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import BrandMark from './BrandMark';

type GalleryItem = { src: string; alt: string };

/**
 * เลื่อนลงทีละชิ้นให้แกลเลอรีดูเหมือนของวางบนโต๊ะ ไม่ใช่ตาราง (§2)
 * ค่าคงที่ ไม่สุ่ม — สุ่มแล้วเลย์เอาต์เปลี่ยนทุกครั้งที่ re-render และ SSR ไม่ตรงกับ client
 */
const NUDGE = [0, 30, 10, 44, 4, 34, 18, 52, 8, 38, 22, 48, 14, 28];

/** ขนาดต่างกันเล็กน้อยด้วยเหตุผลเดียวกัน — ของบนโต๊ะไม่ได้สูงเท่ากันหมด */
const SCALE = [1, 0.86, 0.94, 0.8, 1, 0.88, 0.92, 0.82, 0.96, 0.86, 0.9, 0.84, 0.94, 0.88];

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
  brand = 'KOHLER',
  tagline = 'PREMIUM KITCHEN & BATH',
  enterLabel = 'เข้าสู่โชว์รูม',
  stalledLabel = 'เข้าสู่โชว์รูม — ข้ามการโหลด',
  storageKey = 'kohler:entered',
  stallMs = 6000,
  onEnter,
}: Props) {
  // เริ่มด้วย true ให้ตรงกับ HTML ที่ server ส่งมา แล้วค่อยตัดออกใน effect
  // (สคริปต์ inline ด้านล่างเป็นตัวกัน flash สำหรับคนที่ผ่าน gate มาแล้ว)
  const [gated, setGated] = useState(true);
  const [pct, setPct] = useState(0);
  const [stalled, setStalled] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    // ไม่ต้องเขียน attribute อะไรที่ <html> — sessionStorage เป็นแหล่งความจริงเดียว
    // และ component ก็ unmount ตัวเองอยู่แล้วเมื่อ gated เป็น false
    // (ของเดิมเขียน data-entered ไว้ ซึ่งไม่มีใครอ่านแล้วหลังเลิกใช้ CSS กฎนั้น)
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

  // ── แกลเลอรี: อ่านรูปที่ "หน้าถัดไป" กำลังจะใช้ ออกมาจาก DOM ของหน้านั้นเอง ──
  //
  // AC ข้อ 2 บังคับว่ารูปในแกลเลอรีต้องเป็นชุดที่หน้าถัดไปใช้อยู่แล้ว ไม่งั้นหน้าโหลด
  // กลายเป็นตัวเพิ่มงานโหลด ซึ่งย้อนแย้งในตัวเอง
  //
  // วิธีที่รับประกันได้จริงคืออ่าน src ออกมาจากกำแพงที่เรนเดอร์รออยู่หลังประตูแล้ว
  // (markup ของกำแพงอยู่ใน HTML ที่ static export ส่งมา ไม่ได้รอ JS) URL จึงตรงกัน
  // แบบตัวต่อตัวโดยนิยาม ไม่ใช่โดยข้อตกลงที่อาจเพี้ยนทีหลัง
  //
  // ทางเลือกที่ไม่เอา: import ชุดข้อมูลสินค้ามาคำนวณเอง — Preloader อยู่ใน layout
  // จึงอยู่ทุกหน้า การ import lib/products (424KB) เข้ามาแปลว่า /about กับ /contact
  // ต้องโหลดแคตตาล็อกทั้งก้อนเพื่อโชว์หน้าโหลด ซึ่งย้อนแย้งเหมือนกันแค่คนละทาง
  //
  // หน้าที่ไม่มีกำแพง (เช่น /about) จะได้อาร์เรย์ว่างและประตูกลับไปเป็นแบบเดิม
  // ถูกต้องแล้ว: แกลเลอรีมีไว้โฆษณาหน้าถัดไป และมีแค่หน้าแรกที่มีของให้โฆษณา
  useEffect(() => {
    if (!gated) return;
    let alive = true;

    const read = () => {
      if (!alive) return;
      const found = Array.from(
        document.querySelectorAll<HTMLImageElement>('[data-wall-panel] img[data-panel-front]'),
      );
      const seen = new Set<string>();
      const items: GalleryItem[] = [];
      for (const img of found) {
        const src = img.getAttribute('src');
        if (!src || seen.has(src)) continue;
        seen.add(src);
        items.push({ src, alt: img.getAttribute('alt') ?? '' });
      }
      if (items.length) setGallery(items);
    };

    read();
    // เผื่อจังหวะที่ hydrate ยังไม่วางแผงครบ อ่านซ้ำอีกเฟรมหนึ่ง
    const raf = requestAnimationFrame(read);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [gated]);

  // reduced-motion ใช้ทั้งใน effect และตอน render จึงเก็บเป็น state
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

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
      {/* กัน flash ของ overlay สำหรับคนที่ผ่าน gate มาแล้วใน session นี้
          สคริปต์นี้อยู่ใน HTML ที่ส่งมา จึงรันก่อน React hydrate
          markup ฝั่ง server ไม่มีทางรู้ค่า sessionStorage จึง render overlay มาเสมอ
          แล้วให้สคริปต์นี้ซ่อนทันทีถ้าเคยเข้ามาแล้ว

          มันแทรก <style> เข้าไปใน <head> เอง ไม่ไปแตะ attribute หรือ class ของ
          <html> — สองอย่างนั้นเป็นของ app/layout.tsx ถ้าไปเขียนทับก่อน hydrate
          React จะฟ้อง "tree hydrated but some attributes ... didn't match"
          ทุกครั้งที่โหลดเต็มหน้าในเซสชันที่ผ่านประตูมาแล้ว
          (เจอจริงตอนย้ายมา mount ที่ layout — ตอนอยู่ใต้ page ยังไม่โผล่)
          node ที่สคริปต์สร้างเองไม่ได้อยู่ในต้นไม้ของ React จึงไม่ถูกนำไปเทียบ */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('" +
            storageKey +
            "')==='1'){var s=document.createElement('style');" +
            "s.setAttribute('data-preloader-skip','');" +
            "s.textContent='[data-preloader]{display:none!important}';" +
            'document.head.appendChild(s);}}catch(e){}',
        }}
      />
      <div
        ref={root}
        data-preloader
        role="dialog"
        aria-modal="true"
        aria-label={brand}
        className="fixed inset-0 z-[100] flex flex-col justify-between bg-base px-6 py-10 text-ink md:px-[8vw] md:py-14"
      >
        <div data-pre-fade className="flex items-baseline justify-between">
          {/* alt="" — ตัวประตูประกาศชื่อตัวเองผ่าน aria-label ของ role="dialog" อยู่แล้ว
              ใส่ alt ซ้ำจะได้ยิน "KOHLER" สองครั้งติดกันตอนโฟกัสเข้ามา
              ที่นี่ใหญ่กว่าเมนูได้ เพราะเป็นจอเปล่าที่มีโลโก้เป็นตัวนำ */}
          <BrandMark height={22} alt="" />
          <span className="micro">{tagline}</span>
        </div>

        {/* แกลเลอรี: สินค้าลอยเข้ามาทีละชิ้นตามความคืบหน้าจริง
            ช่องถูกจองไว้ครบตั้งแต่แรกและเปลี่ยนแค่ opacity/transform — ถ้าใช้การ
            เพิ่ม node ทีละใบ เลย์เอาต์จะขยับทุกครั้งที่มีชิ้นใหม่ อ่านเป็นหน้ากระตุก
            ไม่ใช่ของถูกวางลงบนโต๊ะ */}
        {gallery.length > 0 && (
          <ul
            data-preloader-gallery
            className="grid grid-cols-4 items-end gap-x-4 gap-y-3 sm:grid-cols-6 md:gap-x-8 lg:grid-cols-6"
          >
            {gallery.map((item, i) => {
              // ชิ้นที่ n ปรากฏเมื่อโหลดถึง n/total (§2) — ผูกกับ pct ที่มาจาก
              // readyState/fonts/images ไม่ใช่ timer
              const revealed = i < Math.round((pct / 100) * gallery.length);
              return (
                <li
                  key={item.src}
                  data-gallery-item
                  data-revealed={revealed ? '' : undefined}
                  style={{
                    marginTop: NUDGE[i % NUDGE.length],
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'none' : 'translateY(16px) scale(0.96)',
                    // reduced-motion: ขึ้นพร้อมกันหมด ไม่มี stagger ไม่มีลอย (§2)
                    transition: reducedMotion
                      ? 'none'
                      : 'opacity 620ms ease-out, transform 620ms cubic-bezier(0.22,1,0.36,1)',
                    // หน่วงกันเป็นชั้น — จำเป็นตอน pct กระโดดทีเดียวหลายสิบเปอร์เซ็นต์
                    // แล้วหลายชิ้นถูกเปิดพร้อมกัน ถ้าไม่มีค่านี้จะขึ้นพรึบเดียว
                    transitionDelay: reducedMotion ? '0ms' : `${(i % 4) * 70}ms`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่กำแพงใช้ */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    decoding="async"
                    className="mx-auto w-full object-contain"
                    style={{
                      // ขั้นต่ำ 64px: ที่ 390px ช่องกริดกว้างราว 78px ถ้าปล่อยตาม vw
                      // ล้วนจะได้สินค้าสูง 43px ซึ่งอ่านเป็นไอคอน ไม่ใช่ของจริง
                      height: `calc(clamp(64px, 13vw, 148px) * ${SCALE[i % SCALE.length]})`,
                      // เซรามิกขาวบนพื้น #E5E5E5 แทบไม่มีขอบให้ตาจับ เงาอ่อน ๆ ทำให้
                      // ของ "วางอยู่บนโต๊ะ" ไม่ใช่ลอยจมพื้น · drop-shadow เดินตาม
                      // อัลฟาของ PNG จึงได้เงาตามรูปทรงจริง ไม่ใช่กล่องสี่เหลี่ยม
                      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.18))',
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div data-pre-fade className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            {/* ปุ่มมาก่อนเลข: กดได้ตั้งแต่วินาทีแรกเสมอ ไม่ผูกกับ pct เลย
                กติกานี้มีมาตั้งแต่วันแรกของ preloader — ห้ามขังผู้ใช้ */}
            <button
              ref={btn}
              type="button"
              onClick={leave}
              className="group inline-flex items-center gap-4 self-start border border-line-12 px-8 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <span className="micro !text-current">{stalled ? stalledLabel : enterLabel}</span>
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </button>

            {/* เลขเปอร์เซ็นต์ลดชั้นจากพระเอก 22vw มาเป็นตัวเล็กมุมล่าง (§2)
                ยังอยู่เพราะยังบอกสถานะจริง แต่ไม่ใช่สิ่งที่คนเห็นก่อน */}
            <div className="flex items-center gap-3">
              <span
                className="micro tabular-nums"
                aria-live="polite"
                aria-label={`${pct} percent`}
              >
                {String(pct).padStart(2, '0')}%
              </span>
              {/* แถบความคืบหน้า — scaleX เท่านั้น ไม่แตะ width */}
              <span className="block h-px w-40 bg-line-12 md:w-64" aria-hidden>
                <span
                  className="block h-full origin-left bg-accent transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </span>
            </div>
          </div>
          <span className="micro hidden md:block">ESC</span>
        </div>
      </div>
    </>
  );
}
