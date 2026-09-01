import type { Metadata } from 'next';
import FinishWall, { type WallPanel } from '@/components/FinishWall';
import HomeContent from '@/components/home/HomeContent';
import { finishIndex, panelScrim } from '@/components/finish-index';
import { WALL_PANEL_PRODUCTS } from '@/components/wall-products';

export const metadata: Metadata = {
  title: 'ITERRA — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม | Premium Kitchen & Bath',
  description:
    'เลือกจากผิวเคลือบ ไม่ใช่จากหมวดสินค้า — โครม ทองแปรง โรสโกลด์ ดำด้าน และอีก 7 เฉด จากแบรนด์ชั้นนำระดับโลก สัมผัสจริงได้ที่โชว์รูม ITERRA กรุงเทพฯ',
  alternates: { canonical: '/' },
};

// scrim คำนวณตอน build ไม่ใช่ตอน render บนเครื่องผู้ใช้ — solveAlpha เดินทีละ 0.01
// สูงสุด 100 รอบต่อเฉด ถูกมากถ้าทำครั้งเดียว แต่ไม่มีเหตุผลให้ทำซ้ำทุกครั้งที่โหลดหน้า
//
// สินค้าบนแผงก็เลือกที่นี่ด้วยเหตุผลเดียวกัน บวกอีกข้อ: lib/products.generated.ts
// หนัก 424KB ถ้า FinishWall (ซึ่งเป็น client component) import เอง ข้อมูลทั้งก้อน
// จะกลายเป็น client chunk ทั้งที่หน้าแรกต้องการแค่ 88 รายการ ส่งมาเป็น props
// ทำให้ HTML พก JSON ก้อนเล็ก ๆ มาแทน และ FinishWall ยังไม่ import products เลย
// (import ที่มีคือ type ซึ่งถูกลบตอนคอมไพล์)
export default function HomePage() {
  const panels: WallPanel[] = finishIndex.map((f) => ({
    code: f.code,
    name: f.name,
    count: f.count,
    material: f.material,
    accent: f.accent,
    scrim: panelScrim(f.accent),
    products: WALL_PANEL_PRODUCTS[f.code] ?? [],
  }));

  // กำแพงยังเป็นจอแรกและยังเป็นตัวนำทางหลักตาม finish-first §4.1 — HomeContent
  // ต่อท้ายเท่านั้น ไม่มีอะไรในนั้นเด่นแข่งกับกำแพงในจอแรก (§4.3 ยังบังคับอยู่)
  // เหตุผลที่ต้องมีของต่อท้าย: หน้าแรกจอเดียวคือข้อร้องเรียนข้อที่สามของลูกค้า
  // สเปก 2026-09-01 §3.3 ตั้งเป้าไว้ที่ ≥ 3.5 จอ
  return (
    <>
      <FinishWall panels={panels} />
      <HomeContent />
    </>
  );
}
