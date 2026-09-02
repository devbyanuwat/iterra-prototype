// ทำให้สินค้าเต็มการ์ด แทนที่จะเป็นจุดเล็ก ๆ กลางกระดาษเปล่า
//
// ── ปัญหา ─────────────────────────────────────────────────────────────────
// ไฟล์สินค้าทุกใบเป็นเฟรมที่คีย์พื้นออกแล้ว และตัวสินค้าลอยอยู่กลางเฟรม
// วัดจากทั้ง 306 เฟรม: เนื้อสินค้ากินพื้นที่ **มัธยฐาน 12.8%** ของเฟรม ต่ำสุด 1.5%
// การ์ดที่เรนเดอร์ด้วย `object-contain` เฉย ๆ จึงเป็นกระดาษเปล่าเป็นส่วนใหญ่
// และก๊อกในนั้นเล็กกว่า padding ของการ์ดเอง
//
// ── ทำไมไม่ต้องวัด DOM ────────────────────────────────────────────────────
// เวอร์ชันแรกของท่านี้ (DepthField) วัดกล่องการ์ดเป็น px ตอนรันไทม์ ซึ่งบังคับให้
// ต้องรู้ขนาดจริงก่อนถึงจะคำนวณได้ แต่คณิตศาสตร์ทั้งชุดเป็นเชิงเส้นกับขนาดการ์ด
// ถ้ารู้ **สัดส่วน** ของการ์ดก็พอ ทุกอย่างคิดในหน่วย "เท่าของความกว้างการ์ด" ได้
// ผลลัพธ์เป็น transform ที่ใช้ % ล้วน จึงคำนวณได้ตั้งแต่ฝั่ง server:
// ไม่มี canvas ไม่มีการอ่าน layout ไม่มี CLS และไม่มีเฟรมไหนที่ของยังไม่เข้าที่
//
// ── ครอปไม่ได้โดยโครงสร้าง ────────────────────────────────────────────────
// s ถูกเลือกเป็น min ของสองแกน กรอบหมึกหลังขยายจึงกินพื้นที่ = target พอดีในแกนที่
// คับกว่า และน้อยกว่านั้นในอีกแกน — ขอบหมึกไม่มีทางเลยขอบการ์ด
// (และวัดแล้วว่าไม่มีเฟรมไหนที่กรอบหมึกเกิน 70.8% ของเฟรม เคสที่ "เต็มอยู่แล้ว
//  แล้วขยายจนโดนตัด" จึงไม่มีอยู่จริงในแคตตาล็อกนี้)

import { productInk, type ProductInk } from './product-ink.generated';

/**
 * สัดส่วนที่เนื้อสินค้าควรกินของการ์ดในแกนที่คับกว่า
 *
 * 0.78 ไม่ใช่ 0.82 แบบในสนามภาพ: การ์ดในกริดมีชื่อสินค้าอยู่ใต้กรอบและมีเส้นขอบ
 * ของตัวเอง เนื้อที่ชนขอบพอดีอ่านเป็น "ภาพถูกครอป" ไม่ใช่ "ภาพเต็มกรอบ"
 * ส่วนสนามภาพเป็นระนาบลอยเดี่ยวบนพื้นดำ ชนขอบได้โดยไม่มีอะไรให้เทียบ
 */
export const CARD_INK_TARGET = 0.78;

/**
 * เพดานการขยาย
 *
 * ไม่ได้ตั้งไว้กันครอป (ครอปไม่ได้อยู่แล้ว) แต่กันความคมหาย: เฟรมต้นทางกว้าง 700px
 * ขยาย 3 เท่าแปลว่าเหลือเนื้อภาพจริงราว 233px มาวางบนการ์ด ~340px ซึ่งเริ่มนุ่ม
 * ที่ 2x DPR ใบที่หมึกเล็กสุด (กรอบ 5% ของเฟรม) จึงไม่ได้ขยายจนเต็ม target
 * แต่ก็ยังใหญ่กว่าเดิมหลายเท่า
 */
export const INK_MAX_SCALE = 3;

/** `/products/<slug>/<CODE>.webp` หรือ `-700.webp` → คีย์ในตารางหมึก */
export function inkFor(imagePath: string | undefined): ProductInk | undefined {
  if (!imagePath) return undefined;
  return productInk[imagePath.replace(/^\/products\//, '').replace(/(-700)?\.webp$/, '')];
}

/**
 * transform ที่ขยายและเลื่อนเนื้อสินค้าให้มาอยู่กลางการ์ดและเต็มการ์ด
 *
 * @param ink        เรคคอร์ดจาก inkFor()
 * @param cardAspect สัดส่วนของ **กล่องที่รูปอยู่** (กว้าง/สูง) เช่น 4/5
 * @param target     ให้เนื้อกินพื้นที่เท่าไรในแกนที่คับกว่า
 *
 * คืน undefined เมื่อไม่มีข้อมูลหรือคำนวณแล้วไม่ต้องขยับ — ผู้เรียกจะได้
 * ไม่ต้องใส่ transform เปล่า ๆ ที่สร้าง compositing layer ฟรี ๆ
 *
 * `translate(...) scale(...)` โดย transform-origin อยู่กลางกล่อง แปลว่าจุด p
 * ถูกส่งไป C + s·(p + t − C) อยากให้จุดกึ่งกลางของกรอบหมึก B ไปอยู่ที่ C พอดี
 * จึงได้ t = C − B ตรง ๆ (ถ้าสลับเป็น `scale() translate()` ค่า t จะถูกคูณด้วย s
 * แล้วเลื่อนเกินทุกครั้ง)
 */
export function inkFitStyle(
  ink: ProductInk | undefined,
  cardAspect: number,
  target: number = CARD_INK_TARGET,
): string | undefined {
  if (!ink || !cardAspect) return undefined;
  const [bx, by, bw, bh, ratio] = ink;
  if (!ratio || bw <= 0 || bh <= 0) return undefined;

  // คิดในหน่วย "เท่าของความกว้างการ์ด": กว้าง = 1, สูง = 1/cardAspect
  const cardH = 1 / cardAspect;

  // object-contain: ย่อภาพให้พอดีกล่องแล้ววางกลาง
  const scale = Math.min(1 / ratio, cardH);
  const paintedW = scale * ratio;
  const paintedH = scale;
  const ox = (1 - paintedW) / 2;
  const oy = (cardH - paintedH) / 2;

  const inkW = bw * paintedW;
  const inkH = bh * paintedH;
  if (inkW <= 0 || inkH <= 0) return undefined;

  const s = Math.min(INK_MAX_SCALE, Math.max(1, Math.min((target * 1) / inkW, (target * cardH) / inkH)));

  // จุดกึ่งกลางกรอบหมึก เทียบกล่องการ์ด
  const inkCx = ox + (bx + bw / 2) * paintedW;
  const inkCy = oy + (by + bh / 2) * paintedH;

  // % ของ translate อ้างอิงขนาดของ element เอง — แกน Y จึงต้องหารด้วยความสูง
  // ของการ์ด (cardH) ไม่ใช่ความกว้าง ไม่งั้นการ์ดที่ไม่ใช่จัตุรัสจะเลื่อนผิดสัดส่วน
  const tx = (0.5 - inkCx) * 100;
  const ty = ((cardH / 2 - inkCy) / cardH) * 100;

  if (s === 1 && Math.abs(tx) < 0.15 && Math.abs(ty) < 0.15) return undefined;
  return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${s.toFixed(3)})`;
}
