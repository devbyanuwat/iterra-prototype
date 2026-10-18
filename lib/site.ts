// ── จุดเปลี่ยนเป็นของจริง ──
// เปลี่ยน SITE_URL เป็นโดเมนจริงก่อน deploy (มีผลกับ sitemap, robots, JSON-LD, OG)
export const SITE_URL = 'https://iterra-demo.example.com';
export const SITE_NAME = 'ITERRA';
export const SITE_TAGLINE_TH = 'อุปกรณ์และชุดครัวพรีเมียม';
export const SITE_TAGLINE_EN = 'Premium Kitchens';
// ที่อยู่และเบอร์ของโชว์รูม KOHLER Kitchens ตามที่ลูกค้าส่งมา (2026-10-18) · 105 คือเบอร์ต่อ
const STREET_TH = '772/658-659 อาคารโนเบิลรีมิกซ์ ชั้น 1 ถนนสุขุมวิท (ซอยสุขุมวิท 36)';
const STREET_EN = '772/658-659 Noble Remix Building, 1st Floor, Sukhumvit Rd. (Soi Sukhumvit 36)';
export const CONTACT = {
  phone: '02-070-2271 ต่อ 105',
  phone_en: '+66 2 070 2271 ext. 105',
  // ยังเป็นอีเมลตัวอย่าง รออีเมลกลางของร้าน
  email: 'hello@iterra.example.com',
  // ว่างไว้จนกว่าลูกค้าสร้าง LINE@ เสร็จ · ว่าง = ซ่อนข้อความ LINE และปุ่มลอย LINE
  line: '',
  street_th: STREET_TH,
  address_th: `KOHLER Kitchens ${STREET_TH} แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110`,
  address_en: `KOHLER Kitchens, ${STREET_EN}, Khlong Tan, Khlong Toei, Bangkok 10110`,
  hours_th: 'เปิดทุกวัน 10:00 ถึง 19:00 น.',
  hours_en: 'Open daily 10:00 to 19:00',
};
