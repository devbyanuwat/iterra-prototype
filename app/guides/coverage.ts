// ภาษาอังกฤษของคู่มือ มีเท่าไหร่จริง ๆ (task C1)
//
// หน้าไทยกับหน้าอังกฤษของ kohler.co.th ไม่ใช่คำแปลของกันและกัน — คนละชุดหมวด
// คนละจำนวน (ดู scratchpad/task-b1.md §English) ตัวเก็บข้อมูลจึงจับคู่ด้วย id ของ
// ไฟล์ภาพ แล้วติดธง `enAvailable: false` ไว้กับบล็อกที่ฉบับอังกฤษไม่มี พร้อมกับ
// ตกค่า en กลับไปเป็นข้อความไทย
//
// ไฟล์นี้คือการนับธงพวกนั้น เพื่อให้หน้าเว็บ "บอก" ช่องว่างได้ ไม่ใช่กลืนมันลงไป
// เงียบ ๆ — หน้าที่ครึ่งหนึ่งเป็นไทยในเอกสารที่ประกาศ lang="en" ต้องประกาศตัว

import type { Guide } from '@/lib/guides.generated';

export type Coverage = {
  /** หมวด + ตัวเลือก ทั้งหมดในคู่มือนี้ */
  total: number;
  /** จำนวนบล็อกที่ฉบับอังกฤษของต้นทางไม่มี */
  missing: number;
  /** total − missing */
  withEn: number;
};

export function coverageOf(guide: Guide): Coverage {
  let total = 0;
  let missing = 0;
  for (const section of guide.sections) {
    total += 1;
    if (!section.enAvailable) missing += 1;
    for (const option of section.options) {
      total += 1;
      if (!option.enAvailable) missing += 1;
    }
  }
  return { total, missing, withEn: total - missing };
}

/**
 * หมวดสินค้าของเราที่ใกล้เคียงกับคู่มือนี้
 *
 * คู่มือพูดถึงแคตตาล็อกของ kohler.co.th ทั้งก้อน ส่วนเรามีของ 182 ชิ้น ปุ่มปิดหน้า
 * จึงพาไปที่กริดของเราที่กรองหมวดไว้แล้ว ไม่ใช่พาไปที่ลิงก์ filter ของต้นทาง
 * ('commercial' ไม่ตรงกับหมวดไหนของเรา — ปล่อยไปหน้ารวม)
 */
export function catFor(slug: string): 'kitchen' | 'bath' | undefined {
  if (slug.startsWith('kitchen-')) return 'kitchen';
  if (slug === 'commercial') return undefined;
  return 'bath';
}
