// สินค้าที่ลอยอยู่บนแผงกำแพง และชุดเดียวกันที่ preloader เอาไปทำแกลเลอรี
// (spec 2026-09-01-products-as-motion §2 + §3)
//
// ทำไมสองหน้าจอต้องใช้โมดูลเดียวกัน:
// AC ข้อ 2 บังคับว่า "รูปในแกลเลอรีต้องเป็นชุดที่หน้าถัดไปจะใช้อยู่แล้ว" ไม่งั้น
// หน้าโหลดกลายเป็นตัวเพิ่มงานโหลด ซึ่งย้อนแย้งในตัวเอง วิธีที่รับประกันได้จริง
// ไม่ใช่ "เลือกให้คล้าย ๆ กัน" แต่คือให้ทั้งสองฝั่งเรียกฟังก์ชันเดียวกันบนข้อมูลเดียวกัน
// URL จึงตรงกันแบบตัวต่อตัว เบราว์เซอร์เห็นเป็น cache entry เดียว
//
// ไฟล์นี้เป็นข้อมูลล้วน ไม่มี 'use client' — app/page.tsx (server) import ตรง ๆ ได้
// ส่วน Preloader ซึ่งอยู่ใน layout จะ import แบบ dynamic (ดูเหตุผลในไฟล์นั้น)

import { finishIndex, finishOf, type FinishEntry } from './finish-index';
import type { Product } from '@/lib/products';

/** จำนวนชิ้นที่เตรียมไว้ต่อแผง — พอให้ hover วนดูได้ ~11 วินาทีที่ 1.4s/ชิ้น */
const PER_PANEL = 8;

export type PanelProduct = {
  slug: string;
  model: string;
  name: { th: string; en: string };
  finishName: { th: string; en: string };
  /**
   * ไฟล์ 700px ของ "เฉดนั้น" ไม่ใช่ finishes[0]
   *
   * 700 ไม่ใช่ 1400 ตามความเสี่ยง §5 ข้อ 3: แผงตอนไม่ active กว้างราว 129px
   * ตอน active ก็ยังไม่ถึง 300px ไฟล์ 1400 จึงเป็นการดาวน์โหลดเปล่า ๆ 11 ครั้ง
   * ก่อนผู้ใช้จะได้เห็นอะไรเลย (image700 เท่ากับ image เมื่อไม่มีไฟล์ครึ่งขนาด
   * ซึ่งเป็นค่าที่ถูกอยู่แล้ว ไม่ต้องเดาชื่อไฟล์เอง)
   */
  src: string;
};

/** featured ก่อน แล้วตามลำดับแคตตาล็อก — sort เสถียรใน V8 ลำดับที่เหลือคงเดิม */
function ordered(entry: FinishEntry): Product[] {
  return [...entry.products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}

function toPanelProduct(product: Product, code: string, entry: FinishEntry): PanelProduct | null {
  const finish = finishOf(product, code);
  // เข้าไม่ถึงในทางปฏิบัติ — entry.products สร้างมาจากเฉดนี้อยู่แล้ว
  // แต่คืน null ดีกว่า non-null assertion ที่จะพังเงียบถ้าข้อมูลถูก generate ใหม่
  if (!finish) return null;
  return {
    slug: product.slug,
    model: product.model,
    name: product.name,
    finishName: entry.name,
    src: finish.image700 || finish.image,
  };
}

/**
 * สินค้าต่อแผง เรียงคงที่ทุก build
 *
 * รอบแรกเลือก "ตัวชูโรง" ของแต่ละแผงโดยเลี่ยงสินค้าที่แผงก่อนหน้าใช้ไปแล้ว
 * สินค้าหนึ่งชิ้นมีได้หลายเฉด ถ้าไม่กันไว้ แกลเลอรีของ preloader จะได้ก๊อกตัวเดียวกัน
 * ซ้ำสามใบในสามสี ซึ่งอ่านว่า "ของน้อย" ทั้งที่แคตตาล็อกมี 182 ชิ้น
 */
function build(): Record<string, PanelProduct[]> {
  const lists = new Map(finishIndex.map((e) => [e.code, ordered(e)]));
  const leadUsed = new Set<string>();
  const out: Record<string, PanelProduct[]> = {};

  for (const entry of finishIndex) {
    const list = lists.get(entry.code) ?? [];
    const lead = list.find((p) => !leadUsed.has(p.slug)) ?? list[0];
    if (lead) leadUsed.add(lead.slug);

    // ตัวชูโรงมาก่อนเสมอ ที่เหลือตามลำดับเดิมโดยไม่ซ้ำตัวชูโรง
    const rest = lead ? list.filter((p) => p.slug !== lead.slug) : list;
    const chosen = (lead ? [lead, ...rest] : rest).slice(0, PER_PANEL);

    out[entry.code] = chosen.flatMap((p) => {
      const item = toPanelProduct(p, entry.code, entry);
      return item ? [item] : [];
    });
  }
  return out;
}

export const WALL_PANEL_PRODUCTS: Readonly<Record<string, PanelProduct[]>> = build();

/**
 * แกลเลอรีของ preloader = รูปแรกของทุกแผง
 *
 * ได้ 11 ชิ้นจาก 11 เฉดต่างกันโดยอัตโนมัติ ผ่าน AC ข้อ 1 (≥10 ชิ้น ≥4 เฉด) พอดี
 * และทุกใบคือรูปที่กำแพงจะแสดงทันทีที่ประตูเปิด จึงผ่าน AC ข้อ 2 โดยนิยาม
 */
export function galleryItems(): PanelProduct[] {
  return finishIndex.flatMap((e) => {
    const first = WALL_PANEL_PRODUCTS[e.code]?.[0];
    return first ? [first] : [];
  });
}
