// ── ข้อมูลตัวอย่าง ── ผลงานอ้างอิง รอข้อมูลโครงการจริงจากลูกค้า (ชื่อ ที่ตั้ง ปี ภาพ สินค้าที่ใช้)
// products = slug ใน lib/products.ts · scripts/check-search.mjs ตรวจว่ามีจริง
// ไฟล์นี้ไม่มี import เพื่อให้สคริปต์ตรวจรันด้วย Node ได้

type Name = { th: string; en: string };
export type Project = { slug: string; name: Name; location: Name; type: Name; year: number; image: string; products: string[] };

const g = (name: string) => `/media/gallery/${name}.webp`;
const BKK = { th: 'กรุงเทพฯ', en: 'Bangkok' };
const CONDO = { th: 'คอนโดมิเนียม', en: 'Condominium' };

export const projects: Project[] = [
  { slug: 'sukhumvit-penthouse', name: { th: 'เพนต์เฮาส์สุขุมวิท', en: 'Sukhumvit Penthouse' }, location: BKK, type: CONDO, year: 2026, image: g('k-night'), products: ['elate-13963t-c4', 'toccata-3644x-2kd'] },
  { slug: 'khao-yai-villa', name: { th: 'วิลล่าเขาใหญ่', en: 'Khao Yai Villa' }, location: { th: 'นครราชสีมา', en: 'Nakhon Ratchasima' }, type: { th: 'บ้านพักตากอากาศ', en: 'Holiday home' }, year: 2025, image: g('k-timber'), products: ['taut-21366t-4', 'indio-3885x-2sd'] },
  { slug: 'ari-townhome', name: { th: 'ทาวน์โฮมอารีย์', en: 'Ari Townhome' }, location: BKK, type: { th: 'ทาวน์โฮม', en: 'Townhome' }, year: 2025, image: g('k-blue'), products: ['kumin-99480t-4', 'toccata-3645x-2kd'] },
  { slug: 'hua-hin-beach-house', name: { th: 'บ้านริมหาดหัวหิน', en: 'Hua Hin Beach House' }, location: { th: 'ประจวบคีรีขันธ์', en: 'Prachuap Khiri Khan' }, type: { th: 'บ้านเดี่ยว', en: 'Private house' }, year: 2024, image: g('k-dusk'), products: ['elate-15609x-4', 'marcato-3676x-2kd'] },
  { slug: 'nimman-cafe', name: { th: 'คาเฟ่นิมมาน', en: 'Nimman Café' }, location: { th: 'เชียงใหม่', en: 'Chiang Mai' }, type: { th: 'ร้านอาหารและคาเฟ่', en: 'Café and restaurant' }, year: 2024, image: g('k-dining'), products: ['taut-21370t-4cd', 'toccata-3645x-2kd'] },
  { slug: 'sathorn-residence', name: { th: 'เรสซิเดนซ์สาทร', en: 'Sathorn Residence' }, location: BKK, type: CONDO, year: 2023, image: g('k-stone'), products: ['kumin-30946t-4', 'toccata-3644x-2kd'] },
];
