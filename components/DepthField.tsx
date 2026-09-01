'use client';

// สนามภาพเชิงลึกด้วย CSS 3D (spec 2026-09-01-kohler-depth-field §3)
//
// ของ michaelgatt.com เป็น WebGL2 + three.js: canvas เดียว `<img>` ศูนย์ตัว
// แปลว่าไม่มี alt · ไม่มี lazy load · crawler มองไม่เห็นสักรูป · ไม่มี DOM ให้โฟกัสเกาะ
// เว็บเขาเป็นพอร์ตโฟลิโอนักแต่งเพลง ไม่มีใครค้นหารูปในนั้น เว็บเราเป็นแคตตาล็อก
// สินค้า 182 ชิ้นที่ต้องถูกค้นเจอและใช้คีย์บอร์ดได้ (§3)
//
// จึงใช้ `perspective` บนกล่องนอก + `transform-style: preserve-3d` บนกล้อง +
// `translate3d` ต่อระนาบ ทุกระนาบเป็น `<img>` จริงที่มี alt ตามภาษา
// ทั้งหมดทำด้วย GSAP ที่เป็น dependency อยู่แล้ว ไม่มีแพ็กเกจใหม่
//
// ── เลขที่ทำให้เลย์เอาต์นี้ทำงาน ─────────────────────────────────────────────
// ระนาบที่ z ถูกเปอร์สเปกทีฟย่อด้วยอัตรา P/(P−z) เสมอ ถ้าสั่งความกว้างเป็น px ตรง ๆ
// "ขนาดที่ตาเห็น" จะกลายเป็นผลพลอยได้ของ z ไม่ใช่ค่าที่เราออกแบบ
// ทุกค่าจึงถูกคูณด้วย k = (P−z)/P ก่อน แล้วเปอร์สเปกทีฟก็หารกลับพอดี
// ผลพลอยได้ที่สำคัญ: **ตำแหน่งที่ตาเห็นไม่ขึ้นกับ z เลย** (fx·k · 1/k = fx)
// การเปลี่ยน z ตอน hover จึงขยายระนาบ "อยู่กับที่" ไม่เลื่อนหนีเคอร์เซอร์
// — ถ้าเลื่อน จะได้ลูป hover→หนี→unhover→กลับมา ซึ่งเป็นบั๊กคลาสสิกของท่านี้
//
// ── ข้อบังคับจาก §5 ที่ห้ามละเมิด ────────────────────────────────────────────
//   2. โฟกัสไล่ตาม "ลำดับตรรกะ" (ลำดับใน DOM = ลำดับแคตตาล็อก) ไม่ใช่ตำแหน่ง 3D
//      ระนาบที่โฟกัสถูกดึงเข้าหากล้อง และวงแหวนต้องอยู่บนสุด
//      บทเรียนจาก 0581815: `inset` box-shadow วาดใต้ลูก absolute ทุกตัว
//      จึงใช้ [data-focus-ring] ซึ่งเป็น "ลูกคนสุดท้ายที่ z-index สูงกว่ารูป"
//   3. prefers-reduced-motion → กริดนิ่ง (ผู้เรียกเช็คด้วย useFieldMode ก่อนเรียก
//      component นี้ — ที่นี่ไม่มีเส้นทางที่จะเรนเดอร์ transform ค้างกลางทาง)
//   4. มือถือ → กริดเลื่อนแนวตั้ง ไม่จำลอง 3D ด้วยการเอียงเครื่อง (เงื่อนไขเดียวกัน)
//   5. transform/opacity เท่านั้น · will-change เฉพาะกล้องซึ่งเป็นตัวเดียวที่ขยับ
//      · หยุดทุกอย่างเมื่อสนามพ้น viewport

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useLang } from './LangProvider';
import type { FieldPlane } from './depth-field';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DESKTOP = '(min-width: 768px)';
const NO_REDUCE = '(prefers-reduced-motion: no-preference)';

/**
 * สนาม 3D ทำงานเมื่อ "มีเมาส์ให้เลื่อน และผู้ใช้ไม่ได้ขอให้หยุดขยับ" เท่านั้น (§5 ข้อ 3–4)
 *
 * คืน false เสมอในรอบเรนเดอร์แรกทั้งฝั่ง server และ client แล้วค่อยยกระดับใน
 * layout effect ซึ่งรันก่อนเบราว์เซอร์วาด — HTML ที่ static export ส่งมาจึงเป็น
 * กริดนิ่งเสมอ ตรงกับที่ hydrate และไม่มีเฟรมไหนที่ผู้ใช้ reduced-motion
 * ได้เห็น transform (AC ข้อ 4) ส่วนเดสก์ท็อปก็ไม่เห็นกริดกระพริบก่อนสนามขึ้น
 */
export function useFieldMode(): boolean {
  const [ok, setOk] = useState(false);
  useIsoLayoutEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const noReduce = window.matchMedia(NO_REDUCE);
    const sync = () => setOk(desktop.matches && noReduce.matches);
    sync();
    // ฟังการเปลี่ยนแปลงด้วย: ย่อหน้าต่างข้าม breakpoint หรือเปิด reduce motion
    // กลางคันต้องมีผลทันที ไม่ใช่รอรีโหลด (ท่าเดียวกับ FinishWall)
    desktop.addEventListener('change', sync);
    noReduce.addEventListener('change', sync);
    return () => {
      desktop.removeEventListener('change', sync);
      noReduce.removeEventListener('change', sync);
    };
  }, []);
  return ok;
}

// ── การจัดวาง ───────────────────────────────────────────────────────────────

const PERSPECTIVE = 1400;
/** ครึ่งความกว้าง/สูงของสนามเป็นหน่วยจอ — สนามกว้างกว่าจอ ระนาบขอบจึงถูกตัด */
const SPREAD_X = 44;
const SPREAD_Y = 40;
/** มุมทองคำ — sunflower packing กระจายทั่วจานโดยไม่ต้องสุ่มตำแหน่งและไม่กระจุก */
const GOLDEN = 2.399963229728653;
/** กล้องเริ่มที่ "ข้างนอก" สนาม ไม่ใช่ระยะประชิด (ความเสี่ยง §7 ข้อ 2) */
const CAMERA_START_Z = -700;

/** PRNG มีเมล็ดคงที่ — ค่าเดียวกันทุก build ทั้ง server และ client
 *  สุ่มจริงจะทำให้ HTML ที่ส่งมาไม่ตรงกับที่ hydrate และเลย์เอาต์เปลี่ยนทุก re-render */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PlaneBox = {
  /** px — ความกว้างของ element เอง (ขนาดที่ตาเห็น × k) */
  width: number;
  rest: string;
  /** hover: โตขึ้นอยู่กับที่ */
  hover: string;
  /** focus: ถูกดึงเข้าหากล้องและเข้าหากลางจอ (§5 ข้อ 2) */
  pulled: string;
  opacity: number;
};

function transform(fx: number, fy: number, z: number): string {
  const k = (PERSPECTIVE - z) / PERSPECTIVE;
  const x = (fx * k).toFixed(4);
  const y = (fy * k).toFixed(4);
  // translate(-50%,-50%) มาทีหลังเพื่อให้ค่า x/y/z ข้างบนหมายถึง "จุดกึ่งกลางระนาบ"
  return `translate3d(calc(${x} * ${SPREAD_X}vw), calc(${y} * ${SPREAD_Y}vh), ${z.toFixed(0)}px) translate(-50%, -50%)`;
}

function place(planes: FieldPlane[]): PlaneBox[] {
  const rnd = mulberry32(0x4b4f48); // 'KOH'

  // sunflower แยกต่อชนิด ไม่ใช่ดัชนีรวม: ถ้านับรวม ระนาบห้อง 12 ใบจะไปเกาะกลุ่ม
  // ตามจังหวะที่มันถูกแทรกในอาร์เรย์ แทนที่จะกระจายทั่วสนามของตัวเอง
  // (วัดรอบแรกได้ห้องกองอยู่ครึ่งซ้ายและมุมขวาบนว่างทั้งมุม)
  const total = {
    product: planes.filter((p) => p.kind === 'product').length || 1,
    room: planes.filter((p) => p.kind === 'room').length || 1,
  };
  const seen = { product: 0, room: 0 };

  return planes.map((plane) => {
    const room = plane.kind === 'room';
    const j = seen[plane.kind]++;
    const n = total[plane.kind];

    // เจาะรูกลางสนามไว้: ตรงกลางเป็นที่ของตัวหนังสือ (แบรนด์+ปุ่มบนประตูเข้า
    // · หัวข้อบนแกลเลอรี) ถ้าไม่เจาะ ระนาบจะไปนั่งทับข้อความที่ต้องอ่าน
    // ห้องเริ่มที่รัศมีไกลกว่าและออฟเซ็ตมุม — มันเป็นกรอบของสนาม ไม่ใช่เนื้อใน
    const angle = j * GOLDEN + (room ? 1.1 : 0);
    const t = Math.sqrt((j + 0.6) / n);
    const radius = room ? 0.52 + 0.62 * t : 0.3 + 0.72 * t;
    const wobble = 0.9 + rnd() * 0.2;
    const fx = Math.cos(angle) * radius * wobble;
    const fy = Math.sin(angle) * radius * wobble * 0.92;

    // ห้องอยู่ลึกและใหญ่ = ฉากหลัง · สินค้าพื้นโปร่งอยู่ชั้นหน้าและเล็กกว่า
    // (ความเสี่ยง §7 ข้อ 4 — ถ้าอยู่ชั้นเดียวกันสนามจะอ่านว่ามั่ว)
    const z = room ? -1060 + rnd() * 340 : -430 + rnd() * 540;
    const k = (PERSPECTIVE - z) / PERSPECTIVE;
    const apparent = room ? 210 + rnd() * 120 : 112 + rnd() * 118;

    const zHover = z + 160;
    const zPull = Math.min(z + 520, 260);

    return {
      width: Math.round(apparent * k),
      rest: transform(fx, fy, z),
      hover: transform(fx, fy, zHover),
      // 0.34 = ดึงเข้าหากลางจอเหลือหนึ่งในสามของรัศมีเดิม ระนาบที่โฟกัสจึงเข้ามา
      // อยู่ในสายตาจริง ไม่ใช่โตขึ้นอยู่นอกจอ
      pulled: transform(fx * 0.34, fy * 0.34, zPull),
      // ห้องเป็นฉากหลัง จึงหรี่ลง — สินค้าพื้นโปร่งต้องอ่านออกว่าอยู่ "ข้างหน้า"
      // ไม่ใช่จมหายไปในภาพถ่ายห้องที่มีรายละเอียดเต็มกรอบ
      opacity: room ? 0.42 : 1,
    };
  });
}

// ── component ───────────────────────────────────────────────────────────────

type Props = {
  planes: FieldPlane[];
  /**
   * 0..1 — ตัวขับกล้อง กล้องเริ่มที่ CAMERA_START_Z แล้วซูมเข้าหา 0
   * ประตูเข้าส่งความคืบหน้าการโหลด **จริง** เข้ามา ไม่ใช่ timer (§4.1)
   * แกลเลอรีส่ง 1 มาตลอด — สนามอยู่นิ่งพร้อมให้เดินดูตั้งแต่เฟรมแรก
   */
  progress?: number;
  /** ระนาบเป็นลิงก์ไปหน้าสินค้า (แกลเลอรี) หรือเป็นภาพอย่างเดียว (ประตูเข้า) */
  interactive?: boolean;
  /** ประตูเข้าเผยระนาบทีละใบตามความคืบหน้าจริง — ชิ้นที่ n โผล่เมื่อถึง n/total */
  revealByProgress?: boolean;
  className?: string;
  /** ป้ายกำกับของ region สำหรับ screen reader */
  label: string;
};

export default function DepthField({
  planes,
  progress = 1,
  interactive = false,
  revealByProgress = false,
  className = '',
  label,
}: Props) {
  const { lang } = useLang();
  const viewport = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  // สนามพ้นจอแล้วต้องหยุดทุกอย่าง (§5 ข้อ 5) — บนประตูเข้าเป็นจริงตลอด
  const [onScreen, setOnScreen] = useState(true);

  const boxes = useMemo(() => place(planes), [planes]);

  // ── กล้อง: เมาส์ ───────────────────────────────────────────────────────────
  //
  // quickTo คือ setter ที่ GSAP เตรียมไว้ล่วงหน้า ไม่ได้สร้าง tween ใหม่ทุกครั้งที่
  // เมาส์ขยับ (pointermove ยิงถี่กว่า 60 ครั้ง/วินาทีบนเมาส์เกมมิ่ง)
  useEffect(() => {
    const cam = camera.current;
    const box = viewport.current;
    if (!cam || !box || !onScreen) return;

    const xTo = gsap.quickTo(cam, 'x', { duration: 0.9, ease: 'power3.out' });
    const yTo = gsap.quickTo(cam, 'y', { duration: 0.9, ease: 'power3.out' });
    const rxTo = gsap.quickTo(cam, 'rotationX', { duration: 1.1, ease: 'power3.out' });
    const ryTo = gsap.quickTo(cam, 'rotationY', { duration: 1.1, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      // กล้องเลื่อน "สวนทาง" เมาส์ ผู้ใช้จึงรู้สึกว่าตัวเองเดินไปทางที่ชี้
      xTo(-nx * 130);
      yTo(-ny * 88);
      ryTo(nx * 7);
      rxTo(-ny * 5);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(cam);
    };
  }, [onScreen]);

  // ── กล้อง: ซูมเข้าตามความคืบหน้าจริง ──────────────────────────────────────
  const zoomed = useRef(false);
  useIsoLayoutEffect(() => {
    const cam = camera.current;
    if (!cam) return;
    const p = Math.min(1, Math.max(0, progress));
    const z = CAMERA_START_Z * (1 - p);

    // เฟรมแรกต้อง **วาง** ไม่ใช่ tween: transform เริ่มต้นของ element คือ identity
    // ซึ่งแปลว่า z = 0 = กล้องอยู่กลางสนามพอดี ถ้าปล่อยให้ tween จากตรงนั้น
    // ผู้ใช้จะเห็นกล้องถอยออกก่อนแล้วค่อยซูมเข้า ซึ่งกลับทางกับ §4.1
    // (วัดเจอจริง: camZ เดินจาก 0 ลงไป -241 ก่อนจะไต่กลับขึ้นมา)
    if (!zoomed.current) {
      zoomed.current = true;
      gsap.set(cam, { z });
      return;
    }
    gsap.to(cam, { z, duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
  }, [progress]);

  // ── หยุดเมื่อพ้น viewport ─────────────────────────────────────────────────
  useEffect(() => {
    const el = viewport.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // โฟกัสเข้าไปในกล่อง overflow:hidden ทำให้เบราว์เซอร์เลื่อน "ข้างใน" กล่องนั้น
  // (เลื่อนได้แม้ hidden — hidden ห้ามแค่ผู้ใช้เลื่อนเอง) ระนาบทั้งหมดเป็น absolute
  // สนามจึงเบี้ยวไปทั้งสนามโดยไม่มีอะไรบอกว่าเกิดอะไรขึ้น ดันกลับเป็นศูนย์ทันที
  const pinScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    e.currentTarget.scrollTop = 0;
    e.currentTarget.scrollLeft = 0;
  }, []);

  const shown = revealByProgress
    ? Math.round(Math.min(1, Math.max(0, progress)) * planes.length)
    : planes.length;

  return (
    <div
      ref={viewport}
      role="region"
      aria-label={label}
      onScroll={pinScroll}
      className={`overflow-hidden ${className}`}
      style={{ perspective: `${PERSPECTIVE}px`, perspectiveOrigin: '50% 50%' }}
    >
      <div
        ref={camera}
        data-depth-camera
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          // will-change เฉพาะตัวที่ขยับจริง (§5 ข้อ 5) — กล้องเป็น element เดียว
          // ที่มี tween วิ่งอยู่ ระนาบทั้ง 40 ใบอยู่นิ่งในระบบพิกัดของกล้อง
          // ใส่ที่ระนาบด้วยจะได้ compositing layer 40 ชั้นซึ่งเป็นความเสี่ยง §7 ข้อ 1 พอดี
          willChange: onScreen ? 'transform' : 'auto',
        }}
      >
        {planes.map((plane, i) => {
          const box = boxes[i];
          const state = focused === i ? box.pulled : active === i ? box.hover : box.rest;
          const revealed = i < shown;
          const alt = plane.alt[lang];

          const style: React.CSSProperties = {
            width: box.width,
            transform: state,
            opacity: revealed ? box.opacity : 0,
            transition:
              'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease-out',
          };

          const img = (
            /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่หน้าอื่นใช้ */
            <img
              src={plane.src}
              alt={alt}
              // 12 ใบแรกคือของที่เห็นชัดที่สุดตอนสนามเปิด ที่เหลือปล่อยให้เบราว์เซอร์
              // จัดคิวเอง — ทุกใบอยู่ในจอจึงถูกโหลดอยู่ดี แต่ลำดับต่างกัน
              loading={i < 12 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="block h-auto w-full select-none object-contain"
              style={
                plane.kind === 'room'
                  ? undefined
                  : // สินค้าเป็น PNG พื้นโปร่ง เงาตามอัลฟาทำให้มันลอยอยู่ในอวกาศ
                    // ไม่ใช่แปะอยู่บนพื้น (ท่าเดียวกับ productHalo ในกำแพง)
                    { filter: 'drop-shadow(0 12px 26px rgba(0,0,0,0.20))' }
              }
            />
          );

          if (!interactive) {
            return (
              <span
                key={plane.id}
                data-depth-plane
                className="pointer-events-none absolute left-1/2 top-1/2 block"
                style={style}
              >
                {img}
              </span>
            );
          }

          return (
            <Link
              key={plane.id}
              href={plane.href ?? '#'}
              data-depth-plane
              // ลำดับ Tab = ลำดับใน DOM = ลำดับแคตตาล็อก ไม่ใช่ตำแหน่งใน 3D (§5 ข้อ 2)
              // จึงไม่มี tabIndex ที่นี่และไม่มี roving — Tab ต้องเดินได้ครบทุกระนาบ
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused((cur) => (cur === i ? null : cur))}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
              className="focus-inset group absolute left-1/2 top-1/2 block"
              style={style}
            >
              {img}

              {/* วงแหวนโฟกัสต้องเป็น "ลูก" ไม่ใช่ box-shadow ของตัว <a> เอง
                  เงาของ element วาดในชั้นพื้นหลังของมัน ซึ่งอยู่ใต้เนื้อหาลูกทุกตัว
                  บทเรียนจาก 0581815 — QA วัดได้ 1.01–1.13:1 บนกำแพงคือไม่มีวงเลย
                  ที่นี่ยิ่งหนักกว่า: รูปห้องเป็นภาพถ่ายทึบเต็มกรอบ วงแหวนที่อยู่
                  ข้างหลังจึงถูกกลบ 100% ไม่ใช่แค่บางส่วน
                  ดู [data-focus-ring] ใน globals.css — สองเส้น ขาวชิดขอบ ink ถัดออกมา
                  เส้นใดเส้นหนึ่งอ่านออกเสมอไม่ว่ารูปข้างหลังจะสว่างหรือมืด */}
              <span aria-hidden data-focus-ring />

              {/* ป้ายชื่อโผล่ตอน hover/focus พร้อมพื้นทึบของตัวเอง
                  ตัวอักษรลอยบนภาพถ่ายไม่มีทางรับประกันคอนทราสต์ได้ — ink บน base
                  คงที่ 13.2:1 ไม่ว่าระนาบข้างหลังจะเป็นรูปอะไร (เหตุผลเดียวกับที่
                  Nav เลิกใช้ mix-blend-difference) */}
              {plane.title && (
                <span className="pointer-events-none absolute inset-x-0 top-full z-40 mt-2 hidden flex-col items-center gap-0.5 group-hover:flex group-focus-visible:flex">
                  <span className="max-w-[16rem] truncate bg-base px-2 py-1 text-body-sm text-ink">
                    {plane.title[lang]}
                  </span>
                  {plane.sub && (
                    <span className="max-w-[16rem] truncate bg-base px-2 py-0.5 text-label uppercase tracking-widest2 text-dim">
                      {plane.sub[lang]}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
