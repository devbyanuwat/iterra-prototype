// ชุดระนาบของสนามภาพ "เฉพาะเฉดเดียว" (task B2 ข้อ 2)
//
// ทำไมไม่ใช่ galleryPlanes ตัวเดิม: galleryPlanes วนเฉดทีละรอบและกันของซ้ำด้วย
// `seen` สินค้าหนึ่งชิ้นจึงโผล่ในสนามได้เฉดเดียว ผลคือ CP ซึ่งมีของจริง 74 ชิ้น
// จะเหลืออยู่ในชุดนั้นราวสิบชิ้น — กรองทีหลังไม่ได้ ต้องเลือกด้วยกติกาคนละข้อ
// ตั้งแต่ต้น: "ทุกชิ้นที่มีเฉดนี้ เรนเดอร์ในเฉดนี้" ซึ่งเป็นกติกาเดียวกับหน้า
// /finish/[code] ไม่ใช่ของ /gallery
//
// ทำไมอยู่ที่นี่ ไม่ใช่ใน components/depth-field.ts ซึ่งเป็นบ้านของ galleryPlanes:
// ไฟล์นั้นอยู่นอกขอบเขตของงานนี้ (อีกเซสชันถืออยู่) ทุกอย่างที่เป็นข้อตกลงร่วม —
// รูปแบบ id, การใช้ image700, `?finish=` ที่ ProductDetail ต่อสายไว้, trailing
// slash — ถูกลอกมาให้ตรงกันเป๊ะ ๆ และควรถูกยุบรวมกลับเข้าไฟล์นั้นเมื่อมันว่าง
//
// ไม่มี 'use client': หน้าที่เรียกเป็น server component และ lib/products หนัก
// 424KB — เหตุผลเดียวกับที่ depth-field.ts เป็นข้อมูลล้วน

import { finishOf, getFinishEntry } from '@/components/finish-index';
import { FIELD_PLANES, GALLERY_PLANES, type FieldPlane, type IndexItem } from '@/components/depth-field';

export function finishPlanes(
  code: string,
  limit = GALLERY_PLANES,
): { planes: FieldPlane[]; index: IndexItem[] } {
  const entry = getFinishEntry(code);
  if (!entry) return { planes: [], index: [] };

  const planes: FieldPlane[] = [];
  const index: IndexItem[] = [];

  // ชิ้นชูโรงก่อน แล้วตามลำดับแคตตาล็อก — sort เสถียรใน V8 ลำดับที่เหลือคงเดิม
  // (ท่าเดียวกับ galleryPlanes และ HomeContent.FEATURED)
  const list = [...entry.products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

  for (const product of list) {
    if (planes.length >= limit) break;
    const finish = finishOf(product, entry.code);
    // เข้าไม่ถึงในทางปฏิบัติ — entry.products สร้างจากเฉดนี้อยู่แล้ว
    if (!finish) continue;

    // image700 เท่ากับ image เมื่อไม่มีไฟล์ครึ่งขนาด ซึ่งเป็นค่าที่ถูกอยู่แล้ว
    const src = finish.image700 || finish.image;
    const alt = {
      th: `${product.name.th} — ${finish.name.th}`,
      en: `${product.name.en} — ${finish.name.en}`,
    };
    // trailing slash บังคับ: next.config ตั้ง trailingSlash: true
    const href = `/products/${product.slug}/?finish=${encodeURIComponent(finish.code)}`;

    planes.push({
      id: `${product.slug}-${finish.code}`,
      src,
      alt,
      kind: 'product',
      href,
      title: product.name,
      sub: finish.name,
      model: product.model,
    });
    // ดัชนีสร้างจากลูปเดียวกัน ไม่ใช่ derive ทีหลัง — "ทางออก" ต้องเป็นทางออกของ
    // สิ่งที่อยู่ในสนามจริง ๆ ชิ้นต่อชิ้น
    index.push({
      slug: product.slug,
      model: product.model,
      name: product.name,
      finishName: finish.name,
      src,
      href,
      alt,
    });
  }

  // สนามได้ 18 ใบแรก ดัชนีได้ทั้งชุด (task D1) — เหตุผลเต็มอยู่ที่ FIELD_PLANES
  // ใน components/depth-field.ts: 48 ใบไม่มีทางอยู่ในกล่องเดียวโดยยังกดทีละชิ้นได้
  return { planes: planes.slice(0, FIELD_PLANES), index };
}
