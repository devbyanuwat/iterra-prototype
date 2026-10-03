// ── MOCK เพื่อเดโม ──
// สีผิวสินค้าที่เลือกดูได้ในหน้า detail และการ์ดสินค้า
// KOHLER Thailand จำหน่ายสีเดียวต่อรุ่น (ก๊อก = โครเมียมขัดเงา) · สีที่ demo: true เป็นตัวอย่าง ไม่ใช่สินค้าที่มีขาย
// tint = ค่า CSS filter ที่ใส่กับภาพตัดพื้นหลัง (ตัวห่อกำหนด --tint แล้ว Placeholder อ่านไปใช้)
// swatch = สีของจุดสี ใช้สีโลหะจริง ไม่ใช่ theme token (ข้อยกเว้นเฉพาะจุดสี)

import type { Product } from './products';

export type Finish = {
  id: string;
  name: { th: string; en: string };
  swatch: string;
  tint: string; // '' = ไม่ปรับสี
  demo?: boolean;
};

export const FAUCET: Finish[] = [
  {
    id: 'chrome',
    name: { th: 'โครเมียมขัดเงา', en: 'Polished Chrome' },
    swatch: 'linear-gradient(135deg, #f4f4f2, #b9bcc0 55%, #e6e7e8)',
    tint: '',
  },
  {
    id: 'black',
    name: { th: 'ดำด้าน', en: 'Matte Black' },
    swatch: '#2b2a29',
    tint: 'brightness(.38) contrast(1.15) saturate(0)',
    demo: true,
  },
  {
    id: 'brass',
    name: { th: 'ทองเหลืองแปรง', en: 'Brushed Brass' },
    swatch: 'linear-gradient(135deg, #d9bd84, #a8843f)',
    tint: 'sepia(1) saturate(1.3) hue-rotate(-4deg) brightness(.88) contrast(.95)',
    demo: true,
  },
  {
    id: 'steel',
    name: { th: 'สเตนเลสแปรง', en: 'Brushed Stainless' },
    swatch: 'linear-gradient(135deg, #cfd0cc, #8f918d)',
    tint: 'saturate(0) brightness(.82) contrast(.9)',
    demo: true,
  },
];

const STAINLESS: Finish = {
  id: 'stainless',
  name: { th: 'สเตนเลสสตีล', en: 'Stainless Steel' },
  swatch: 'linear-gradient(135deg, #e3e4e1, #a9aba7)',
  tint: '',
};
const WHITE: Finish = { id: 'white', name: { th: 'ขาว', en: 'White' }, swatch: '#f7f6f3', tint: '' };

// ก๊อก = 4 สี (ตัวแรกคือของจริง) · ซิงก์ = สีจริงสีเดียว
export function finishesFor(product: Product): Finish[] {
  if (product.category === 'faucet') return FAUCET;
  return [product.material === 'castIron' ? WHITE : STAINLESS];
}
