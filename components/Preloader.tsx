'use client';

// Entry gate: สนามภาพเชิงลึก + เปอร์เซ็นต์จริง + ปุ่ม "เข้าสู่โชว์รูม"
//
// ลูกค้าถามว่าหน้านี้มีไว้ทำไม ซึ่งเป็นคำถามที่ถูก: ของเดิมเป็นเลข 100% โดด ๆ
// บนพื้นเปล่า ไม่ได้ขายอะไร เป็นแค่ประตูที่ต้องกดผ่าน
// (spec 2026-09-01-products-as-motion §2) ตอนนี้เลขลดชั้นเป็นตัวเล็กมุมล่าง
// และของที่เต็มจอคือสินค้าจริงพื้นโปร่ง ซึ่งเป็นทรัพย์สินที่ดีที่สุดของงานนี้
//
// รอบนี้แกลเลอรีแบนถูกแทนด้วย **สนามภาพเชิงลึก** ตาม spec depth-field §4.1:
// กล้องอยู่ "ข้างนอก" สนามแล้วซูมเข้าตามความคืบหน้าการโหลดจริง โหลดครบแล้วกล้อง
// หยุด เลื่อนเมาส์เดินดูสนามได้ ระนาบเป็นสินค้าพื้นโปร่งปนกับรูปห้องจากคลังไลฟ์สไตล์
//
// เปอร์เซ็นต์ผูกกับสถานะโหลดจริง ไม่ใช่ timer ปลอม:
//   readyState interactive 20% · complete 15% · document.fonts.ready 25% · รูปที่ decode แล้ว 40%
// ตัวเลขวิ่งเข้าหาค่าจริงแบบ tween จึงไม่กระตุก แต่ไม่เคยแซงสถานะจริง
// ระนาบที่ n โผล่เมื่อค่านี้ถึง n/total และกล้องซูมตามค่าเดียวกัน — ผูกกับการโหลดจริง
// ไม่ใช่ setTimeout
//
// ห้ามขังผู้ใช้: ปุ่มเข้ากดได้ตั้งแต่วินาทีแรกไม่ว่าโหลดถึงไหน และมี watchdog
// ถ้าค้างเกิน stallMs จะดัน 100% พร้อมเปลี่ยนข้อความบอกว่าข้ามได้
//
// gate ครั้งเดียวต่อ session ผ่าน sessionStorage · prefers-reduced-motion
// = ข้ามอนิเมชันแต่ยังมี gate

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import BrandMark from './BrandMark';
import DepthField, { useFieldMode } from './DepthField';
import { useLang } from './LangProvider';
import type { FieldPlane } from './depth-field';

/**
 * id ของ <script type="application/json"> ที่ app/page.tsx ฝากชุดระนาบไว้
 *
 * เขียนสตริงซ้ำแทนการ import ค่าคงที่จาก components/depth-field.ts โดยตั้งใจ:
 * ไฟล์นั้น import ทั้งแคตตาล็อก (424KB) และคลังไลฟ์สไตล์ ส่วน Preloader อยู่ใน
 * layout จึงอยู่ทุกหน้า — /about กับ /contact ไม่ควรต้องโหลดแคตตาล็อกเพื่อโชว์
 * หน้าโหลด นี่คือเหตุผลเดียวกับที่รุ่นก่อนอ่าน src ออกจาก DOM ของกำแพง
 * และเป็นสัญญาข้าม DOM แบบเดียวกับ selector `[data-wall-panel]` ที่ไฟล์นี้เคยถือ
 */
const SEED_ID = 'depth-field-seed';

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
  const [planes, setPlanes] = useState<FieldPlane[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { t, lang } = useLang();
  // เดสก์ท็อป + ไม่ใช่ reduced-motion เท่านั้นถึงจะได้สนาม 3D (§5 ข้อ 3–4)
  const fieldMode = useFieldMode();

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

  // ── สนาม: อ่านชุดระนาบที่หน้านั้นฝากไว้ใน HTML ──────────────────────────
  //
  // §5 ข้อ 6 บังคับว่ารูปในสนามต้องเป็นไฟล์ที่หน้าอื่นใช้อยู่แล้ว และเป็น variant
  // 700/900 ไม่ใช่ 1400/1800 — คนที่รับประกันข้อนี้คือ components/depth-field.ts
  // ซึ่งประกอบชุดจาก WALL_PANEL_PRODUCTS (ของบนกำแพงที่รออยู่หลังประตูนี้เอง)
  // กับคลังไลฟ์สไตล์ที่ /about และ /articles ใช้อยู่
  //
  // มันมาถึงที่นี่ทาง <script type="application/json"> ไม่ใช่ทาง import:
  // ดูเหตุผลที่ SEED_ID ด้านบน · JSON อยู่ใน HTML ที่ static export ส่งมา
  // จึงอ่านได้ตั้งแต่ก่อน hydrate ไม่ต้องรอเฟรมถัดไปเหมือนตอนอ่านจาก DOM ของกำแพง
  //
  // หน้าที่ไม่มี seed (เช่น /about) จะได้อาร์เรย์ว่างและประตูเหลือแค่ตัวหนังสือ
  // ถูกต้องแล้ว: สนามมีไว้โฆษณาหน้าถัดไป และมีแค่หน้าแรกที่มีของให้โฆษณา
  useEffect(() => {
    if (!gated) return;
    const node = document.getElementById(SEED_ID);
    if (!node?.textContent) return;
    try {
      const parsed: unknown = JSON.parse(node.textContent);
      if (Array.isArray(parsed) && parsed.length) setPlanes(parsed as FieldPlane[]);
    } catch {
      // JSON เสียไม่ควรทำให้ประตูพัง — ปุ่มเข้ายังต้องกดได้ ซึ่งเป็นกติกาข้อแรก
    }
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
      // รูปที่ถือ data-depth-defer ไม่นับ: มันคือฉากหลังของสนามที่หน้าแรกไม่ได้ใช้
      // ประตูจึงต้องเปิดได้โดยไม่ต้องรอมัน และเมื่อมันเริ่มโหลดหลังจากถึง 100%
      // แล้ว ตัวหารก็จะไม่โตขึ้นจนเปอร์เซ็นต์เดินถอยหลัง (ดู deferRooms ใน DepthField)
      const imgs = Array.from(document.images).filter((i) => !i.hasAttribute('data-depth-defer'));
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
        className="fixed inset-0 z-[100] bg-base text-ink"
      >
        {/* สนาม: กล้องอยู่ข้างนอกแล้วซูมเข้าตาม pct จริง (§4.1)
            อยู่ข้างหลังตัวหนังสือทั้งหมด และ pointer-events ถูกปิดในตัว
            component — ปุ่มเข้าต้องกดได้ตั้งแต่วินาทีแรกเสมอ ไม่มีระนาบไหน
            มาบังการกดได้ */}
        {fieldMode && planes.length > 0 && (
          <>
            <DepthField
              planes={planes}
              progress={pct / 100}
              revealByProgress
              // ฉากหลังเข้ามาหลังสินค้าโหลดครบ ไม่ใช่พร้อมกัน — ประตูจึงไม่ได้
              // ถือ ~300KB ของรูปห้องไว้เป็นเงื่อนไขก่อนจะเปิดให้เข้า
              deferRooms
              label={t.gate.fieldLabel}
              className="absolute inset-0"
            />
            {/* scrim: ตัวหนังสือของประตูอยู่ขอบบนกับขอบล่าง ระนาบที่ลอยผ่านตรงนั้น
                ทำให้ micro-caps อ่านไม่ออกเป็นช่วง ๆ ค่าคงที่ของพื้น #E5E5E5
                ทาทับสองขอบจึงรับประกันคอนทราสต์เท่ากับพื้นเปล่า ไม่ขึ้นกับว่า
                ระนาบไหนลอยมาอยู่หลัง (เหตุผลเดียวกับ veil ของกำแพง) */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to bottom, rgba(229,229,229,0.94) 0%, rgba(229,229,229,0.16) 17%, rgba(229,229,229,0.16) 76%, rgba(229,229,229,0.96) 100%)',
              }}
            />
          </>
        )}

        <div className="relative z-10 flex h-full flex-col justify-between gap-6 px-6 py-10 md:px-[8vw] md:py-14">
          <div data-pre-fade className="flex items-baseline justify-between">
            {/* alt="" — ตัวประตูประกาศชื่อตัวเองผ่าน aria-label ของ role="dialog" อยู่แล้ว
                ใส่ alt ซ้ำจะได้ยิน "KOHLER" สองครั้งติดกันตอนโฟกัสเข้ามา
                ที่นี่ใหญ่กว่าเมนูได้ เพราะเป็นจอเปล่าที่มีโลโก้เป็นตัวนำ */}
            <BrandMark height={22} alt="" />
            <span className="micro">{tagline}</span>
          </div>

          {/* มือถือและ reduced-motion: กริดนิ่ง ไม่มีเปอร์สเปกทีฟ ไม่มี transform
              (§5 ข้อ 3–4 — และ "ไม่จำลอง 3D ด้วยการเอียงเครื่อง" คือเหตุผลที่ที่นี่
              ไม่มี deviceorientation อยู่เลย)
              กล่องเลื่อนได้เอง เพราะประตูล็อกการเลื่อนของหน้าไว้ทั้งหน้า และ
              40 ระนาบไม่มีทางลงจอ 390px ได้หมดในหน้าจอเดียว */}
          {!fieldMode && planes.length > 0 && (
            <ul
              data-preloader-gallery
              data-lenis-prevent
              // 4 คอลัมน์ ไม่ใช่ 3: ระนาบห้องถูกแทรกทุก ๆ ชิ้นที่ 3 ในอาร์เรย์
              // (ดู entryPlanes) กริด 3 คอลัมน์จึงดันห้องทั้ง 12 ใบไปเรียงเป็น
              // คอลัมน์ขวาสุดคอลัมน์เดียว — วัดเจอตอนถ่ายที่ 390px
              className="grid min-h-0 flex-1 grid-cols-4 content-start items-center gap-x-4 gap-y-5 overflow-y-auto sm:grid-cols-6"
            >
              {planes.map((plane, i) => {
                // ชิ้นที่ n ปรากฏเมื่อโหลดถึง n/total — ผูกกับ pct ที่มาจาก
                // readyState/fonts/images ไม่ใช่ timer
                // reduced-motion ขึ้นครบทันที: §5 ข้อ 3 สั่ง "กริดนิ่งทันที"
                const revealed = reducedMotion || i < Math.round((pct / 100) * planes.length);
                return (
                  <li
                    key={plane.id}
                    data-gallery-item
                    data-revealed={revealed ? '' : undefined}
                    style={{
                      opacity: revealed ? 1 : 0,
                      transition: reducedMotion ? 'none' : 'opacity 620ms ease-out',
                      transitionDelay: reducedMotion ? '0ms' : `${(i % 4) * 70}ms`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่หน้าอื่นใช้ */}
                    <img
                      src={plane.src}
                      alt={plane.alt[lang]}
                      // ห้องเป็น lazy เสมอและไม่นับในความคืบหน้า เหมือนในสนาม
                      // ที่นี่ lazy ได้ผลจริงด้วย เพราะกริดเป็นกล่องที่เลื่อนได้
                      // ของส่วนใหญ่จึงอยู่นอกจอตั้งแต่แรก
                      loading={plane.kind === 'room' || i >= 9 ? 'lazy' : 'eager'}
                      fetchPriority={plane.kind === 'room' ? 'low' : undefined}
                      data-depth-defer={plane.kind === 'room' ? '' : undefined}
                      decoding="async"
                      className={
                        plane.kind === 'room'
                          ? 'h-[clamp(60px,14vw,120px)] w-full object-cover'
                          : 'mx-auto h-[clamp(60px,14vw,120px)] w-full object-contain'
                      }
                      style={
                        plane.kind === 'room'
                          ? undefined
                          : // เซรามิกขาวบนพื้น #E5E5E5 แทบไม่มีขอบให้ตาจับ
                            // drop-shadow เดินตามอัลฟาของ PNG จึงได้เงาตามรูปทรงจริง
                            { filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.18))' }
                      }
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
      </div>
    </>
  );
}
