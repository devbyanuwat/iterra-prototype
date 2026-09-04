// รูปของหน้าไอเดีย + การจับคู่กับบทความที่เรามีเอง (task C1)
//
// ต่างจากคู่มือเลือกซื้อตรงที่ id ของไอเดียทั้ง 17 ใบอยู่ในคลังไลฟ์สไตล์ครบ
// ไม่ต้องถามคลังไทล์ (ตรวจแล้ว: 17/17 อยู่ใน lib/lifestyle.generated.ts)

import { lifestyleImages } from '@/lib/lifestyle';
import { posts } from '@/lib/editorial';

export type Picture = { src: string; srcSet: string; width: number; height: number };

export function ideaPicture(id: string | null | undefined): Picture | undefined {
  if (!id) return undefined;
  const image = lifestyleImages.find((item) => item.id === id);
  if (!image) return undefined;
  return {
    src: image.src.w900,
    srcSet: image.sources.map((s) => `${s.src} ${s.width}w`).join(', '),
    width: image.width,
    height: image.height,
  };
}

/**
 * บทความของเราเองที่ตรงกับการ์ดใบนี้ — ถ้ามี
 *
 * จับคู่ด้วย `source.route` ของ lib/posts.ts ตรง ๆ ไม่ใช่ตัดสตริง slug:
 * ต้นทางตั้งชื่อไฟล์ไม่สม่ำเสมอ (บางชิ้นลงท้าย `-article` และมีชิ้นหนึ่งสะกดผิด
 * เป็น `-artilcle`) การเดาจาก slug จึงพลาดเงียบ ๆ ส่วน `source.route` คือ URL
 * ต้นทางที่ตัวบทความเองบันทึกไว้ เป็นคีย์เดียวกับที่ไอเดียใช้ลิงก์
 * ตรงกัน 6 จาก 17 ใบ ที่เหลือลิงก์ออกไปต้นฉบับ
 */
export function localPostFor(href: string) {
  return posts.find((post) => post.source.route === href);
}
