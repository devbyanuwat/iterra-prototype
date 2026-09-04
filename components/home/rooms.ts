// เลือกภาพห้องจริงจากคลัง lifestyle ให้ route ที่ขายของ (task A2)
//
// เรามีภาพห้อง 88 ใบ แต่หน้าที่ขายของทั้งหมดยังแสดง "ก๊อกตัดพื้นขาว" อยู่ — บล็อก
// หมวดหมู่ที่มีหน้าที่พูดว่า "ครัว" กับ "ห้องน้ำ" ก็ยังไม่มีทั้งครัวและห้องน้ำในนั้น
//
// การเลือกต้องคงที่ ไม่ใช่สุ่มตอน render: static export ต้องได้ HTML เดิมทุกครั้ง
// และภาพของสินค้าชิ้นหนึ่งต้องไม่เปลี่ยนไปมาระหว่างการเข้าชม จึงใช้แฮชจากคีย์
// (slug / รหัสเฉด) มาหมุนในคลังแทน
//
// ไม่มีเมทาดาทาว่าภาพห้องไหน "เป็นเฉดอะไร" — คลังบันทึกแค่ category/space/aspect
// ฟังก์ชันนี้จึงไม่อ้างว่าห้องที่เลือกมาเป็นเฉดนั้น มันเลือก "ห้องจริงหนึ่งห้อง"
// ให้หน้าที่กำลังพูดถึงเฉดนั้นเปิดด้วยภาพถ่าย ไม่ใช่เปิดด้วยกริดสินค้าเปล่า ๆ

import { lifestyleImages, type LifestyleImage, type LifestyleSpace } from '@/lib/lifestyle';

/** แฮชสั้น ๆ แบบคงที่ (FNV-1a) — ต้องได้ค่าเดิมทั้งตอน build และตอน hydrate */
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

type Pick = {
  /** ต้องกว้างพอสำหรับช่องที่จะไปวาง ไม่งั้นได้ภาพเบลอ (ดู canFill) */
  minWidth?: number;
  /** สัดส่วนขั้นต่ำ — แถบเต็มความกว้างต้องการภาพแนวนอน */
  minAspect?: number;
  space?: LifestyleSpace;
};

function pool({ minWidth = 900, minAspect = 1.3, space }: Pick): LifestyleImage[] {
  const rooms = lifestyleImages.filter(
    (image) =>
      image.category === 'room' &&
      image.maxWidth >= minWidth &&
      image.aspect >= minAspect &&
      (!space || image.space === space),
  );
  // เรียงด้วย id เพื่อให้ลำดับไม่ขึ้นกับลำดับในไฟล์ที่ถูก generate ใหม่ได้
  return [...rooms].sort((a, b) => a.id.localeCompare(b.id));
}

/** ห้องหนึ่งใบสำหรับคีย์หนึ่งค่า — คีย์เดิมได้ห้องเดิมเสมอ */
export function roomFor(key: string, options: Pick = {}): LifestyleImage | undefined {
  const list = pool(options);
  if (list.length === 0) return undefined;
  return list[hash(key) % list.length];
}

/** ห้องที่ระบุด้วย id ตรง ๆ — ใช้กับบล็อกที่เลือกภาพด้วยตาแล้ว */
export function roomById(id: string): LifestyleImage {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}
