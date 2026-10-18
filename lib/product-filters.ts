// ส่วนที่ไม่มีข้อมูลสินค้า: type และฟังก์ชันกรอง · component ฝั่ง client import จากไฟล์นี้ได้ (lib/products.ts มีข้อมูลตั้งต้นทั้งชุด ห้ามเข้า bundle)

// หมวดและวัสดุผู้ดูแลระบบเพิ่มเองได้ในหลังบ้าน จึงเป็น string ไม่ใช่ชุดค่าตายตัว
export type Category = string;

export type Product = {
  slug: string; // ตรงกับ slug บน kohler.co.th
  category: Category;
  brand: string;
  series: string; // ซีรีส์ของ Kohler (ProductBrandName)
  material?: string; // key ในตาราง materials · ไม่มี = ไม่ระบุวัสดุ (Kumin 99480T)
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  price: { th: string; en: string };
  featured?: boolean;
  images: string[];
  scenes?: string[];
};

export function relatedProducts(list: Product[], slug: string, n = 3) {
  const cur = list.find((p) => p.slug === slug);
  if (!cur) return [];
  return list.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}

// ── ตัวกรองหน้าสินค้ารวม ──
export type FacetKey = 'category' | 'series' | 'material' | 'brand';
export type Picked = Record<FacetKey, string[]>;
export const FACETS: FacetKey[] = ['category', 'series', 'material', 'brand'];
// ตัวกรองย่อยที่แสดงหลังเลือกหมวดแล้ว · แบรนด์แสดงเฉพาะหมวดที่มีหลายผู้ผลิต
export const SUB_FACETS = (multiBrand: boolean): FacetKey[] => (multiBrand ? ['series', 'material', 'brand'] : ['series', 'material']);

// ค่าที่มีในกลุ่มพร้อมจำนวน นับเฉพาะสินค้าในหมวดที่เลือก
export function facetOptions(list: Product[], category: Category, k: FacetKey): [string, number][] {
  const counts = new Map<string, number>();
  for (const p of list) {
    const v = p[k];
    if (p.category === category && v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts);
}

// ในกลุ่มเดียวกัน = หรือ · ข้ามกลุ่ม = และ · กลุ่มที่ไม่ได้เลือก = ไม่กรอง · สินค้าที่ไม่มีค่าในกลุ่มที่เลือก = ไม่ผ่าน
export function filterProducts(list: Product[], picked: Picked): Product[] {
  return list.filter((p) => FACETS.every((k) => picked[k].length === 0 || picked[k].includes(p[k] ?? '')));
}
