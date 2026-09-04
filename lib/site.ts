// ── จุดเปลี่ยนเป็นของจริง ──
// เปลี่ยน SITE_URL เป็นโดเมนจริงก่อน deploy (มีผลกับ sitemap, robots, JSON-LD, OG)
//
// ยังเป็น example.com โดยตั้งใจ ไม่ใช่ kohler.co.th — นั่นคือเว็บจริงของแบรนด์
// งานนี้เป็นพรอโทไทป์ของดีลเลอร์ การชี้ canonical/JSON-LD ไปที่โดเมนของแบรนด์
// จะประกาศตัวเป็นเว็บนั้นซึ่งไม่จริง โดเมนสมมติที่เห็นชัดว่าสมมติปลอดภัยกว่า
export const SITE_URL = 'https://kohler-demo.example.com';
export const SITE_NAME = 'KOHLER';
export const SITE_TAGLINE_TH = 'อุปกรณ์ครัวพรีเมียม';
export const SITE_TAGLINE_EN = 'Premium Kitchen';

/**
 * The postal address, split into the parts schema.org wants.
 *
 * It used to live inline in the JSON-LD in app/layout.tsx, in Thai, hard-coded.
 * The document declares English now, so it needs both scripts — and JSON-LD
 * only takes one, so the language the structured data speaks has to follow
 * DEFAULT_LANG rather than being fixed at whichever one somebody typed first.
 *
 * addressCountry stays 'TH' in both: that field is an ISO country code, not
 * prose, and it does not translate.
 */
export const ADDRESS = {
  th: {
    streetAddress: '888 ถนนสุขุมวิท',
    addressLocality: 'คลองเตย',
    addressRegion: 'กรุงเทพมหานคร',
    postalCode: '10110',
    addressCountry: 'TH',
  },
  en: {
    streetAddress: '888 Sukhumvit Road',
    addressLocality: 'Khlong Toei',
    addressRegion: 'Bangkok',
    postalCode: '10110',
    addressCountry: 'TH',
  },
} as const;

export const CONTACT = {
  phone: '02-000-0000',
  email: 'hello@kohler-demo.example.com',
  line: '@kohler',
  address_th: '888 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
  address_en: '888 Sukhumvit Rd., Khlong Tan, Khlong Toei, Bangkok 10110',
  hours_th: 'เปิดทุกวัน 10:00 – 19:00 น.',
  hours_en: 'Open daily 10:00 – 19:00',
};
