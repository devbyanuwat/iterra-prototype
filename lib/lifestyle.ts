// ── ด่านกรองของคลังภาพไลฟ์สไตล์ ────────────────────────────────────────────
//
// รูปแบบเดียวกับ lib/products.ts: ไฟล์ .generated ถูกเขียนทับทุกครั้งที่ scrape
// กฎ "ไม่เอาห้องน้ำ" จึงอยู่ที่ชั้นหน้าร้าน ไม่ใช่ในข้อมูล (ดู lib/scope.ts)
//
// ภาพห้องน้ำ 158 ใบยังอยู่ในไฟล์ครบ ไม่ได้ถูกลบ แค่ไม่ผ่านด่านนี้
// เหลือ 66 ใบ — ครัว 52 กับที่ไม่ใช่ห้องไหนโดยเฉพาะอีก 14 (หน้าร้าน คน โปรเจกต์)
//
// `pickLifestyle` มีไว้แทนการเขียน lifestyleImages.find(...) ตรง ๆ ทั่วเว็บ:
// เดิมโค้ดหลายที่อ้าง id ของภาพห้องน้ำไว้เป็นค่าคงที่ พอภาพนั้นถูกปิด find จะ
// คืน undefined แล้วหน้าก็พังเงียบ ๆ หรือขึ้นกรอบว่าง ตัวนี้บังคับให้มีตัวสำรอง

import { lifestyleImages as allLifestyleImages, type LifestyleImage } from './lifestyle.generated';
import { allowSpace } from './scope';

export type {
  LifestyleCategory,
  LifestyleSpace,
  LifestyleRendition,
  LifestyleImage,
} from './lifestyle.generated';
export { canFill, lifestyleSrc } from './lifestyle.generated';

/** ทั้งคลังรวมห้องน้ำ — สำหรับสคริปต์ตรวจสอบเท่านั้น */
export { lifestyleImages as allLifestyleImages } from './lifestyle.generated';

export const lifestyleImages = allLifestyleImages.filter((image) => allowSpace(image.space));

export const lifestyleByCategory = (category: LifestyleImage['category']) =>
  lifestyleImages.filter((image) => image.category === category);

/**
 * หาภาพจาก id โดยมีตัวสำรองเสมอ
 *
 * ผู้เรียกส่งรายชื่อ id ตามลำดับความชอบ ได้ใบแรกที่ยังผ่านด่าน ถ้าไม่เหลือสักใบ
 * ค่อยตกไปที่ภาพครัวใบแรกในคลัง — ซึ่งดีกว่ากรอบว่างหรือหน้าพัง
 *
 * คืน null เฉพาะตอนคลังว่างจริง ๆ ซึ่งแปลว่ามีอย่างอื่นพังไปก่อนหน้านี้แล้ว
 */
export function pickLifestyle(...ids: string[]): LifestyleImage | null {
  for (const id of ids) {
    const found = lifestyleImages.find((image) => image.id === id);
    if (found) return found;
  }
  return lifestyleImages[0] ?? null;
}
