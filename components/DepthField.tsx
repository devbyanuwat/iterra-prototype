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

// ── ห้อง ไม่ใช่โปสเตอร์ ──────────────────────────────────────────────────────
//
// รอบก่อนระนาบทุกใบหันหน้าตรงเข้ากล้องและถูกชดเชยขนาดด้วย k = (P−z)/P จนขนาด
// ที่ตาเห็น "ไม่ขึ้นกับ z เลย" ผลคือ collage แบน: ตาไม่มีสัญญาณระยะเหลืออยู่สักอย่าง
// ทั้งที่ทุกใบมีค่า z ต่างกันจริง — เราลบสัญญาณนั้นทิ้งไปเองด้วยการชดเชย
//
// ของอ้างอิงเป็น "ห้อง": ระนาบริมซ้ายกับริมขวาหมุนเข้าหาแกนกลางเหมือนผนัง
// สอบเข้าไปหาจุดรวมสายตา ใบใกล้ใหญ่ ใบไกลเล็กและมืดลง คนดูอยู่ *ข้างใน* ที่ว่าง
//
// รอบนี้จึงคิดเป็นพิกัดโลกจริง (px ในระบบพิกัดของกล้อง) แล้วปล่อยให้เปอร์สเปกทีฟ
// ทำงานของมัน: ขนาดที่ตาเห็นถูกเลือกจาก "ความลึก" ไม่ใช่ถูกทำให้คงที่

/** ระยะจากแกนกลางถึงผนังซ้าย/ขวา */
const ROOM_HALF_W = 1020;
/** ระนาบที่ใกล้ที่สุดอยู่เกือบถึงระนาบกล้อง — ต้องน้อยกว่า PERSPECTIVE เสมอ */
const Z_NEAR = 240;
/** ก้นห้อง — ลึกกว่านี้แล้วใบไกลเล็กจนอ่านไม่ออกและเหลือแค่จุดเทา */
const Z_FAR = -2050;
/**
 * เพดานพื้นที่ที่ตาเห็นต่อระนาบ (px²) — มาจาก AC ข้อ 7 ไม่ใช่รสนิยม
 * ระนาบที่ใหญ่กว่าแผงกำแพงผิวเคลือบข้างหลัง (≈118k) จะแย่งเป็น LCP
 * แล้ววาดที่ ~3.1s เพราะสนามเป็น client component ที่มาหลัง hydrate
 */
// 88k ไม่ใช่ 112k: ค่านี้คุม "ขนาดที่สั่ง" แต่ระนาบที่หมุนและอยู่ใกล้กล้องถูก
// เปอร์เซกทีฟยืดขอบด้านใกล้ออก กล่องครอบ (ซึ่งคือสิ่งที่ LCP วัด) จึงโตกว่าที่สั่ง
// — วัดได้ 166k ตอนเพดานอยู่ที่ 112k คือเกินไป 48%
const MAX_APPARENT_AREA = 88_000;
/** ส่วนทองคำ — เดินค่า 0..1 แบบกระจายสม่ำเสมอกว่าการสุ่ม (low-discrepancy) */
const PHI_STEP = 0.6180339887498949;
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

/**
 * transform ของระนาบหนึ่งใบในพิกัดโลก
 *
 * `rotateY` มาก่อน `translate(-50%,-50%)`: การหมุนต้องเกิดรอบจุดกึ่งกลางของระนาบ
 * ถ้าสลับลำดับ ระนาบจะหมุนรอบมุมซ้ายบนของตัวเองแล้วเหวี่ยงหลุดตำแหน่ง
 */
function tf(x: number, y: number, z: number, yaw: number): string {
  return `translate3d(${x.toFixed(0)}px, ${y.toFixed(0)}px, ${z.toFixed(0)}px) rotateY(${yaw.toFixed(1)}deg) translate(-50%, -50%)`;
}

/** ขนาดย่อ/ขยายที่เปอร์สเปกทีฟกระทำกับระนาบที่ความลึก z */
const persp = (z: number) => PERSPECTIVE / (PERSPECTIVE - z);

/**
 * ย้ายระนาบไปความลึกใหม่โดยให้ "ตำแหน่งที่ตาเห็น" คงเดิม
 *
 * ตำแหน่งที่ตาเห็น = พิกัดโลก × persp(z) ถ้าเปลี่ยน z เฉย ๆ ระนาบจะไหลออก
 * จากกลางจอ — ตอน hover นั่นแปลว่าของหนีเคอร์เซอร์ ซึ่งเป็นลูป hover→หนี→กลับมา
 */
function atDepth(x: number, y: number, z: number, newZ: number, scale = 1) {
  const r = persp(z) / persp(newZ);
  return { x: x * r * scale, y: y * r * scale };
}

function place(planes: FieldPlane[]): PlaneBox[] {
  const rnd = mulberry32(0x4b4f48); // 'KOH'
  const seen = { product: 0, room: 0 };

  return planes.map((plane, idx) => {
    const room = plane.kind === 'room';
    const j = seen[plane.kind]++;

    // ── โซน: ผนังซ้าย · ผนังขวา · กลางห้อง ────────────────────────────────
    // แบ่งตามดัชนีรวม ไม่ใช่ต่อชนิด — ผนังต้องมีทั้งการ์ดสินค้าและภาพถ่ายห้อง
    // ปนกัน ไม่งั้นได้ "ผนังสินค้า" กับ "ผนังภาพถ่าย" ซึ่งอ่านเป็นสองก้อน
    const slot = idx % 10;
    const zone = slot < 4 ? -1 : slot < 8 ? 1 : 0;

    // ความลึกเดินแบบ low-discrepancy ไม่ใช่สุ่มล้วน: สุ่มล้วนได้ระนาบเกาะกลุ่ม
    // เป็นชั้น ๆ แล้วเว้นช่องโบ๋ ซึ่งพังทั้งความรู้สึกว่าเป็นทางเดินที่ต่อเนื่อง
    const u = (j * PHI_STEP + (room ? 0.31 : 0)) % 1;
    const z = Z_NEAR + (Z_FAR - Z_NEAR) * u;
    const depth01 = (Z_NEAR - z) / (Z_NEAR - Z_FAR); // 0 = ใกล้สุด · 1 = ก้นห้อง

    let x: number;
    let y: number;
    let yaw: number;

    if (zone === 0) {
      // กลางห้อง: ของที่ลอยอยู่ในทางเดิน หันเกือบตรง เอียงเล็กน้อยพอไม่ให้แข็ง
      // ช่วงกว้างขึ้นตามความลึกเพื่อให้ "ระยะที่ตาเห็น" คงที่ ไม่งั้นใบไกลจะกอง
      // อยู่ที่จุดรวมสายตาจุดเดียว
      x = (rnd() - 0.5) * 2 * (360 + depth01 * 980);
      y = (rnd() - 0.5) * 2 * (300 + depth01 * 900);
      yaw = (rnd() - 0.5) * 20;
    } else {
      // ผนัง: ระยะจากแกนกลาง **คงที่ในพิกัดโลก** — เปอร์สเปกทีฟจึงบีบมันเข้าหา
      // กลางจอเองเมื่อไกลออกไป ซึ่งคือเส้นสอบของทางเดิน ไม่ได้วาดเส้นนั้นเอง
      // ผนังเป็น "แถบ" ไม่ใช่ "เส้น": ระยะจากแกนกลางกระจาย 0.42–1.15 เท่า
      // ถ้าทุกใบอยู่ระยะเดียวกัน ใบใกล้จะหลุดออกนอกเฟรมทั้งแถวและใบไกลจะกอง
      // อยู่กลางจอ เหลือแถบว่างคาดกลางภาพระหว่างสองกลุ่ม (วัดรอบแรกเจอรูโบ๋นั้น)
      x = zone * ROOM_HALF_W * (0.42 + rnd() * 0.73);
      y = (rnd() - 0.5) * 2 * (330 + depth01 * 900);
      // หันเข้าหาแกนกลาง: ผนังซ้าย (zone −1) หมุนบวก · ผนังขวาหมุนลบ
      yaw = -zone * (30 + rnd() * 26);
    }

    // ── ขนาดที่ตาเห็น มาจากความลึก ไม่ใช่ถูกทำให้คงที่ ─────────────────────
    // นี่คือสัญญาณระยะที่หายไปทั้งหมดในรอบก่อน ใกล้ใหญ่ ไกลเล็ก
    const jitter = 0.85 + rnd() * 0.3;
    let apparentW = ((room ? 340 : 260) - depth01 * (room ? 130 : 105)) * jitter;

    const aspect = room
      ? ROOM_ASPECTS[j % ROOM_ASPECTS.length]
      : PRODUCT_ASPECTS[j % PRODUCT_ASPECTS.length];

    // เพดานพื้นที่: การ์ดแนวตั้งสูงกว่ากว้าง ใบที่ผ่านเกณฑ์ความกว้างอาจยังเกิน
    // พื้นที่ จึงตัดสินที่พื้นที่จริง ไม่ใช่ที่ความกว้างอย่างเดียว
    const area = (apparentW * apparentW) / aspect;
    if (area > MAX_APPARENT_AREA) apparentW *= Math.sqrt(MAX_APPARENT_AREA / area);

    // ความกว้างของ element เอง = ขนาดที่ต้องการ ÷ ตัวคูณเปอร์สเปกทีฟ
    const width = Math.round(apparentW / persp(z));

    const zHover = Math.min(z + 130, Z_NEAR + 120);
    const hoverPos = atDepth(x, y, z, zHover);

    // โฟกัส: ดึงเข้าหากล้อง เข้าหากลางจอ และ **คลายมุมหันเกือบหมด**
    // ระนาบผนังที่หมุน 50° อ่านยากกว่าที่ควรตอนมันคือของที่ผู้ใช้เลือกอยู่
    //
    // `scale(1.12)` ต่อท้ายด้วย ไม่ใช่พึ่ง z อย่างเดียว: ระนาบที่อยู่หน้าห้องอยู่แล้ว
    // (z ≈ 300 = เพดานของ zPull) ขยับ z ไม่ได้ การโฟกัสมันจึงไม่มีอะไรเปลี่ยนเลย
    // — วัดเจอใบหนึ่งที่ z 306 → 311 กว้าง 311 → 273px ซึ่งอ่านว่า "ไม่ได้ถูกเลือก"
    const zPull = Math.min(z + 900, 300);
    const pullPos = atDepth(x, y, z, zPull, 0.32);

    return {
      width,
      aspect,
      rest: tf(x, y, z, yaw),
      hover: tf(hoverPos.x, hoverPos.y, zHover, yaw),
      pulled: `${tf(pullPos.x, pullPos.y, zPull, yaw * 0.15)} scale(1.12)`,
      // หรี่ตามระยะ (aerial perspective) — ก้นห้องจมเข้าไปในพื้นดำ
      // เป็นสัญญาณระยะตัวที่สองที่ของอ้างอิงใช้ และทำให้ห้องลึกยิ่งกว่าขนาดเสียอีก
      //
      // การ์ดสินค้าหรี่ได้น้อยกว่าภาพถ่ายห้องมาก: พื้นการ์ดเป็นสีขาว หรี่ลง 50%
      // บนพื้นดำแล้วมันไม่ได้ "ไกลออกไป" แต่กลายเป็นแผ่นเทา ซึ่งอ่านเป็นสีของวัตถุ
      // ไม่ใช่ระยะ (ลอง 0.5 เท่ากันทั้งคู่แล้วครึ่งสนามเป็นบล็อกเทา)
      // ภาพถ่ายรับการหรี่ได้เต็มที่เพราะมันจมเข้าไปในความมืดได้อย่างเป็นธรรมชาติ
      opacity: room ? 0.95 - depth01 * 0.42 : 1 - depth01 * 0.2,
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
  /**
   * สนามวางบนพื้นมืด `#08090A` — ค่าเริ่มต้นของทั้งประตูเข้าและแกลเลอรี
   *
   * ของอ้างอิงทำงานได้เพราะเฟรมภาพ "เรืองขึ้นมาจากพื้นดำ" การ์ดสินค้าเป็นแผ่นขาว
   * บนพื้น `#E5E5E5` ต่างกัน 1.13:1 — สนามจึงอ่านเป็นกองกระดาษ ไม่ใช่กำแพงรูป
   * บนพื้นดำ การ์ดขาวชุดเดิมกลายเป็นของที่ถูกต้องทันทีโดยไม่ต้องแก้การ์ดเลย
   *
   * ปิดได้ (`dark={false}`) เผื่อมีที่ใช้สนามบนพื้นสว่างในอนาคต ตัวสนามไม่ได้
   * ผูกกับสีพื้นนอกจากตรงที่ระบุไว้ในไฟล์นี้
   */
  dark?: boolean;
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
  dark = true,
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

    // ── กล้องต้อง "มองรอบห้อง" ไม่ใช่ขยับนิดเดียว ──────────────────────────
    //
    // รอบก่อนหมุนแค่ ±7° กับเลื่อน ±130px ซึ่งอ่านเป็น parallax เบา ๆ ไม่ใช่การ
    // หันมอง ของอ้างอิงกวาดกล้องเป็นวงกว้างจนเดินไปมุมหนึ่งแล้วเจอระนาบที่เมื่อกี้
    // อยู่นอกเฟรม ±26° บนสนามที่กว้าง ±900 ลึก 2,600 ให้ผลนั้น
    //
    // หมุนที่ "กล้อง" ซึ่งเป็น container ของทั้งฉาก = หมุนโลกรอบจุดกำเนิด
    // ซึ่งเทียบเท่ากับกล้องโคจรรอบห้อง และถูกกว่าการขยับระนาบ 52 ใบทีละใบมาก
    const ROT_Y = 26;
    const ROT_X = 13;
    const PAN = 190;

    // หน่วงยาวขึ้นตามระยะที่กว้างขึ้น — ระยะเท่าเดิมที่ 0.9s จะกระตุก
    const xTo = gsap.quickTo(cam, 'x', { duration: 1.15, ease: 'power3.out' });
    const yTo = gsap.quickTo(cam, 'y', { duration: 1.15, ease: 'power3.out' });
    const rxTo = gsap.quickTo(cam, 'rotationX', { duration: 1.3, ease: 'power3.out' });
    const ryTo = gsap.quickTo(cam, 'rotationY', { duration: 1.3, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // −1..1 ไม่ใช่ −0.5..0.5: ค่าที่ประกาศไว้ข้างบนคือ "องศาที่มุมจอ"
      // ถ้าไม่คูณสอง ระยะจริงจะเหลือครึ่งเดียวของที่ตั้งใจ (วัดรอบแรกได้ ±12.4°
      // ทั้งที่ ROT_Y = 26 — ตัวเลขในโค้ดกับสิ่งที่เกิดขึ้นจริงไม่ตรงกัน)
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      // กล้องเลื่อน "สวนทาง" เมาส์ ผู้ใช้จึงรู้สึกว่าตัวเองหันไปทางที่ชี้
      xTo(-nx * PAN);
      yTo(-ny * PAN * 0.62);
      ryTo(nx * ROT_Y);
      rxTo(-ny * ROT_X);
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
      data-field-dark={dark ? '' : undefined}
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
            // เงาบนพื้นมืด = ดำบนดำ = ไม่มีอะไรเลย นอกจากค่า compositing ที่ยังจ่ายอยู่
            // (เงาเบลอ 48px บนระนาบ 44 ใบเคยวัดได้ 84fps / 49 เฟรมตก — ราคาของมันจริง)
            // บนพื้นมืดตัวที่แยกการ์ดขาวออกจากกันคือเส้นขอบ 1px ซึ่งเป็นขอบคมพอดี
            // ตรงกับของอ้างอิง ส่วนพื้นสว่างยังต้องพึ่งเงาเพราะขาวบนเทาแทบไม่มีขอบ
            boxShadow: dark || isRoom ? undefined : '0 14px 26px rgba(0,0,0,0.14)',
            // ภาพถ่ายห้องที่มืดบนพื้นมืดคือปัญหาเดียวกับการ์ดขาวบนพื้นสว่าง
            // แค่กลับด้าน — เส้นขอบสว่างทำให้มันยังเป็นสี่เหลี่ยมที่มีขอบ
            // (border-box: รูป h-full w-full อยู่ในกรอบ เส้นจึงไม่ถูกทับ)
            //
            // ใช้ --field-edge (0.45) ไม่ใช่ --field-line (0.2): เส้น 0.2 วัดได้ 1.75:1
            // กับพื้น ซึ่งพึ่งได้ก็ต่อเมื่อภาพถ่ายสว่างพออยู่แล้ว — แต่ถ้าภาพสว่างพอ
            // มันก็ไม่ต้องการเส้นตั้งแต่แรก เส้นนี้มีไว้สำหรับใบที่มืด จึงต้องเข้ม
            // พอที่จะทำงานในกรณีที่มันถูกเรียกใช้จริง (4.5:1)
            border: dark && isRoom ? '1px solid var(--field-edge)' : undefined,
          };

          const image = (
            /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่หน้าอื่นใช้ */
            <img
              src={plane.src}
              alt={alt}
              // ── ห้ามใช้ `lazy` กับระนาบในสนาม ────────────────────────────
              //
              // ระนาบทุกใบอยู่ใน container ที่มี 3D transform เบราว์เซอร์ไม่นับว่า
              // มันอยู่ใน viewport จึง **ไม่โหลดเลย** และ `.complete` ค้างเป็น false
              // ตลอดกาล ตัวเลขความคืบหน้าของประตูหารด้วยจำนวนรูปทั้งหมด อัตราส่วน
              // จึงแตะ 1 ไม่ได้ เปอร์เซ็นต์ค้างที่ 97 และเงื่อนไข "โหลดเสร็จ" ไม่เคยจริง
              // (เดิม i >= 12 เป็น lazy — คือระนาบส่วนใหญ่ของสนาม)
              //
              // ระนาบในสนามคือเนื้อหาของประตู ไม่ใช่ของใต้จอที่ควรเลื่อน
              // ลำดับคิวยังคุมได้ด้วย fetchPriority ซึ่งไม่โกหกเรื่องการมองเห็น
              loading="eager"
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
                  <span
                    className="max-w-[16rem] truncate bg-base px-2 py-1 text-body-sm text-ink"
                    style={
                      dark
                        ? { background: 'var(--field-ground)', color: 'var(--field-ink)' }
                        : undefined
                    }
                  >
                    {plane.title[lang]}
                  </span>
                  {plane.sub && (
                    <span
                      className="max-w-[16rem] truncate bg-base px-2 py-0.5 text-label uppercase tracking-widest2 text-dim"
                      style={
                        dark
                          ? { background: 'var(--field-ground)', color: 'var(--field-dim)' }
                          : undefined
                      }
                    >
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
