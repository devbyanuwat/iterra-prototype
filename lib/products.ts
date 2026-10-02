// ── MOCK DATA ──
// จุดเปลี่ยนเป็นของจริง #1: แทนที่ข้อมูลในไฟล์นี้ด้วยสินค้าจริงทั้งหมด
// โครงสร้าง type ด้านล่างออกแบบให้ map ตรงกับ CMS/สเปรดชีตได้ทันที
// ฟิลด์ images เป็น "ป้ายชื่อภาพ placeholder" — เมื่อมีภาพจริงให้เปลี่ยนเป็น path รูป
// แล้วสลับ <Placeholder /> เป็น <Image /> ใน components ที่เกี่ยวข้อง

export type Category = 'kitchen';

export type Product = {
  slug: string;
  category: Category;
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  price: { th: string; en: string };
  featured?: boolean;
  images: string[]; // ป้ายชื่อภาพ placeholder (สัดส่วน 4:5)
};

const ASK = { th: 'สอบถามราคา', en: 'Price on request' };

export const products: Product[] = [
  {
    slug: 'sink-pro-duo',
    category: 'kitchen',
    name: { th: 'ซิงก์สเตนเลส 2 หลุม ProDuo', en: 'ProDuo Double-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลส 304 ขึ้นรูปชิ้นเดียว หลุมลึกพิเศษพร้อมระบบซับเสียง เหมาะกับครัวที่ใช้งานจริงทุกวันแต่ไม่ยอมลดทอนความงาม',
      en: 'One-piece formed 304 stainless sink with extra-deep bowls and sound-dampening pads — built for daily use without compromising on looks.',
    },
    specs: [
      { label: 'วัสดุ', value: 'สเตนเลส 304 หนา 1.2 มม.' },
      { label: 'ขนาด', value: '820 × 450 × 220 มม.' },
      { label: 'ระบบซับเสียง', value: 'NoiseGuard 4 จุด' },
      { label: 'ผิวสัมผัส', value: 'Brushed กันรอยขนแมว' },
      { label: 'รับประกัน', value: '10 ปี' },
    ],
    price: ASK,
    featured: true,
    images: ['ซิงก์ ProDuo 01', 'ซิงก์ ProDuo 02', 'ซิงก์ ProDuo 03', 'ซิงก์ ProDuo 04'],
  },
  {
    slug: 'faucet-pullout-arc',
    category: 'kitchen',
    name: { th: 'ก๊อกครัวดึงได้ Arc', en: 'Arc Pull-Out Kitchen Faucet' },
    desc: {
      th: 'ก๊อกครัวหัวดึงสายยาว โค้งสถาปัตยกรรมเรียบนิ่ง ผิวเคลือบ PVD Gunmetal ทนรอยนิ้วมือ พร้อมโหมดน้ำ 2 ระดับ',
      en: 'Architectural high-arc pull-out faucet in fingerprint-resistant PVD gunmetal, with dual spray modes.',
    },
    specs: [
      { label: 'วาล์ว', value: 'เซรามิกเกรดยุโรป' },
      { label: 'สายดึง', value: 'ยาว 60 ซม. คืนตัวอัตโนมัติ' },
      { label: 'โหมดน้ำ', value: 'Stream / Spray' },
      { label: 'ผิวเคลือบ', value: 'PVD Gunmetal' },
      { label: 'อัตราไหล', value: 'ประหยัดน้ำ 30%' },
    ],
    price: ASK,
    featured: true,
    images: ['ก๊อก Arc 01', 'ก๊อก Arc 02', 'ก๊อก Arc 03', 'ก๊อก Arc 04'],
  },
  {
    slug: 'induction-flex-90',
    category: 'kitchen',
    name: { th: 'เตาแม่เหล็กไฟฟ้า FlexZone 90', en: 'FlexZone 90 Induction Hob' },
    desc: {
      th: 'เตาแม่เหล็กไฟฟ้า 90 ซม. 5 หัวเตา เชื่อมโซนซ้ายเป็นพื้นที่เดียวสำหรับภาชนะใหญ่ กระจก Schott ผิวเรียบไร้รอยต่อ',
      en: 'A 90 cm five-zone induction hob with bridgeable FlexZone and a seamless Schott glass surface.',
    },
    specs: [
      { label: 'หัวเตา', value: '5 โซน + FlexZone' },
      { label: 'กำลังไฟรวม', value: '11,000 วัตต์' },
      { label: 'ฟังก์ชัน', value: 'Booster / Keep Warm' },
      { label: 'ความปลอดภัย', value: 'ล็อกกันเด็ก, ตัดไฟอัตโนมัติ' },
      { label: 'พื้นผิว', value: 'กระจก Schott Ceran' },
    ],
    price: ASK,
    featured: true,
    images: ['เตา FlexZone 01', 'เตา FlexZone 02', 'เตา FlexZone 03', 'เตา FlexZone 04'],
  },
  {
    slug: 'builtin-kitchen-set',
    category: 'kitchen',
    name: { th: 'ชุดครัวบิลท์อินสั่งตัด Bespoke', en: 'Bespoke Built-in Kitchen' },
    desc: {
      th: 'ชุดครัวบิลท์อินออกแบบเฉพาะบ้านคุณ โครงกันน้ำ ท็อปควอตซ์ บานพับซอฟต์โคลสทุกจุด พร้อมบริการออกแบบ 3D โดยทีมสถาปนิก',
      en: 'A made-to-measure kitchen with waterproof carcass, quartz worktop and soft-close hardware throughout — 3D design service included.',
    },
    specs: [
      { label: 'โครงตู้', value: 'HMR กันความชื้น' },
      { label: 'หน้าบาน', value: 'Acrylic / Laminate / Veneer' },
      { label: 'ท็อป', value: 'ควอตซ์หนา 20 มม.' },
      { label: 'อุปกรณ์', value: 'บานพับ–รางลิ้นชัก soft-close' },
      { label: 'บริการ', value: 'ออกแบบ 3D + ติดตั้งฟรี' },
    ],
    price: ASK,
    featured: true,
    images: ['ครัวบิลท์อิน 01', 'ครัวบิลท์อิน 02', 'ครัวบิลท์อิน 03', 'ครัวบิลท์อิน 04'],
  },
  {
    slug: 'hood-slim-t90',
    category: 'kitchen',
    name: { th: 'เครื่องดูดควันสลิม T90', en: 'T90 Slimline Cooker Hood' },
    desc: {
      th: 'เครื่องดูดควันดีไซน์บางเฉียบ แรงดูดสูงแต่เงียบผิดคาด ควบคุมด้วยระบบสัมผัส พร้อมไฟ LED ส่องพื้นที่ปรุงอาหาร',
      en: 'An ultra-slim hood with high extraction yet remarkably quiet operation, touch controls and LED task lighting.',
    },
    specs: [
      { label: 'แรงดูด', value: '1,200 ลบ.ม./ชม.' },
      { label: 'ระดับเสียง', value: '52 เดซิเบล' },
      { label: 'ควบคุม', value: 'Touch + รีโมต' },
      { label: 'ไฟส่องสว่าง', value: 'LED 2 จุด' },
      { label: 'แผ่นกรอง', value: 'อะลูมิเนียมล้างได้' },
    ],
    price: ASK,
    images: ['ดูดควัน T90 01', 'ดูดควัน T90 02', 'ดูดควัน T90 03', 'ดูดควัน T90 04'],
  },
  {
    slug: 'oven-steam-pro',
    category: 'kitchen',
    name: { th: 'เตาอบไอน้ำบิลท์อิน SteamPro', en: 'SteamPro Built-in Steam Oven' },
    desc: {
      th: 'เตาอบบิลท์อินพร้อมระบบไอน้ำ 3 ระดับ อบขนมปังกรอบนอกนุ่มใน ทำความสะอาดตัวเองด้วยระบบ Pyrolytic',
      en: 'A built-in oven with three-level steam assist and pyrolytic self-cleaning — bakery-grade results at home.',
    },
    specs: [
      { label: 'ความจุ', value: '70 ลิตร' },
      { label: 'โปรแกรมอบ', value: '12 โปรแกรม' },
      { label: 'ระบบไอน้ำ', value: '3 ระดับ' },
      { label: 'ทำความสะอาด', value: 'Pyrolytic self-clean' },
      { label: 'ประตู', value: 'กระจก 3 ชั้นกันร้อน' },
    ],
    price: ASK,
    images: ['เตาอบ SteamPro 01', 'เตาอบ SteamPro 02', 'เตาอบ SteamPro 03', 'เตาอบ SteamPro 04'],
  },
  {
    slug: 'dishwasher-s14',
    category: 'kitchen',
    name: { th: 'เครื่องล้างจานบิลท์อิน S14', en: 'S14 Built-in Dishwasher' },
    desc: {
      th: 'เครื่องล้างจานความจุ 14 ชุดมาตรฐาน เงียบเพียง 42 เดซิเบล พร้อมระบบเปิดประตูอบแห้งอัตโนมัติหลังจบรอบล้าง',
      en: 'A 14-place-setting dishwasher running at just 42 dB, with auto-open drying at the end of every cycle.',
    },
    specs: [
      { label: 'ความจุ', value: '14 ชุดมาตรฐาน' },
      { label: 'โปรแกรมล้าง', value: '8 โปรแกรม' },
      { label: 'ระดับเสียง', value: '42 เดซิเบล' },
      { label: 'ระบบอบแห้ง', value: 'AutoOpen Dry' },
      { label: 'ประหยัดพลังงาน', value: 'ระดับ A+++' },
    ],
    price: ASK,
    images: ['ล้างจาน S14 01', 'ล้างจาน S14 02', 'ล้างจาน S14 03', 'ล้างจาน S14 04'],
  },
];

export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function relatedProducts(slug: string, n = 3) {
  const cur = getProduct(slug);
  if (!cur) return [];
  return products.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}
