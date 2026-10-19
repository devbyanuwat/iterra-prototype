// ร่างสินค้าจากหลังบ้านเป็นสินค้าแบบที่หน้าเว็บใช้: โหมดดูร่างฝั่ง server และแผงแก้ไขในเบราว์เซอร์ใช้ตัวเดียวกัน
// เป็น .mjs เพราะ lib/server/products.ts import ค่าข้ามไฟล์ต้องรันด้วย Node ตรง ๆ ได้ (scripts/check-db.mjs) และ tsconfig ไม่เปิด .ts extension

/**
 * @param {import('./product-filters').Product} base ฉบับที่ขึ้นเว็บ ให้ราคาและภาพบรรยากาศที่ฟอร์มยังไม่มีช่อง
 * @param {import('./server/products').ProductDraft} d
 * @param {string} brand ชื่อแบรนด์ของ d.brandId
 * @returns {import('./product-filters').Product}
 */
export function applyDraft(base, d, brand) {
  // สเปกที่ยังพิมพ์ไม่ครบ (ไม่มี :) ข้ามไปก่อน · ร่างที่บันทึกแล้วผ่านการตรวจมาแล้ว
  const specs = String(d.specs ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.indexOf(':') > 0)
    .map((l) => ({ label: l.slice(0, l.indexOf(':')).trim(), value: l.slice(l.indexOf(':') + 1).trim() }));
  const { material: _m, ...rest } = base;
  return {
    ...rest,
    slug: d.slug || base.slug,
    category: d.category,
    brand,
    series: d.series,
    ...(d.material ? { material: d.material } : {}),
    name: { th: d.th, en: d.en || d.th },
    desc: { th: d.descTh, en: d.descEn },
    specs,
    featured: d.featured,
    images: d.images,
  };
}
