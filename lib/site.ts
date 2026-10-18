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
  // อาคาร Noble Remix ตาม embed ที่ลูกค้าส่งมา (2026-10-18)
  map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4854.967186293793!2d100.57726009999999!3d13.724566699999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e29fa9a65bac1f%3A0x773d0fc8974d6c06!2sNoble%20Remix!5e1!3m2!1sth!2sth!4v1792338022645!5m2!1sth!2sth',
  map_link: 'https://www.google.com/maps/search/?api=1&query=13.7245667%2C100.5772601',
  address_th: `KOHLER Kitchens ${STREET_TH} แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110`,
  address_en: `KOHLER Kitchens, ${STREET_EN}, Khlong Tan, Khlong Toei, Bangkok 10110`,
  hours_th: 'เปิดทุกวัน 10:00 ถึง 19:00 น.',
  hours_en: 'Open daily 10:00 to 19:00',
};
