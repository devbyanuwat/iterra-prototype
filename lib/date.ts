// ── วันที่ต้องออกมาเหมือนกันทั้งฝั่งที่ build HTML และฝั่งที่ hydrate ─────────
//
// `toLocaleDateString` ใช้ตาราง ICU ของตัวรันไทม์ที่เรียกมัน ซึ่งไม่ใช่ตัวเดียวกัน:
// เว็บนี้ static export — HTML ถูกเขียนโดย Node ตอน build ส่วนคนที่มา hydrate คือ
// เบราว์เซอร์ ICU ทั้งสองเวอร์ชันไม่ตรงกัน และ en-GB คือจุดที่มันแตกจริง
//
//   Node 24  →  '2 Sept 2026'
//   Chrome   →  '2 Sep 2026'
//
// React เห็นข้อความคนละอย่างในโหนดเดียวกัน จึงทิ้งต้นไม้แล้ววาดใหม่ทั้งกิ่ง
// ("Hydration failed because the server rendered text didn't match the client")
// ไม่ใช่แค่คำเตือน — งานที่ควรถูก reuse จาก HTML ถูกโยนทิ้งทุกครั้งที่โหลดหน้า
//
// ทางแก้ไม่ใช่ suppressHydrationWarning ซึ่งแค่ปิดปากคำเตือนแต่ยังวาดใหม่อยู่ดี
// ตารางชื่อเดือนอยู่ในไฟล์นี้ ผลลัพธ์จึงเป็นของเรา ไม่ใช่ของรันไทม์
//
// ปีไทยเป็นพุทธศักราชตามที่ th-TH ให้มาแต่เดิม (2026 → 2569) — เปลี่ยนเป็น ค.ศ.
// คือการเปลี่ยนเนื้อหาที่ผู้อ่านเห็น ไม่ใช่การแก้บั๊ก hydration

import type { Lang } from './i18n';

const MONTHS: Record<Lang, readonly string[]> = {
  // ตรงกับที่ Chrome ให้กับ en-GB — 'Sept' คือรูปของ Node ที่เบราว์เซอร์ไม่ใช้
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  th: [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ],
};

/**
 * วันที่แบบสั้น: `2 Sep 2026` / `2 ก.ย. 2569`
 *
 * อ่านค่าด้วย getUTC* ไม่ใช่ get* ในเขตเวลาท้องถิ่น: `post.date` เป็นสตริง
 * `YYYY-MM-DD` ซึ่ง JS ตีความเป็นเที่ยงคืน UTC เครื่องที่ build อยู่หลัง UTC
 * (เช่น UTC-5) จะอ่านวันนั้นได้เป็นวันก่อนหน้า ส่วนเบราว์เซอร์ในไทย (UTC+7)
 * อ่านได้ตรงวัน — เป็น mismatch ชนิดเดียวกันที่ตารางชื่อเดือนแก้ไม่ได้
 */
export function shortDate(value: string | Date, lang: Lang): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear() + (lang === 'th' ? 543 : 0);
  return `${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]} ${year}`;
}

/**
 * ตัวเลขคั่นหลักพันแบบคงที่: `1,234`
 *
 * `Number.toLocaleString()` ไม่มีอาร์กิวเมนต์ = ใช้ locale ของรันไทม์ ซึ่งฝั่ง
 * build เป็นของเครื่องที่ build ส่วนฝั่ง hydrate เป็นของผู้ใช้ locale ที่ใช้จุด
 * เป็นตัวคั่นหลักพัน (de, id, es) จะได้ '1.234' คนละสตริงกับที่อยู่ใน HTML
 */
export function groupedNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
