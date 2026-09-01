// ── จุดเปลี่ยนเป็นของจริง ──
// เปลี่ยน SITE_URL เป็นโดเมนจริงก่อน deploy (มีผลกับ sitemap, robots, JSON-LD, OG)
//
// ยังเป็น example.com โดยตั้งใจ ไม่ใช่ kohler.co.th — นั่นคือเว็บจริงของแบรนด์
// งานนี้เป็นพรอโทไทป์ของดีลเลอร์ การชี้ canonical/JSON-LD ไปที่โดเมนของแบรนด์
// จะประกาศตัวเป็นเว็บนั้นซึ่งไม่จริง โดเมนสมมติที่เห็นชัดว่าสมมติปลอดภัยกว่า
export const SITE_URL = 'https://kohler-demo.example.com';
export const SITE_NAME = 'KOHLER';
export const SITE_TAGLINE_TH = 'อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม';
export const SITE_TAGLINE_EN = 'Premium Kitchen & Bath';
export const CONTACT = {
  phone: '02-000-0000',
  email: 'hello@kohler-demo.example.com',
  line: '@kohler',
  address_th: '888 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
  address_en: '888 Sukhumvit Rd., Khlong Tan, Khlong Toei, Bangkok 10110',
  hours_th: 'เปิดทุกวัน 10:00 – 19:00 น.',
};
