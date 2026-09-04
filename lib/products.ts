// Product data now comes from the Kohler scrape — see scripts/scrape-kohler.mjs.
// This module stays as the import surface so components keep importing '@/lib/products';
// regenerating the catalogue never touches anything but products.generated.ts.
//
// ── และตอนนี้มันเป็นด่านกรองห้องด้วย ──────────────────────────────────────
// เว็บแสดงเฉพาะห้องครัว (ดู lib/scope.ts) ของห้องน้ำยังอยู่ครบใน
// products.generated.ts ไม่ได้ถูกลบ แค่ไม่ผ่านด่านนี้
//
// กรองที่นี่ที่เดียวแล้วได้ทั้งเว็บ เพราะ 14 ไฟล์ที่ import '@/lib/products'
// ไม่มีไฟล์ไหน import '.generated' ตรง ๆ — รวมถึง generateStaticParams ของ
// /products/[slug] ซึ่งอ่าน `products` ตัวนี้ หน้าห้องน้ำจึงไม่ถูก export ออกมา
// เป็นไฟล์ตั้งแต่แรก ไม่ใช่ถูกซ่อนด้วย CSS
//
// ผลข้างเคียงที่ตั้งใจ: หน้า /finish/<code>/ กับ /gallery/<code>/ สร้างรายชื่อ
// เฉดจาก `products` เหมือนกัน เฉดที่มีแต่ของห้องน้ำจึงหายไปเองโดยไม่ต้องมี
// รายชื่อเฉดซ้ำอีกที่ — เหลือ 4 จาก 11

import { products as allProducts } from './products.generated';
import { allowCategory } from './scope';

export type { Category, Product, Finish, FinishCode } from './products.generated';

/** ของทั้งแคตตาล็อกรวมห้องน้ำ — มีไว้ให้สคริปต์ตรวจสอบ ไม่ใช่ให้หน้าเว็บใช้ */
export { products as allProducts } from './products.generated';

export const products = allProducts.filter((p) => allowCategory(p.category));

export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function relatedProducts(slug: string, n = 3) {
  const cur = getProduct(slug);
  if (!cur) return [];
  return products.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}
