// ตัวกรองของหน้าสินค้า — สร้างจากข้อมูลที่มีจริงเท่านั้น
//
// lib/products.generated.ts มีฟิลด์ที่ใช้กรองได้ตรง ๆ อยู่สองอย่าง: category
// (kitchen 16 / bath 166) กับ finishes[] (11 รหัส) ส่วน "ประเภทสินค้า" ไม่มีเป็น
// ฟิลด์ จึงต้องอนุมานจากชื่อไทย/อังกฤษ แล้วค่อยตกไปที่สเปกกับคำอธิบายถ้าชื่อเป็น
// รหัสรุ่นล้วน (มีห้าตัวที่ชื่อคือ "K-17652X" เฉย ๆ)
//
// สิ่งที่ตั้งใจไม่ทำเป็นตัวกรอง เพราะข้อมูลไม่พอ:
//   - คอลเลกชัน   162/182 ชิ้นมีค่า แต่มี 59 ค่า และ 33 ค่ามีสินค้า ≤2 ชิ้น
//   - การติดตั้ง   85/182 เท่านั้น และค่าซ้ำซ้อนกันเอง (แบบติดผนัง 28 / ติดผนัง 1)
//   - วัสดุ        45/182
//   - ราคา         ทุกชิ้นเป็น "สอบถามราคา" ค่าเดียว
//   - อ่างอาบน้ำ   แคตตาล็อกไทยไม่มีอ่างอาบน้ำสักตัว มีแต่ก๊อกลงอ่าง
//
// ลำดับกฎสำคัญ: ก๊อกครัวต้องมาก่ออ่างล้างจาน (ชื่อมีคำว่า "อ่างล้างจาน" ทั้งคู่)
// และก๊อกลงอ่างอาบน้ำต้องมาก่อนฝักบัว (หลายรุ่นมีฝักบัวสายอ่อนอยู่ในชื่อ)

import type { Product } from '@/lib/products';

export type ProductType =
  | 'kitchen-sink'
  | 'kitchen-faucet'
  | 'basin'
  | 'basin-faucet'
  | 'bath-faucet'
  | 'shower'
  | 'shower-valve'
  | 'toilet'
  | 'bidet-seat'
  | 'other';

const RULES: [ProductType, RegExp][] = [
  ['kitchen-faucet', /ก๊อก[^"]*อ่างล้างจาน|ก๊อกครัว|kitchen (sink )?faucet/i],
  ['kitchen-sink', /อ่างล้างจาน|kitchen sink/i],
  ['bidet-seat', /ฝารองนั่ง|ฝาปิดอัตโนมัติ|bidet seat/i],
  ['toilet', /สุขภัณฑ์|โถปัสสาวะ|\btoilet\b|urinal|water closet|1pc|one-?piece/i],
  ['shower-valve', /วาล์ว|วาลว์|ฝาครอบ|เทอร์โมสแตท|thermostatic|\bvalve\b|\btrim\b/i],
  ['bath-faucet', /ลงอ่างอาบ|ลงอ่างและยืนอาบ|ลงอ่าง|อ่างอาบน้ำแบบติดผนัง|bath filler|tub filler/i],
  ['shower', /ฝักบัว|ยืนอาบ|เรนชาวเวอร์|slide ?bar|shower|rainhead|handshower/i],
  ['basin-faucet', /ก๊อก|หัวก๊อก|มือบิด|ก้านโยก|faucet|spout|handle/i],
  ['basin', /อ่างล้างหน้า|ขารองอ่าง|lavatory|basin|pedestal/i],
];

/** ประเภทของสินค้าหนึ่งชิ้น — คืน 'other' เมื่ออนุมานไม่ได้จริง ๆ (5 ชิ้นจาก 182) */
export function productType(p: Product): ProductType {
  const name = `${p.name.th} ${p.name.en}`;
  for (const [key, re] of RULES) if (re.test(name)) return key;
  const fallback = `${p.specs.map((s) => `${s.label}=${s.value}`).join(' ')} ${p.desc.th}`;
  for (const [key, re] of RULES) if (re.test(fallback)) return key;
  return 'other';
}

export const TYPE_LABELS: Record<ProductType, { th: string; en: string }> = {
  'kitchen-sink': { th: 'อ่างล้างจาน', en: 'Kitchen sinks' },
  'kitchen-faucet': { th: 'ก๊อกครัว', en: 'Kitchen faucets' },
  basin: { th: 'อ่างล้างหน้า', en: 'Basins' },
  'basin-faucet': { th: 'ก๊อกอ่างล้างหน้า', en: 'Basin faucets' },
  'bath-faucet': { th: 'ก๊อกลงอ่างอาบน้ำ', en: 'Bath fillers' },
  shower: { th: 'ฝักบัวและชุดยืนอาบ', en: 'Showers' },
  'shower-valve': { th: 'วาล์วและฝาครอบ', en: 'Valves & trims' },
  toilet: { th: 'สุขภัณฑ์', en: 'Toilets' },
  'bidet-seat': { th: 'ฝารองนั่งอัตโนมัติ', en: 'Bidet seats' },
  other: { th: 'อื่น ๆ', en: 'Other' },
};

/** ลำดับที่แสดงในแถบตัวกรอง — เรียงตามจำนวนจริงมาก→น้อย, 'other' ปิดท้ายเสมอ */
export const TYPE_ORDER: ProductType[] = [
  'basin-faucet',
  'bath-faucet',
  'basin',
  'shower-valve',
  'shower',
  'toilet',
  'kitchen-faucet',
  'kitchen-sink',
  'bidet-seat',
  'other',
];
