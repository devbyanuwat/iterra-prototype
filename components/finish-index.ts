// ดัชนีผิวเคลือบ — โครงนำทางหลักของเว็บ (spec finish-first §2)
//
// เว็บนี้นำทางด้วยผิวเคลือบ ไม่ใช่หมวดสินค้า ดัชนีนี้จึงเป็นแหล่งความจริงเดียว
// ของทั้งกำแพงหน้าแรก (§4.1), หน้า /finish/[code] (§4.2) และแถบสลับเฉด
//
// ไฟล์นี้อยู่ใน components/ ไม่ใช่ lib/ เพราะ task G จำกัดขอบเขตไว้ที่
// app/**, components/**, lib/i18n.ts — lib/products*.ts กำลังถูก vx-worker แก้อยู่
//
// ไม่มี 'use client' — โมดูลนี้เป็นข้อมูลล้วน server component จึง import ได้

import { allProducts, products, type Finish, type Product } from '@/lib/products';
import { KITCHEN_ONLY } from '@/lib/scope';

/** ฐานสีของหน้า — ใช้คำนวณว่าแผงเฉดหนึ่ง ๆ จมหายกับพื้นหรือไม่
 *  พื้นเปลี่ยนเป็น #E5E5E5 แล้ว ทิศทางจึงพลิก: แผงขาวคือตัวที่จมพื้น
 *  แผงดำแยกตัวเองได้สบาย — solver คำนวณสองทางอยู่แล้วจึงพลิกตามเอง */
const BASE = '#E5E5E5';
const INK = '#232323';

/**
 * จำนวนสินค้าต่อเฉดตามสเปก §3 — นับจาก **ทั้งแคตตาล็อก** 182 ตัว
 *
 * นี่คือค่าที่ "ต้องเป็น" ไม่ใช่ค่าที่ "บังเอิญเป็น" AC ข้อ 3 บังคับให้ตรงทั้ง 11 ค่า
 * จึง assert ตอนโหลดโมดูล (ดู assertFinishCounts ท้ายไฟล์) ถ้าข้อมูลถูก generate
 * ใหม่แล้วจำนวนเพี้ยน build จะพังทันทีพร้อมบอกว่าเฉดไหนเพี้ยนไปเท่าไร
 * ดีกว่าปล่อยให้หน้าเฉดแสดงจำนวนผิดเงียบ ๆ
 *
 * ── ตารางนี้ต้องเทียบกับ allProducts ไม่ใช่ products ─────────────────────
 * เว็บแสดงเฉพาะห้องครัวแล้ว (lib/scope.ts) ส่วน `products` ที่หน้าเว็บใช้จึงเป็น
 * ชุดที่กรองแล้ว ถ้าเอาตารางนี้ไปเทียบกับชุดที่กรอง build จะพังทันที — และพังด้วย
 * เหตุผลที่ผิด: มันจะรายงานว่า "ข้อมูลเพี้ยน" ทั้งที่ข้อมูลถูกต้องและเป็นตัวกรอง
 * ที่ทำงานตามที่สั่ง หน้าที่ของตารางนี้คือเฝ้า scraper ไม่ใช่เฝ้าขอบเขตของเว็บ
 * ขอบเขตของเว็บมีตารางของตัวเองอยู่ข้างล่าง
 */
export const EXPECTED_FINISH_COUNTS: Readonly<Record<string, number>> = {
  CP: 74,
  '0': 68,
  BRD: 40,
  BRT: 40,
  AF: 22,
  RGD: 19,
  BN: 14,
  BL: 12,
  '2MB': 7,
  NA: 6,
  BV: 4,
};

/**
 * จำนวนต่อเฉดของ "เว็บที่ผู้อ่านเห็นจริง" — ตอนนี้คือห้องครัวอย่างเดียว
 *
 * แยกจากตารางข้างบนเพราะสองตารางเฝ้าคนละอย่าง: ตารางบนเฝ้าว่า scraper ดึงของมา
 * ครบไหม ตารางนี้เฝ้าว่าตัวกรองขอบเขตยังตัดตรงจุดเดิม ถ้าเอาไปรวมเป็นตารางเดียว
 * จะแยกไม่ออกว่า build ที่พังเกิดจาก scraper เพี้ยนหรือขอบเขตเลื่อน
 *
 * เจ็ดเฉดที่หายไป (BRD BRT AF RGD BN BL 2MB) ไม่ได้หายจากข้อมูล — ของครัวไม่มี
 * ชิ้นไหนสั่งเฉดพวกนั้นได้ พลิก KITCHEN_ONLY กลับ ทั้งสิบเอ็ดเฉดก็กลับมา
 */
const EXPECTED_SCOPED_FINISH_COUNTS: Readonly<Record<string, number>> = KITCHEN_ONLY
  ? { CP: 8, NA: 6, '0': 1, BV: 1 }
  : EXPECTED_FINISH_COUNTS;

export type FinishEntry = {
  code: string;
  name: { th: string; en: string };
  /** ค่าเฉลี่ยสีจากรูป swatch — ค่าของ --accent ตลอดหน้าเฉดนั้น */
  accent: string;
  /** chip 88px — ใช้ในแถวสวอตช์ข้างสินค้า */
  swatch: string;
  /**
   * วัสดุความละเอียดสูง 1400px สำหรับแผงเต็มจอบนกำแพง (§4.1)
   *
   * chip 88px ขยายเป็นแผงสูงเต็มจอแล้วเบลอจนลายเส้นแปรงหาย ซึ่งทำลายทั้งประเด็น
   * ของกำแพง — คนต้องเห็น "วัสดุ" ไม่ใช่ "สี่เหลี่ยมสี" ไฟล์ชุดนี้จึงเป็นของใช้ร่วม
   * ต่อรหัสเฉด ไม่ใช่ของซ้ำต่อสินค้าเหมือน chip
   *
   * รหัส NA: chip ของ Kohler เป็นตัวอักษร "NA" บนพื้นขาว (not applicable)
   * ไม่ใช่วัสดุ ทั้งที่ข้อมูลเราเรียกมันว่า Stainless Steel — ไฟล์วัสดุจึงดึงจาก
   * swatch_ST ของ Kohler แทน
   */
  material: string;
  count: number;
  products: Product[];
};

// ── สร้างดัชนี ────────────────────────────────────────────────────────────
//
// accent/swatch ต่อเฉดคงที่ทั้งแคตตาล็อก (ตรวจแล้ว: ทุกรหัสมี accent ค่าเดียว)
// จึงหยิบจากสินค้าตัวแรกที่พบเฉดนั้นได้โดยไม่ต้องเฉลี่ยซ้ำ

function buildIndex(): FinishEntry[] {
  const byCode = new Map<string, FinishEntry>();

  for (const product of products) {
    // สินค้าชิ้นเดียวไม่ควรถูกนับสองครั้งในเฉดเดียวกัน แม้ข้อมูลจะซ้ำ
    const seen = new Set<string>();
    for (const finish of product.finishes) {
      if (seen.has(finish.code)) continue;
      seen.add(finish.code);

      let entry = byCode.get(finish.code);
      if (!entry) {
        entry = {
          code: finish.code,
          name: finish.name,
          accent: finish.accent,
          swatch: finish.swatch,
          material: `/finishes/${finish.code}.webp`,
          count: 0,
          products: [],
        };
        byCode.set(finish.code, entry);
      }
      entry.count += 1;
      entry.products.push(product);
    }
  }

  // เรียงจากเฉดที่มีของเยอะสุดลงมา ตามลำดับในตาราง §3
  // BRD/BRT เท่ากันที่ 40 — ตัดสินด้วยรหัสให้ลำดับคงที่ทุก build
  return [...byCode.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export const finishIndex: FinishEntry[] = buildIndex();

export const finishCodes: string[] = finishIndex.map((f) => f.code);

const byCode = new Map(finishIndex.map((f) => [f.code, f]));

export function getFinishEntry(code: string): FinishEntry | undefined {
  return byCode.get(code);
}

/** สินค้าทุกตัวที่มีเฉดนี้ — เรียงตาม featured ก่อน แล้วตามลำดับแคตตาล็อก */
export function productsWithFinish(code: string): Product[] {
  return getFinishEntry(code)?.products ?? [];
}

/**
 * ตัว Finish ของสินค้าชิ้นนั้นในเฉดที่ขอ
 *
 * หัวใจของ §4.2: การ์ดบนหน้า /finish/[code] ต้องเรนเดอร์สินค้า **ในเฉดนั้น**
 * ไม่ใช่ finishes[0] — AC ข้อ 2 ตรวจที่ `img src` ไม่ได้ตรวจด้วยสายตา
 */
export function finishOf(product: Product, code: string): Finish | undefined {
  return product.finishes.find((f) => f.code === code);
}

// ── ความสว่าง + scrim ต่อแผง (ความเสี่ยง §6 ข้อ 1) ────────────────────────
//
// แผงขาว (`0` #E7E8EA) กับ Matte Black (`BL` #1F1F21) พังคนละทาง:
//   - แผงขาว: ตัวอักษรครีมบนพื้นเกือบขาว = 1.05:1 อ่านไม่ออก แต่ตัวแผงเด่นชัดบนพื้นดำ
//   - แผงดำ: ตัวอักษรครีมอ่านออกสบาย แต่ตัวแผงเอง 1.2:1 กับพื้น #08090A = แผงหายไป
// ค่า overlay ค่าเดียวรับใช้ทั้งสองไม่ได้ — ตัวที่แก้อันหนึ่งทำอีกอันพังเสมอ
//
// วิธีแก้: ทุกแผงคำนวณ scrim ของตัวเองจากความสว่าง swatch ตัวเอง สองทิศทาง
//   veil = ชั้นมืดใต้ป้าย ไล่แรงขึ้นตามความสว่างของแผง จนครีมได้ contrast >= 7:1
//   lift = ชั้นสว่างบาง ๆ ทั้งแผง เมื่อแผงมืดเกินจนแยกไม่ออกจากพื้น
// แผงขาวจึงได้ veil หนาและ lift = 0 · แผงดำได้ veil = 0 และ lift ที่มองเห็น

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** ความสว่างสัมพัทธ์ตาม WCAG 2.x */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg: string, bg: string, alpha: number): string {
  const f = toRgb(fg);
  const b = toRgb(bg);
  const mix = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * หา alpha ที่น้อยที่สุดของ `veilColor` ที่ทำให้ `ink` อ่านออกบน `field`
 * เดินทีละ 0.01 — 100 รอบต่อเฉด รันตอน build ครั้งเดียว ไม่ใช่ hot path
 */
function solveAlpha(field: string, veilColor: string, ink: string, target: number): number {
  for (let a = 0; a <= 0.9; a += 0.01) {
    if (contrastRatio(blend(veilColor, field, a), ink) >= target) return Math.round(a * 100) / 100;
  }
  return 0.9;
}

export type PanelScrim = {
  /** ความสว่างของแผง 0..1 */
  lum: number;
  /** สีตัวอักษรบนแผง — ครีมเสมอ เพื่อให้กำแพงอ่านเป็นเสียง UI เดียวกัน */
  ink: string;
  /** alpha ของชั้นมืดใต้ป้าย (0 = ไม่ต้องมี) */
  veilAlpha: number;
  /** CSS gradient พร้อมใช้ — โปร่งด้านบน ทึบเต็มที่ในโซนป้ายด้านล่าง */
  veil: string;
  /** alpha ของชั้นสว่างทั้งแผง เมื่อแผงมืดจนจมพื้น (0 = ไม่ต้องมี) */
  liftAlpha: number;
  lift: string;
  /** เส้นขอบผมบางระหว่างแผง — เข้มขึ้นเมื่อแผงใกล้สีพื้น */
  edge: string;
  /** contrast ที่ครีมได้จริงในโซนป้าย ใช้ตรวจ/ดีบัก */
  labelContrast: number;
};

/** contrast เป้าหมายของ micro-caps 10px — ตัวเล็กมาก ใช้เกณฑ์ AAA ไม่ใช่ AA */
const LABEL_TARGET = 7;
/** แผงต้องแยกจากพื้น #08090A ได้ด้วยตาเปล่า */
const PANEL_VS_PAGE_TARGET = 1.6;

/**
 * scrim ของแผงหนึ่ง คำนวณจากสีของแผงนั้นเอง
 *
 * โซนป้ายอยู่ล่างสุด 26% ของแผง และ gradient ทึบเต็มที่ตั้งแต่ 74% ลงไป
 * ป้ายจึงนั่งอยู่บน alpha เต็มเสมอ ไม่ใช่บนช่วงไล่ที่ contrast ยังไม่ถึงเกณฑ์
 */
export function panelScrim(accent: string): PanelScrim {
  const lum = luminance(accent);

  const veilAlpha = solveAlpha(accent, BASE, INK, LABEL_TARGET);
  const veiled = blend(BASE, accent, veilAlpha);

  // แผงที่ contrast กับพื้นต่ำเกินต้องถูกดันให้เห็นเป็นวัตถุ
  // บนพื้นสว่างตัวที่มีปัญหาคือแผงขาว (`0`) ไม่ใช่ Matte Black แล้ว — สูตรเดิม
  // ใช้ได้ทั้งสองทางเพราะวัด contrastRatio ไม่ได้เทียบว่าใครสว่างกว่า
  let liftAlpha = 0;
  if (contrastRatio(accent, BASE) < PANEL_VS_PAGE_TARGET) {
    for (let a = 0.02; a <= 0.3; a += 0.01) {
      if (contrastRatio(blend(INK, accent, a), BASE) >= PANEL_VS_PAGE_TARGET) {
        liftAlpha = Math.round(a * 100) / 100;
        break;
      }
    }
    if (!liftAlpha) liftAlpha = 0.3;
  }

  // ขอบ: แผงมืดแยกตัวเองได้บนพื้นสว่าง แผงสว่างต้องการเส้นช่วย — กลับทางจากธีมเดิม
  const edgeAlpha = Math.round(Math.max(0.06, Math.min(0.28, 0.06 + lum * 0.32)) * 100) / 100;

  // veil/lift ใช้สีของธีมสว่าง: veil = พื้น #E5E5E5 ทาทับให้ ink อ่านออก
  // lift = ink ทาบาง ๆ ให้แผงสว่างแยกจากพื้น (ธีมเดิมกลับกันทั้งคู่)
  return {
    lum,
    ink: INK,
    veilAlpha,
    veil:
      veilAlpha === 0
        ? 'none'
        : `linear-gradient(to bottom, rgba(229,229,229,0) 0%, rgba(229,229,229,${(
            veilAlpha * 0.45
          ).toFixed(2)}) 52%, rgba(229,229,229,${veilAlpha.toFixed(
            2,
          )}) 74%, rgba(229,229,229,${veilAlpha.toFixed(2)}) 100%)`,
    liftAlpha,
    lift: liftAlpha === 0 ? 'none' : `rgba(35,35,35,${liftAlpha.toFixed(2)})`,
    edge: `rgba(0,0,0,${edgeAlpha.toFixed(2)})`,
    labelContrast: Math.round(contrastRatio(veiled, INK) * 100) / 100,
  };
}

// ── assertion ─────────────────────────────────────────────────────────────

/**
 * AC ข้อ 3: จำนวนต่อเฉดต้องตรงกับตาราง §3 เป๊ะทั้ง 11 ค่า
 *
 * โยน error ตอนโหลดโมดูล = พังตอน `next build` ไม่ใช่ตอนลูกค้าเปิดดู
 * ข้อความบอกส่วนต่างทุกตัวในครั้งเดียว จะได้ไม่ต้องไล่แก้ทีละรอบ
 */
function compare(
  label: string,
  expected: Readonly<Record<string, number>>,
  actual: Readonly<Record<string, number>>,
): string[] {
  const problems: string[] = [];
  for (const code of Object.keys(expected)) {
    if (!(code in actual)) problems.push(`${label} ${code}: หายไปจากข้อมูล`);
  }
  for (const code of Object.keys(actual)) {
    if (!(code in expected)) problems.push(`${label} ${code}: เฉดใหม่ที่ไม่มีในตาราง`);
  }
  for (const [code, want] of Object.entries(expected)) {
    const got = actual[code];
    if (got !== undefined && got !== want) {
      problems.push(`${label} ${code}: ตารางบอก ${want} แต่ข้อมูลมี ${got}`);
    }
  }
  return problems;
}

/** นับสินค้าต่อรหัสเฉดจากรายการที่ให้มา */
function countByFinish(list: readonly Product[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const product of list) {
    for (const finish of product.finishes) out[finish.code] = (out[finish.code] ?? 0) + 1;
  }
  return out;
}

export function assertFinishCounts(): void {
  const problems = [
    // สเปก §3 เทียบกับทั้งแคตตาล็อก — เฝ้า scraper
    ...compare('[สเปก §3]', EXPECTED_FINISH_COUNTS, countByFinish(allProducts)),
    // ตารางขอบเขตเทียบกับสิ่งที่หน้าเว็บใช้จริง — เฝ้าตัวกรองห้อง
    ...compare(
      '[ขอบเขต]',
      EXPECTED_SCOPED_FINISH_COUNTS,
      Object.fromEntries(finishIndex.map((f) => [f.code, f.count])),
    ),
  ];

  if (problems.length) {
    throw new Error(
      `[finish-index] จำนวนสินค้าต่อเฉดไม่ตรงกับตารางที่ประกาศไว้ (AC ข้อ 3):\n  ${problems.join('\n  ')}`,
    );
  }
}

assertFinishCounts();
