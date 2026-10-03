// สินค้าจริงจาก kohler.co.th หมวดครัว (อ่านเมื่อ 2026-10-03): ก๊อก 6 รุ่น ซิงก์ 4 รุ่น ครบทุกรุ่นที่เว็บมี
// ทุกรหัสมีสี/วัสดุเดียว (ก๊อก = โครเมียมขัดเงา) เว็บ Kohler ไม่มีตัวเลือกสี · จุดสีในหน้าเว็บเป็นสีตัวอย่างเพื่อเดโม ดู lib/finishes.ts
// ภาพ: scripts/build-media.sh products · images = ภาพตัดพื้นหลัง (contain) · scenes = ภาพใช้งานจริง (cover)

export type Category = 'faucet' | 'sink';
export type Material = 'brass' | 'stainless' | 'castIron';

export type Product = {
  slug: string; // ตรงกับ slug บน kohler.co.th
  category: Category;
  series: string; // ซีรีส์ของ Kohler (ProductBrandName)
  material?: Material; // ไม่มี = Kohler ไม่ระบุวัสดุ (Kumin 99480T)
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  price: { th: string; en: string };
  featured?: boolean;
  images: string[];
  scenes?: string[];
};

const ASK = { th: 'สอบถามราคา', en: 'Price on request' };
const CHROME = { label: 'สี', value: 'โครเมียมขัดเงา (Polished Chrome)' };
const img = (slug: string) => [`/media/products/${slug}-1.webp`];

export const products: Product[] = [
  {
    slug: 'elate-13963t-c4',
    category: 'faucet',
    series: 'Elate',
    material: 'brass',
    name: { th: 'Elate™ ก๊อกผสมอ่างล้างจาน หัวฝักบัวดึงได้', en: 'Elate™ Pull-Out Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลืองก้านโยกเดี่ยว หัวฝักบัวดึงออกได้ สลับได้ 2 แบบระหว่างสายน้ำนุ่มกับสเปรย์ Sweep® สายถัก ProMotion® ดึงเบาและเงียบ',
      en: 'Single-lever brass faucet with a two-function pull-out sprayhead that switches between an aerated stream and Sweep® spray. The ProMotion® braided hose keeps the pull-out light and quiet.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-13963T-C4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์ รูเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '229 มม.' },
      { label: 'อัตราการไหลสูงสุด', value: '7.5 ลิตร/นาที ที่ 3 บาร์' },
      { label: 'ขนาด', value: 'สูง 306 × กว้าง 121 มม.' },
    ],
    price: ASK,
    featured: true,
    images: img('elate-13963t-c4'),
    scenes: [2, 3, 4].map((n) => `/media/products/elate-13963t-c4-scene-${n}.webp`),
  },
  {
    slug: 'kumin-99480t-4',
    category: 'faucet',
    series: 'Kumin',
    name: { th: 'Kumin™ ก๊อกผสมอ่างล้างจาน', en: 'Kumin™ Single-Control Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมก้านโยกเดี่ยว คอหมุนได้ 360 องศา ระยะยื่น 227 มม. วาล์วเซรามิกของ Kohler ทนทานเกินมาตรฐานอุตสาหกรรม 2 เท่า',
      en: 'Single-lever mixer with a 360° swivel spout and a 227 mm reach. KOHLER ceramic disc valves are built to twice the industry longevity standard.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-99480T-4-CP' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '227 มม.' },
      { label: 'คอก๊อก', value: 'หมุนได้ 360°' },
    ],
    price: ASK,
    images: img('kumin-99480t-4'),
  },
  {
    slug: 'elate-15609x-4',
    category: 'faucet',
    series: 'Elate',
    material: 'brass',
    name: { th: 'Elate™ ก๊อกผสมอ่างล้างจาน', en: 'Elate™ Single-Control Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลือง ติดตั้งรูเดียว วาล์วเซรามิกชิ้นเดียวคุมทั้งปริมาณน้ำและอุณหภูมิ ระยะยื่น 210 มม.',
      en: 'Brass single-hole mixer with a one-piece ceramic disc valve for volume and temperature, and a 210 mm spout reach.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-15609X-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์ รูเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '210 มม.' },
    ],
    price: ASK,
    images: img('elate-15609x-4'),
  },
  {
    slug: 'taut-21370t-4cd',
    category: 'faucet',
    series: 'Taut',
    material: 'brass',
    name: { th: 'Taut™ ก๊อกเดี่ยวอ่างล้างจาน', en: 'Taut™ Cold-Water Swing-Spout Kitchen Faucet' },
    desc: {
      th: 'ก๊อกน้ำเย็นทองเหลือง คอสวิง ระยะยื่น 178 มม. เซรามิกวาล์วหมุน 1/4 รอบ รับประกันตลอดอายุการใช้งาน',
      en: 'Brass cold-water faucet with a swing spout, a 178 mm reach and a quarter-turn ceramic disc valve with a lifetime warranty.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-21370T-4CD-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'น้ำ', value: 'น้ำเย็นอย่างเดียว' },
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '178 มม.' },
      { label: 'สายน้ำดี', value: 'G1/2"' },
    ],
    price: ASK,
    images: img('taut-21370t-4cd'),
  },
  {
    slug: 'kumin-30946t-4',
    category: 'faucet',
    series: 'Kumin',
    material: 'brass',
    name: { th: 'Kumin™ ก๊อกเดี่ยวอ่างล้างจาน', en: 'Kumin™ Cold-Water Kitchen Faucet' },
    desc: {
      th: 'ก๊อกน้ำเย็นทองเหลืองก้านโยกข้าง คอหมุน 360 องศา ระยะยื่น 192 มม. สายน้ำผสมอากาศ',
      en: 'Brass cold-water faucet with a side lever, a 360° rotating spout, a 192 mm reach and an aerated flow.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-30946T-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'น้ำ', value: 'น้ำเย็นอย่างเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '192 มม.' },
      { label: 'อัตราการไหลสูงสุด', value: '8.3 ลิตร/นาที ที่ 4.14 บาร์' },
      { label: 'ขนาด', value: 'สูง 267 × กว้าง 46 มม.' },
    ],
    price: ASK,
    images: img('kumin-30946t-4'),
  },
  {
    slug: 'taut-21366t-4',
    category: 'faucet',
    series: 'Taut',
    material: 'brass',
    name: { th: 'Taut™ ก๊อกผสมอ่างล้างจาน หัวฝักบัวดึงลง', en: 'Taut™ Pull-Down Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลือง หัวฝักบัวดึงลงปรับได้ 2 แบบ ระยะยื่น 222 มม. เซรามิกวาล์วรับประกันตลอดอายุการใช้งาน',
      en: 'Brass pull-down faucet with a two-function spray, a 222 mm reach and a ceramic disc valve with a lifetime warranty.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-21366T-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '222 มม.' },
      { label: 'หัวฉีด', value: 'ดึงลง ปรับได้ 2 แบบ' },
    ],
    price: ASK,
    featured: true,
    images: img('taut-21366t-4'),
  },
  {
    slug: 'toccata-3644x-2kd',
    category: 'sink',
    series: 'Toccata',
    material: 'stainless',
    name: { th: 'Toccata™ ซิงก์สเตนเลส 1 หลุม', en: 'Toccata™ Single-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลสหลุมเดี่ยวขนาด 31 นิ้ว ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '31-inch single-bowl stainless steel sink for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3644X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '1 หลุม' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '31 นิ้ว' },
    ],
    price: ASK,
    images: img('toccata-3644x-2kd'),
  },
  {
    slug: 'indio-3885x-2sd',
    category: 'sink',
    series: 'Indio',
    material: 'castIron',
    name: { th: 'Indio™ ซิงก์เหล็กหล่อ 2 หลุม', en: 'Indio™ Smart Divide Cast-Iron Double Sink' },
    desc: {
      th: 'ซิงก์เหล็กหล่อสีขาว 33 นิ้ว 2 หลุมใหญ่และกลางแบบ Smart Divide พร้อมที่กดสบู่ ติดตั้งได้ทั้งฝังบนและใต้เคาน์เตอร์',
      en: '33-inch white cast-iron sink with Smart Divide large and medium bowls and a soap dispenser, for self-rimming or undermount installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3885X-2SD-0' },
      { label: 'วัสดุ', value: 'เหล็กหล่อ' },
      { label: 'สี', value: 'ขาว' },
      { label: 'แบบหลุม', value: '2 หลุม ใหญ่และกลาง (Smart Divide)' },
      { label: 'การติดตั้ง', value: 'ฝังบนหรือใต้เคาน์เตอร์' },
      { label: 'ความยาว', value: '33 นิ้ว' },
      { label: 'อุปกรณ์', value: 'ที่กดสบู่' },
    ],
    price: ASK,
    featured: true,
    images: img('indio-3885x-2sd'),
  },
  {
    slug: 'toccata-3645x-2kd',
    category: 'sink',
    series: 'Toccata',
    material: 'stainless',
    name: { th: 'Toccata™ ซิงก์สเตนเลส 2 หลุม', en: 'Toccata™ Double-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลส 31 นิ้ว 2 หลุมใหญ่และกลาง ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '31-inch stainless steel sink with large and medium bowls for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3645X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '2 หลุม ใหญ่และกลาง' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '31 นิ้ว' },
    ],
    price: ASK,
    featured: true,
    images: img('toccata-3645x-2kd'),
  },
  {
    slug: 'marcato-3676x-2kd',
    category: 'sink',
    series: 'Marcato',
    material: 'stainless',
    name: { th: 'Marcato™ ซิงก์สเตนเลส 1 หลุมครึ่ง', en: 'Marcato™ 1.5-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลส 30 นิ้ว หลุมใหญ่คู่หลุมกลาง ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '30-inch stainless steel sink with a large and a medium bowl for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3676X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '1 หลุมครึ่ง' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '30 นิ้ว' },
    ],
    price: ASK,
    images: img('marcato-3676x-2kd'),
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
