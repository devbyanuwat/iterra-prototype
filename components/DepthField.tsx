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
/**
 * ครึ่งความกว้าง/สูงของสนามเป็นหน่วยจอ — สนามกว้างกว่าจอ ระนาบขอบจึงถูกตัด
 *
 * แคบลงจาก 44/40 โดยตั้งใจ: รอบก่อนระนาบกระจายกว้างเกินจอจนของครึ่งหนึ่งไปอยู่
 * นอกเฟรม สิ่งที่เหลือในจอจึงเป็นวัตถุไม่กี่ชิ้นลอยอยู่บนพื้นว่าง
 * ของ michaelgatt ระนาบ ~40 ใบ "ปูเต็มจอ" ด้วยจำนวนเท่ากัน ต่างกันที่ขนาดกับ
 * การกระจาย ไม่ใช่จำนวน — สนามที่แคบลงบวกระนาบที่ใหญ่ขึ้นคือส่วนผสมนั้น
 */
const SPREAD_X = 40;
const SPREAD_Y = 35;
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

/**
 * สัดส่วนของ "การ์ด" สินค้า — ตั้งใจให้มีหลายอัตราส่วน
 *
 * อัตราส่วนเดียวทั้งสนามอ่านเป็น "กริดที่ถูกทำให้เอียง" ไม่ใช่กำแพงรูป
 * ผสมตั้ง/นอน/จัตุรัสแล้วขอบของแต่ละใบไม่ไปเรียงตรงกัน ตาจึงอ่านว่าเป็นของ
 * คนละใบวางทับกัน ซึ่งเป็นสิ่งเดียวที่ทำให้ภาพนิ่งของ michaelgatt อ่านเป็นกำแพง
 *
 * เดินตามดัชนีไม่ใช่สุ่ม: 5 ค่ากับมุมทองคำกระจายทั่วอยู่แล้ว และการสุ่มเปิดโอกาส
 * ให้ได้ใบสัดส่วนเดียวกันติดกันสามสี่ใบซึ่งย้อนกลับไปหาปัญหาเดิม
 */
const PRODUCT_ASPECTS = [4 / 5, 1, 5 / 4, 3 / 4, 4 / 3];

/**
 * ระนาบห้องเป็นแนวนอนเสมอ — ยังเต็มกรอบ ไม่มีการ์ด แค่ครอปเป็นสี่เหลี่ยมนอน
 *
 * เหตุผลไม่ใช่ความสวย แต่เป็น AC ข้อ 7: ปล่อยตามสัดส่วนไฟล์แล้วใบที่เป็นแนวตั้ง
 * จะสูง 410/0.75 ≈ 547px กลายเป็น element ที่ใหญ่ที่สุดในจอ และเพราะห้องถูกเลื่อน
 * ให้โหลดทีหลัง (งาน S) LCP จึงไปตกที่ของที่วาดตอน 3.1 วินาที → Lighthouse 62
 * บังคับให้นอนแล้วความสูงมีเพดาน การ์ดสินค้าจึงเป็นตัวใหญ่สุดแทน ซึ่งมาก่อน
 */
const ROOM_ASPECTS = [3 / 2, 4 / 3, 16 / 9];

// ── การ์ดต้องเต็มไปด้วยสินค้า ไม่ใช่เต็มไปด้วยขอบว่างของไฟล์ ──────────────────
//
// วัดจากของจริง: ไฟล์สินค้าเป็น 700×525 ทุกใบ และ "เนื้อสินค้า" (พิกเซลที่ไม่โปร่ง)
// กินพื้นที่มัธยฐานแค่ **12%** ของเฟรม บางใบ 1% — ก๊อกตัวเล็กลอยอยู่กลางผ้าใบกว้าง
// `object-contain` เฉย ๆ จึงเอาขอบว่างในไฟล์มาวางกลางการ์ดอีกที ได้แผ่นขาวที่มี
// ของอยู่ตรงกลางนิดเดียว ซึ่งคือสาเหตุที่สนามรอบก่อนอ่านเป็นกองกระดาษเปล่า
//
// วัดกรอบอัลฟาจริงของแต่ละไฟล์ตอนรันไทม์ แล้วขยาย/เลื่อนให้กรอบนั้นมาเต็มการ์ด
// ทำครั้งเดียวต่อไฟล์แล้วแคชไว้ — ค่าคงที่ตายตัวใช้ไม่ได้ เพราะอัตราส่วนเนื้อต่อเฟรม
// ต่างกัน 50 เท่าระหว่างใบที่น้อยสุดกับมากสุด ตัวคูณเดียวจะทำให้ใบใหญ่โดนตัดหัว
// ในขณะที่ใบเล็กยังจิ๋วอยู่ดี

/** กรอบอัลฟาเป็นสัดส่วนของภาพจริง + สัดส่วนของไฟล์เอง */
type Ink = { bx: number; by: number; bw: number; bh: number; ratio: number };

/** เนื้อสินค้าควรกินพื้นที่การ์ดเท่าไร — เหลือขอบหายใจไว้เล็กน้อย */
const INK_TARGET = 0.82;
/** เพดานการขยาย: ใบที่เนื้อ 1% ถ้าไม่จำกัดจะถูกขยายจนแตกเป็นพิกเซล */
const INK_MAX_SCALE = 3;

const inkCache = new Map<string, Ink | null>();

function measureInk(img: HTMLImageElement): Ink | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return null;
  // 64px กว้างพอจะหาขอบได้แม่นระดับ ~1.5% ของเฟรม ซึ่งละเอียดเกินพอสำหรับการ
  // ตัดสินใจว่าจะขยายเท่าไร และเป็นหนึ่งในสี่ของงานอ่านพิกเซลเทียบกับ 96px
  const W = 64;
  const H = Math.max(1, Math.round((W * nh) / nw));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.drawImage(img, 0, 0, W, H);

  let data: Uint8ClampedArray;
  try {
    data = g.getImageData(0, 0, W, H).data;
  } catch {
    // ภาพข้าม origin จะโยนตรงนี้ — คืน null แล้วระนาบนั้นกลับไปใช้ contain เฉย ๆ
    return null;
  }

  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // 24 ไม่ใช่ 0: ขอบภาพที่คีย์มามี alpha เศษ ๆ เหลืออยู่รอบวัตถุ
      if (data[(y * W + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return {
    bx: x0 / W,
    by: y0 / H,
    bw: (x1 - x0 + 1) / W,
    bh: (y1 - y0 + 1) / H,
    ratio: nw / nh,
  };
}

/**
 * transform ของภาพในการ์ด: ขยายให้กรอบอัลฟาเต็มการ์ด แล้วเลื่อนให้อยู่กลาง
 *
 * `translate(...) scale(s)` โดย transform-origin เป็นกลางกล่อง แปลว่าจุด p ถูกส่งไป
 * C + s·(p + t − C) อยากให้จุดกึ่งกลางของกรอบอัลฟา B ไปอยู่ที่ C พอดี จึงได้ t = C − B
 * (ถ้าสลับลำดับเป็น `scale() translate()` ค่า t จะถูกคูณด้วย s ซึ่งเลื่อนเกินไปทุกครั้ง)
 */
function inkFit(ink: Ink | null, cardW: number, cardH: number) {
  if (!ink || !cardW || !cardH) return undefined;
  // object-contain: ภาพถูกย่อให้พอดีกล่อง แล้ววางกลาง
  const c = Math.min(cardW / ink.ratio, cardH);
  const paintedW = c * ink.ratio;
  const paintedH = c;
  const ox = (cardW - paintedW) / 2;
  const oy = (cardH - paintedH) / 2;

  const inkW = ink.bw * paintedW;
  const inkH = ink.bh * paintedH;
  if (inkW < 1 || inkH < 1) return undefined;

  const s = Math.min(
    INK_MAX_SCALE,
    Math.max(1, Math.min((INK_TARGET * cardW) / inkW, (INK_TARGET * cardH) / inkH)),
  );
  const inkCx = ox + (ink.bx + ink.bw / 2) * paintedW;
  const inkCy = oy + (ink.by + ink.bh / 2) * paintedH;

  return `translate(${(cardW / 2 - inkCx).toFixed(1)}px, ${(cardH / 2 - inkCy).toFixed(1)}px) scale(${s.toFixed(3)})`;
}

type PlaneBox = {
  /** px — ความกว้างของ element เอง (ขนาดที่ตาเห็น × k) */
  width: number;
  /** สัดส่วนของกล่อง — undefined = ปล่อยตามสัดส่วนจริงของไฟล์ (ระนาบห้อง) */
  aspect?: number;
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

    // รูกลางสนามเล็กลงมาก (0.3 → 0.12): ตัวหนังสือบนประตูมีฉาก base ทาทับสองขอบ
    // เป็นตัวรับประกันคอนทราสต์อยู่แล้ว การเว้นกลางไว้กว้าง ๆ อีกชั้นมีผลอย่างเดียว
    // คือเจาะรูโบ๋กลางเฟรม ซึ่งเป็นสิ่งแรกที่ตาจับได้ว่าสนาม "ว่าง"
    // ห้องเริ่มที่รัศมีไกลกว่าและออฟเซ็ตมุม — มันเป็นฉากหลังที่ล้อมเนื้อใน
    const angle = j * GOLDEN + (room ? 1.1 : 0);
    const t = Math.sqrt((j + 0.6) / n);
    const radius = room ? 0.2 + 0.9 * t : 0.16 + 0.86 * t;
    const wobble = 0.9 + rnd() * 0.2;
    const fx = Math.cos(angle) * radius * wobble;
    const fy = Math.sin(angle) * radius * wobble * 0.92;

    // ห้องอยู่ลึกและใหญ่ = ฉากหลัง · การ์ดสินค้าอยู่ชั้นหน้า
    const z = room ? -1060 + rnd() * 340 : -430 + rnd() * 540;
    const k = (PERSPECTIVE - z) / PERSPECTIVE;

    // ใหญ่ขึ้นจากรอบก่อน (สินค้า 112–230 → 165–290 · ห้อง 210–330 → 380–600)
    // ที่ 1440×900 ระนาบ 40 ใบขนาดนี้กินพื้นที่รวมมากกว่าหนึ่งจอ จึงต้องซ้อนกัน
    // ซึ่งคือเป้าหมาย — การซ้อนกันคือสิ่งที่ทำให้มันอ่านเป็นกำแพง ไม่ใช่ของวางกระจาย
    //
    // การ์ดสินค้า **เล็กกว่า** ระนาบห้องอย่างจงใจ: รูปสินค้าเป็นภาพตัดพื้นโปร่งที่มี
    // ขอบว่างเยอะอยู่ในไฟล์อยู่แล้ว ขยายการ์ดขึ้นไม่ได้ทำให้เห็นสินค้ามากขึ้น
    // ได้แต่พื้นที่ขาวมากขึ้น (ลองที่ 208–392 แล้วสนามอ่านเป็นกองกระดาษเปล่า)
    // ภาพถ่ายห้องต่างหากที่ยิ่งใหญ่ยิ่งได้ เพราะมันมีเนื้อภาพเต็มกรอบจริง
    // ห้องต้องใหญ่ ไม่งั้นการ์ดขาวบังหมดแล้วสนามกลับไปเป็นกองกระดาษอีก (ลอง 300–410
    // แล้วภาพถ่ายเหลือแค่เศษเสี้ยวตามขอบ) ส่วนการ์ดใหญ่ขึ้นได้เพราะ inkFit ทำให้
    // มันมีเนื้อสินค้าเต็มใบแล้ว ไม่ใช่แผ่นเปล่าเหมือนตอนแรก
    //
    // ── เพดานขนาดต่อระนาบ มาจาก AC ข้อ 7 ไม่ใช่จากรสนิยม ──────────────────
    // LCP คือ element ที่ใหญ่ที่สุดในจอ สนามเป็น client component ที่มาหลัง hydrate
    // และรูปของมันมาต่อคิวกับรูปอีก ~50 ใบของหน้าแรก ระนาบใดก็ตามที่ใหญ่กว่าแผง
    // กำแพงผิวเคลือบข้างหลัง (≈131×900 = 118k px²) จะแย่งเป็น LCP แล้ววาดที่ ~3.1s
    // (วัดแล้วทั้งสองทาง: ห้องใหญ่สุด → 81 · การ์ดใบใหญ่สุด → 81 เท่ากันเป๊ะ
    //  เพราะตัวที่ช้าคือ "สนาม" ไม่ใช่ "ชนิดของระนาบ")
    // ทุกระนาบจึงถูกกดให้ต่ำกว่า 118k px² แล้วชดเชยความหนาแน่นด้วยจำนวนแทน —
    // ซึ่งใกล้ของอ้างอิงมากกว่าอยู่แล้ว: กำแพงของเขาคือรูปขนาดกลางหลายใบ
    // ไม่ใช่รูปยักษ์ไม่กี่ใบ
    const apparent = room ? 300 + rnd() * 85 : 170 + rnd() * 130;

    const zHover = z + 160;
    const zPull = Math.min(z + 520, 260);

    return {
      width: Math.round(apparent * k),
      aspect: room
        ? ROOM_ASPECTS[j % ROOM_ASPECTS.length]
        : PRODUCT_ASPECTS[j % PRODUCT_ASPECTS.length],
      rest: transform(fx, fy, z),
      hover: transform(fx, fy, zHover),
      // 0.34 = ดึงเข้าหากลางจอเหลือหนึ่งในสามของรัศมีเดิม ระนาบที่โฟกัสจึงเข้ามา
      // อยู่ในสายตาจริง ไม่ใช่โตขึ้นอยู่นอกจอ
      pulled: transform(fx * 0.34, fy * 0.34, zPull),
      // ห้องเคยอยู่ที่ 0.42 เพื่อไม่ให้ก๊อกพื้นโปร่งจมหายไปในภาพถ่าย
      // ตอนนี้สินค้าอยู่บนการ์ดทึบแล้ว มันแยกตัวเองได้ด้วยขอบ ไม่ต้องพึ่งการหรี่
      // ฉากหลังจึงกลับมาเป็นสี่เหลี่ยมทึบจริง ๆ ซึ่งคือของที่ดูถูกอยู่แล้วตั้งแต่แรก
      opacity: room ? 0.95 : 1,
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
  /**
   * ระนาบห้องรอจนกว่า "ระนาบสินค้าในสนามนี้" จะโหลดครบ ถึงจะเข้ามา
   *
   * สเปก §4.1 สั่งให้ประตูมีรูปห้อง แต่ §5 ข้อ 6 สั่งว่ารูปในสนามต้องเป็นไฟล์ที่
   * หน้าอื่นใช้อยู่แล้ว — หน้าแรกไม่ได้เรนเดอร์รูปห้องสักใบ ข้อบังคับสองข้อนี้จึงขัดกัน
   * ทางออกคือให้ห้อง "อยู่ในสนาม แต่ไม่ขวางทางเข้า": ประตูวัดความคืบหน้าจากสินค้า
   * ซึ่งเป็นของที่หน้าแรกต้องโหลดอยู่แล้ว พอถึง 100% ประตูก็เปิดได้ทันที
   * ห้องจึงเริ่มโหลดตอนที่การรอสิ้นสุดลงแล้ว — คนที่กดเข้าเลยไม่ได้จ่ายค่ามันเลย
   * ส่วนคนที่ยืนดูสนามต่อจะเห็นฉากหลังไล่เข้ามาทีหลัง
   *
   * เงื่อนไขคือ "รูปสินค้าในสนามครบ" ไม่ใช่ `progress >= 1`:
   * วัดจริงแล้วเปอร์เซ็นต์ของประตูแทบไม่เคยแตะ 100 ด้วยตัวเอง เพราะ `real()` หาร
   * ด้วย document.images ทั้งหน้า ซึ่งรวมรูป lazy ใต้จอของหน้าแรกที่ยังไม่โหลด
   * (`complete === false` ตลอด) — ผูกห้องไว้กับ 100% จึงเท่ากับผูกไว้กับ watchdog
   * ที่ 6 วินาที แปลว่าในการใช้งานจริงห้องจะไม่มาเลย
   */
  deferRooms?: boolean;
  className?: string;
  /** ป้ายกำกับของ region สำหรับ screen reader */
  label: string;
};

export default function DepthField({
  planes,
  progress = 1,
  interactive = false,
  revealByProgress = false,
  deferRooms = false,
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
  // ระนาบห้องเข้ามาได้หรือยัง (ใช้เมื่อ deferRooms เท่านั้น)
  const [roomsReady, setRoomsReady] = useState(false);
  // กรอบอัลฟาต่อไฟล์ — ว่างไว้ก่อน ระนาบจะใช้ object-contain ธรรมดาจนกว่าจะวัดเสร็จ
  const [inks, setInks] = useState<Record<string, Ink | null>>({});

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

  // ── ฉากหลังเข้ามาหลังสินค้าโหลดครบ ────────────────────────────────────────
  //
  // เดินสำรวจ <img> ของ "ระนาบสินค้าในสนามนี้" ไม่ใช่ document.images ทั้งหน้า:
  // เกณฑ์คือของที่สนามต้องมีเพื่อทำหน้าที่ของมัน ไม่ใช่ของทั้งหน้าแรก
  //
  // watchdog: รูปสินค้าที่พังหรือค้างต้องไม่แปลว่าห้องจะไม่มาตลอดกาล
  // เหตุผลเดียวกับ watchdog ของประตูเข้า — ห้ามให้สิ่งที่โหลดไม่สำเร็จกลายเป็น
  // เงื่อนไขถาวรของสิ่งที่ยังทำงานได้
  useEffect(() => {
    if (!deferRooms || roomsReady) return;
    const cam = camera.current;
    if (!cam) return;

    const done = () => {
      const imgs = Array.from(
        cam.querySelectorAll<HTMLImageElement>('img:not([data-depth-defer])'),
      );
      return imgs.length > 0 && imgs.every((i) => i.complete);
    };

    if (done()) {
      setRoomsReady(true);
      return;
    }
    const poll = window.setInterval(() => {
      if (done()) {
        window.clearInterval(poll);
        setRoomsReady(true);
      }
    }, 160);
    const watchdog = window.setTimeout(() => {
      window.clearInterval(poll);
      setRoomsReady(true);
    }, 6000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(watchdog);
    };
  }, [deferRooms, roomsReady, planes]);

  // ── วัดกรอบอัลฟาของรูปสินค้าทุกใบ ครั้งเดียว ─────────────────────────────
  //
  // รอให้ใบที่ยังไม่เสร็จโหลดจบก่อน แล้ววัดเป็นชุดละไม่กี่ใบต่อเฟรม
  //
  // ไม่วัดทีละใบตอน onLoad: setState 40 ครั้งติดกันแปลว่า re-render สนาม 40 รอบ
  // ตอนที่ประตูกำลังจะเปิดพอดี — และไม่วัดรวดเดียวทั้ง 40 ใบด้วย เพราะ
  // `getImageData` บังคับ decode + อ่านกลับจาก GPU ทีละใบ 40 ใบติดกันเป็นบล็อก
  // ที่กินเมนเธรดยาว (วัดได้ TBT 440ms) หั่นเป็นชุดละ 6 ใบต่อเฟรมแล้วค่อย setState
  // ครั้งเดียวตอนจบ ได้ทั้งสองอย่าง
  //
  // ผลถูกแคชที่ระดับโมดูล ไฟล์เดียวกันในสนามที่สอง (แกลเลอรี) จึงไม่ถูกวัดซ้ำ
  useEffect(() => {
    const cam = camera.current;
    if (!cam) return;
    let alive = true;
    let raf = 0;

    const CHUNK = 6;

    const measureAll = (imgs: HTMLImageElement[]) => {
      let at = 0;
      const step = () => {
        if (!alive) return;
        const end = Math.min(at + CHUNK, imgs.length);
        for (; at < end; at++) {
          const key = imgs[at].getAttribute('src') ?? '';
          if (key && !inkCache.has(key)) inkCache.set(key, measureInk(imgs[at]));
        }
        if (at < imgs.length) {
          raf = requestAnimationFrame(step);
          return;
        }
        const next: Record<string, Ink | null> = {};
        for (const img of imgs) {
          const key = img.getAttribute('src') ?? '';
          if (key) next[key] = inkCache.get(key) ?? null;
        }
        setInks(next);
      };
      raf = requestAnimationFrame(step);
    };

    const ready = () => {
      const imgs = Array.from(
        cam.querySelectorAll<HTMLImageElement>('img:not([data-depth-defer])'),
      );
      if (!imgs.length || !imgs.every((i) => i.complete)) return null;
      return imgs;
    };

    const first = ready();
    if (first) {
      measureAll(first);
      return () => {
        alive = false;
        cancelAnimationFrame(raf);
      };
    }

    const poll = window.setInterval(() => {
      const imgs = ready();
      if (imgs) {
        window.clearInterval(poll);
        measureAll(imgs);
      }
    }, 200);
    const watchdog = window.setTimeout(() => window.clearInterval(poll), 8000);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.clearTimeout(watchdog);
    };
  }, [planes]);

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

  const roomsIn = !deferRooms || roomsReady;

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
          // ตัดทั้งระนาบทิ้ง ไม่ใช่ปล่อย <img> ที่ยังไม่มี src ค้างไว้: ระนาบที่ไม่มีรูป
          // ไม่ใช่ระนาบ และ AC ข้อ 1 นับ "ระนาบที่เป็น <img>" ไม่ใช่กล่องเปล่า
          // ตำแหน่งสินค้าไม่ขยับตอนห้องโผล่ เพราะ place() เดิน sunflower **แยกต่อชนิด**
          // จำนวนสินค้าจึงเท่าเดิมไม่ว่าห้องจะอยู่หรือไม่อยู่
          if (plane.kind === 'room' && !roomsIn) return null;
          const box = boxes[i];
          const state = focused === i ? box.pulled : active === i ? box.hover : box.rest;
          const revealed = i < shown;
          const alt = plane.alt[lang];

          const isRoom = plane.kind === 'room';

          // ขนาดกล่องการ์ดที่ inkFit ต้องรู้ — ความสูงมาจากสัดส่วนที่ place() เลือกไว้
          // สัดส่วนของไฟล์ติดมากับผลการวัด ไม่ได้ฮาร์ดโค้ด เผื่อข้อมูลถูก generate ใหม่
          const fit = isRoom
            ? undefined
            : inkFit(inks[plane.src] ?? null, box.width, box.width / (box.aspect ?? 1));

          const style: React.CSSProperties = {
            width: box.width,
            aspectRatio: box.aspect,
            transform: state,
            opacity: revealed ? box.opacity : 0,
            transition:
              'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease-out',
            // เงาอยู่ที่ "แผ่น" ไม่ใช่ที่ตัวสินค้า — ระนาบเป็นวัตถุแบนที่ลอยอยู่
            // ในอวกาศ ไม่ใช่ก๊อกที่ลอยเดี่ยว ๆ เงาจึงต้องเป็นเงาของสี่เหลี่ยม
            //
            // เฉพาะการ์ดสินค้า และเบลอแคบ: เงาเบลอกว้าง 48px บนระนาบ 44 ใบที่ซ้อนกัน
            // วัดได้ 84fps / 49 เฟรมเกิน 16.7ms ภาพถ่ายห้องมีขอบคมของตัวเองอยู่แล้ว
            // ไม่ต้องพึ่งเงาเพื่อให้แยกออกจากพื้น — ตัดออกได้ฟรี
            boxShadow: isRoom ? undefined : '0 14px 26px rgba(0,0,0,0.14)',
          };

          const image = (
            /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่หน้าอื่นใช้ */
            <img
              src={plane.src}
              alt={alt}
              // ระนาบห้องถูกเรนเดอร์ก็ต่อเมื่อสินค้าโหลดครบแล้ว ณ จุดนั้นมันอยู่ในจอ
              // และเราตัดสินใจแล้วว่าจะเอา — `lazy` ตรงนี้จึงไม่ได้เลื่อนอะไรออกไป
              // นอกจากทำให้เบราว์เซอร์ดองมันไว้ท้ายคิวจริง ๆ
              // (วัดได้: ห้องเป็น LCP ที่ 3.1 วินาที Lighthouse หน้าแรกเหลือ 62
              //  เอา lazy ออกแล้ว fetchPriority=low ยังคุมลำดับให้อยู่หลังสินค้าเหมือนเดิม)
              loading={isRoom ? 'eager' : i < 12 ? 'eager' : 'lazy'}
              // ห้องต่อคิวหลังสินค้าเสมอ แม้ในกรณีที่มันถูกใส่เข้ามาพร้อมกัน
              // (แกลเลอรีไม่มีระนาบห้อง ค่านี้จึงมีผลเฉพาะประตูเข้า)
              fetchPriority={isRoom ? 'low' : undefined}
              // ตัวชี้ให้ Preloader ตัดออกจากการนับความคืบหน้า — ประตูต้องเปิดได้
              // โดยไม่ต้องรอฉากหลัง ดูหมายเหตุ `deferRooms` ด้านบน
              data-depth-defer={isRoom ? '' : undefined}
              decoding="async"
              draggable={false}
              // ห้องใช้ object-cover: ระนาบมีสัดส่วนของตัวเองแล้ว ภาพต้องเต็มกรอบ
              // ไม่ใช่ทิ้งแถบว่าง — "เต็มกรอบ ไม่มีการ์ด" คือสิ่งที่ระนาบห้องต้องเป็น
              className={
                isRoom
                  ? 'block h-full w-full select-none object-cover'
                  : 'block h-full w-full select-none object-contain'
              }
            />
          );

          // ── ระนาบสินค้า = การ์ด ไม่ใช่ PNG ลอย ────────────────────────────
          //
          // สาเหตุที่สนามรอบก่อนไม่อ่านเป็นกำแพงรูป: ระนาบสินค้าเป็นภาพพื้นโปร่ง
          // ล้วน ๆ ตาไม่มีขอบให้จับ ยิ่งซ้อนกันยิ่งอ่านเป็นก๊อกกองรวมกันมั่ว ๆ
          // ไม่ใช่แผ่นภาพซ้อนกัน — ของ michaelgatt ทุกระนาบเป็นเฟรมหนังทึบขอบคม
          //
          // การ์ดจึงเป็น "พื้นผิวจริง": surface ขาว + ขอบเส้นผม + padding ให้สินค้า
          // หายใจ ขอบสำคัญกว่าที่คิด — surface `#FFFFFF` บนพื้น `#E5E5E5` ต่างกัน
          // แค่ 1.13:1 ถ้าไม่มีเส้นขอบ การ์ดก็คือสี่เหลี่ยมที่มองไม่เห็นขอบอยู่ดี
          //
          // ห้องไม่ต้องมีการ์ด (ข้อ 2 ของงานนี้): มันเป็นสี่เหลี่ยมทึบขอบคมโดยธรรมชาติ
          // ใส่กรอบให้อีกชั้นคือใส่กรอบให้ของที่เป็นกรอบอยู่แล้ว
          const body = isRoom ? (
            image
          ) : (
            <span className="block h-full w-full overflow-hidden border border-[rgba(0,0,0,0.14)] bg-surface">
              {/* ชั้นนี้มีหน้าที่เดียว: ขยายและเลื่อนภาพให้ "เนื้อสินค้า" มาเต็มการ์ด
                  ค่ามาจากกรอบอัลฟาที่วัดจากไฟล์จริง ดู measureInk/inkFit ด้านบน
                  ยังไม่ได้วัด (เฟรมแรก ๆ) = ไม่มี transform = object-contain ธรรมดา
                  ซึ่งเป็นสถานะที่ถูกต้องอยู่แล้ว แค่ว่างกว่า */}
              <span
                className="block h-full w-full"
                style={{ transform: fit, transformOrigin: 'center' }}
              >
                {image}
              </span>
            </span>
          );

          if (!interactive) {
            return (
              <span
                key={plane.id}
                data-depth-plane
                className="pointer-events-none absolute left-1/2 top-1/2 block"
                style={style}
              >
                {body}
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
              {body}

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
