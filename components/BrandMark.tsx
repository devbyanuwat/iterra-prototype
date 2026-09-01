// เครื่องหมายการค้า KOHLER — ไฟล์จริงที่ลูกค้าส่งมา ไม่ใช่ตัวอักษรที่จัด tracking เอง
//
// ── เรื่องขนาด อ่านก่อนแก้ ────────────────────────────────────────────────
// ไฟล์เป็น 261×146 แต่ "หมึก" อยู่แค่ y = 45..100 เท่านั้น (สูง 56px)
// ข้างบนกับข้างล่างเป็นพื้นโปร่งอย่างละ 45px รวมแล้ว 62% ของความสูงเป็นที่ว่าง
//
// ถ้าวาง <img> ตรง ๆ แล้วสั่งความสูง 24px จะได้เวิร์ดมาร์กสูงจริงราว 9px
// ซึ่งเล็กจนอ่านไม่ออก — component นี้จึงรับ "ความสูงของหมึก" เป็นพารามิเตอร์
// แล้วคำนวณสเกลกับระยะเยื้องให้เอง ผู้เรียกไม่ต้องรู้เรื่องขอบเปล่าเลย
//
// ครอบด้วย overflow-hidden แล้วดันรูปขึ้นด้วย margin ลบ แทนการไปครอปไฟล์:
// ไฟล์นี้เป็นของลูกค้า การแก้ asset ต้นทางเป็นเรื่องที่ต้องขออนุญาต ส่วนการครอป
// ด้วย CSS ย้อนกลับได้และไม่แตะของเดิม
//
// ── ความคมที่ 2x ──────────────────────────────────────────────────────────
// ต้นฉบับกว้าง 261px ค่า default height 18 ให้ความกว้างจริง 84px = 3.1 เท่าของ
// ความหนาแน่นที่ 1x และ 1.55 เท่าที่ 2x จึงยังคมโดยไม่ต้องอัปสเกล
// เพดานคือความกว้าง 130px (ครึ่งหนึ่งของต้นฉบับ) ซึ่งเท่ากับ ink height 28
// สูงกว่านั้นจะเริ่มเบลอที่ 2x — ต้องขอไฟล์ใหญ่กว่านี้ ไม่ใช่ยืดไฟล์เดิม

const NATURAL_W = 261;
const NATURAL_H = 146;
/** ขอบโปร่งด้านบน วัดจากช่องอัลฟาของไฟล์จริง */
const INK_TOP = 45;
/** ความสูงของตัวอักษรจริงในไฟล์ */
const INK_H = 56;

/** ink height ที่ทำให้ความกว้างแตะครึ่งหนึ่งของต้นฉบับพอดี — เกินนี้เริ่มไม่คมที่ 2x */
export const BRAND_MAX_INK_HEIGHT = Math.floor(((NATURAL_W / 2) / NATURAL_W) * INK_H);

type Props = {
  /** ความสูงของ "ตัวอักษร" เป็น px ไม่ใช่ความสูงของไฟล์ */
  height?: number;
  /**
   * ชื่อที่ screen reader อ่าน — โลโก้ตัวนี้เป็นลิงก์กลับหน้าแรก จึงต้องมีชื่อเสมอ
   * ส่งค่าว่างได้เฉพาะตอนที่มีข้อความอื่นอธิบายลิงก์อยู่แล้ว
   */
  alt?: string;
  className?: string;
};

export default function BrandMark({ height = 18, alt = 'KOHLER', className = '' }: Props) {
  const scale = height / INK_H;
  const w = NATURAL_W * scale;

  return (
    <span
      className={`block overflow-hidden ${className}`}
      style={{ width: w, height }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */}
      <img
        src="/brand/kohler-logo.png"
        alt={alt}
        width={NATURAL_W}
        height={NATURAL_H}
        decoding="async"
        style={{
          width: w,
          height: NATURAL_H * scale,
          // ดันขอบโปร่งด้านบนออกนอกกรอบ ที่เหลือถูก overflow-hidden ตัดทิ้ง
          marginTop: -INK_TOP * scale,
          display: 'block',
          maxWidth: 'none',
        }}
      />
    </span>
  );
}
