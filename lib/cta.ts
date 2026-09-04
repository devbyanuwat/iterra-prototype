// ── แถบชวนต่อ ก่อนถึงท้ายเว็บ ───────────────────────────────────────────────
//
// ทุกหน้าจบลงด้วยท้ายเว็บซึ่งเป็นสารบัญ — เหมือนกันหมด 516 หน้า และไม่รู้ว่า
// ผู้อ่านเพิ่งอ่านอะไรมา แถบนี้คือประโยคสุดท้ายของหน้านั้น ๆ: อ่านจบแล้วไปไหนต่อ
//
// ทำไมเลือกทางไปจาก path ไม่ใช่ให้แต่ละ route ส่งเข้ามาเอง: มี 20 ไฟล์ route และ
// อีก 21 หน้า/รูปแบบ ถ้าเป็นพร็อพ ทุกหน้าใหม่ที่ใครเขียนต่อจากนี้จะลืมใส่ได้เงียบ ๆ
// แล้วหน้านั้นก็จะเป็นหน้าเดียวที่จบห้วน ที่นี่ลืมไม่ได้เพราะไม่มีที่ให้ลืม —
// RootShell วางมันไว้ระหว่าง <main> กับ <Footer> ครั้งเดียว
//
// ── กฎของเนื้อหาในแถบ ────────────────────────────────────────────────────
// 1. ทางไปต้องต่อจากสิ่งที่เพิ่งอ่าน ไม่ใช่เมนูหลักย่อส่วน — คนที่เพิ่งดูสินค้าชิ้นหนึ่ง
//    อยากรู้ว่ามันมีเฉดอะไรบ้างและจับของจริงได้ที่ไหน ไม่ใช่ "หน้าแรก"
// 2. ทางไปต้องไม่ชี้กลับหน้าที่ยืนอยู่ — กรองด้วย path ตอน render
// 3. ทุกแถบมีช่องทางติดต่อจริง เพราะเว็บนี้ไม่มีตะกร้า ปลายทางของทุกหน้าคือคุย
//    กับคน

import type { Localized } from './i18n';

export type CtaLink = {
  /** path ของเว็บ ไม่มีคำนำหน้าภาษา — components/Link เติมให้เอง */
  href: string;
  label: Localized;
  note: Localized;
};

export type CtaBand = {
  kicker: Localized;
  title: Localized;
  body: Localized;
  links: CtaLink[];
};

// ── คลังทางไป ใช้ซ้ำข้ามแถบ ────────────────────────────────────────────────
const GO = {
  products: {
    href: '/products/',
    label: { th: 'ดูสินค้าทั้งหมด', en: 'Browse the catalogue' },
    note: { th: 'ก๊อกครัวและอ่างล้างจาน กรองตามประเภทและเฉดผิวเคลือบ', en: 'Kitchen faucets and sinks, filtered by type and finish.' },
  },
  palette: {
    href: '/palette/',
    label: { th: 'สีและผิวเคลือบ', en: 'Colours & finishes' },
    note: { th: 'เฉดจริงที่ของครัวสั่งได้ ดูว่าเฉดไหนเข้ากับครัวของคุณ', en: 'The finishes the kitchen range actually ships in, and which suits yours.' },
  },
  gallery: {
    href: '/gallery/',
    label: { th: 'แกลเลอรี', en: 'Gallery' },
    note: { th: 'สินค้าลอยอยู่ในสนามลึก หมุนดูได้รอบด้าน', en: 'Products floating in a depth field you can turn.' },
  },
  guides: {
    href: '/guides/',
    label: { th: 'คู่มือเลือกซื้อ', en: 'Buying guides' },
    note: { th: 'เลือกอย่างไรไม่ให้เสียใจทีหลัง — ทีละประเภท', en: 'How to choose without regretting it, one category at a time.' },
  },
  ideas: {
    href: '/ideas/',
    label: { th: 'ไอเดียแต่งครัว', en: 'Kitchen ideas' },
    note: { th: 'ครัวจริงที่จัดเสร็จแล้ว พร้อมของที่ใช้ในนั้น', en: 'Finished kitchens, and what went into them.' },
  },
  articles: {
    href: '/articles/',
    label: { th: 'บทความ', en: 'Articles' },
    note: { th: 'เรื่องวัสดุ การดูแล และงานติดตั้ง', en: 'On materials, care, and installation.' },
  },
  collections: {
    href: '/collections/',
    label: { th: 'คอลเลกชัน', en: 'Collections' },
    note: { th: 'ชุดที่ออกแบบมาให้อยู่ด้วยกันทั้งห้อง', en: 'Ranges designed to live together across a room.' },
  },
  stores: {
    href: '/stores/',
    label: { th: 'หาโชว์รูมใกล้คุณ', en: 'Find a showroom' },
    note: { th: 'จับของจริง เปิดน้ำลองได้ ก่อนตัดสินใจ', en: 'Touch it, run the water, then decide.' },
  },
  contact: {
    href: '/contact/',
    label: { th: 'คุยกับเรา', en: 'Talk to us' },
    note: { th: 'ถามสเปก ขอใบเสนอราคา หรือให้ช่วยเลือก', en: 'Ask about specs, request a quote, or let us help you choose.' },
  },
  about: {
    href: '/about/',
    label: { th: 'เกี่ยวกับเรา', en: 'About us' },
    note: { th: 'ยี่สิบห้าปีของการคัดสรร และเกณฑ์ที่เราใช้', en: 'Twenty-five years of curating, and the standard we hold.' },
  },
  info: {
    href: '/info/careandclean/',
    label: { th: 'การดูแลรักษา', en: 'Care & cleaning' },
    note: { th: 'ล้างอย่างไรให้ผิวเคลือบอยู่กับคุณไปนาน', en: 'How to clean it so the finish outlives the warranty.' },
  },
  warranty: {
    href: '/info/warranty/',
    label: { th: 'เงื่อนไขรับประกัน', en: 'Warranty' },
    note: { th: 'อะไรคุ้ม อะไรไม่คุ้ม และนานแค่ไหน', en: 'What is covered, what is not, and for how long.' },
  },
} satisfies Record<string, CtaLink>;

type BandCopy = Omit<CtaBand, 'links'> & { links: CtaLink[] };

const CONTINUE: Localized = { th: 'ไปต่อ', en: 'WHERE TO NEXT' };

/**
 * แถบของแต่ละกลุ่มหน้า
 *
 * คีย์คือส่วนแรกของ path ('products', 'finish', …) และ `''` คือหน้าแรก
 * หน้าย่อยใช้แถบเดียวกับหน้ารวมของมัน เว้นแต่ที่ระบุแยกไว้ใน bandFor
 */
const BANDS: Record<string, BandCopy> = {
  '': {
    kicker: CONTINUE,
    title: { th: 'ของแบบนี้ต้องเห็นด้วยตา', en: 'Some things you have to see' },
    body: {
      th: 'รูปบอกได้แค่ครึ่งเดียว น้ำหนักของก๊อกในมือ เสียงที่บานปิด และเฉดผิวเคลือบใต้ไฟจริง เหลืออีกครึ่งที่โชว์รูม',
      en: 'A photograph gets you halfway. The weight of a faucet in your hand, the sound a door makes closing, a finish under real light — the other half is in the showroom.',
    },
    links: [GO.products, GO.stores, GO.contact],
  },
  products: {
    kicker: CONTINUE,
    title: { th: 'เลือกไม่ถูกใช่ไหม', en: 'Not sure which one' },
    body: {
      th: 'รุ่นที่ต่างกันนิดเดียวมีเยอะ และความต่างที่สำคัญมักไม่ได้อยู่ในรูป บอกเราว่าครัวเป็นอย่างไรแล้วเราช่วยตัดตัวเลือกให้เหลือสองสามตัว',
      en: 'Models differ by very little, and the differences that matter rarely show in a photograph. Tell us about the kitchen and we will cut it down to two or three.',
    },
    links: [GO.palette, GO.stores, GO.contact],
  },
  finish: {
    kicker: CONTINUE,
    title: { th: 'เฉดเดียวกัน ทั้งครัว', en: 'One finish, the whole kitchen' },
    body: {
      th: 'เฉดผิวเคลือบเป็นสิ่งที่ตาจับได้ก่อนรูปทรง เลือกเฉดให้ตรงกันทั้งก๊อก ขอบอ่าง และมือจับตู้ แล้วครัวจะดูเหมือนถูกออกแบบมา ไม่ใช่ถูกซื้อมา',
      en: 'The eye reads finish before it reads form. Match it across the faucet, the sink rim and the cabinet pulls and the kitchen looks designed rather than assembled.',
    },
    links: [GO.products, GO.gallery, GO.stores],
  },
  palette: {
    kicker: CONTINUE,
    title: { th: 'เห็นเฉดแล้ว ดูของจริงต่อ', en: 'You have the finish — now the object' },
    body: {
      th: 'เฉดหนึ่งเฉดใช้ได้กับหลายสิบรายการ กรองแคตตาล็อกด้วยเฉดที่เพิ่งดู แล้วจะเห็นว่ามีอะไรให้เลือกบ้าง',
      en: 'A single finish runs across dozens of items. Filter the catalogue by the one you just looked at and see what it covers.',
    },
    links: [GO.products, GO.gallery, GO.stores],
  },
  gallery: {
    kicker: CONTINUE,
    title: { th: 'เห็นแล้วอยากรู้ว่าเป็นรุ่นอะไร', en: 'Found something in there' },
    body: {
      th: 'ทุกชิ้นในสนามลึกเป็นของที่มีจริงในแคตตาล็อก กดที่ชิ้นไหนก็ไปหน้าของมันได้ตรง ๆ พร้อมสเปกและเฉดที่มี',
      en: 'Everything in the field is a real item in the catalogue. Click any of it and you land on its page, specs and finishes included.',
    },
    links: [GO.products, GO.palette, GO.stores],
  },
  collections: {
    kicker: CONTINUE,
    title: { th: 'ทั้งห้องในภาษาเดียวกัน', en: 'A room that speaks one language' },
    body: {
      th: 'คอลเลกชันคือชุดที่ออกแบบมาให้เข้ากันตั้งแต่ต้น เลือกทั้งชุดง่ายกว่าไล่จับคู่ทีละชิ้น และผลลัพธ์นิ่งกว่า',
      en: 'A collection is designed to agree with itself from the start. Choosing the set is easier than matching piece by piece, and it holds together better.',
    },
    links: [GO.products, GO.ideas, GO.stores],
  },
  guides: {
    kicker: CONTINUE,
    title: { th: 'อ่านจบแล้ว ลองของจริง', en: 'You have read it — now handle it' },
    body: {
      th: 'คู่มือบอกว่าควรดูอะไร แต่ความรู้สึกตอนโยกก้านก๊อกหรือเสียงที่อ่างสเตนเลสตอบกลับ ไม่มีตัวหนังสือไหนแทนได้',
      en: 'A guide tells you what to look for. What a lever feels like turning, what a steel bowl sounds like under a dropped pan — no amount of text stands in for that.',
    },
    links: [GO.products, GO.stores, GO.contact],
  },
  ideas: {
    kicker: CONTINUE,
    title: { th: 'ห้องนี้ประกอบจากของที่มีจริง', en: 'These rooms are made of real things' },
    body: {
      th: 'ไม่ใช่ภาพเรนเดอร์ ทุกชิ้นในห้องเหล่านี้อยู่ในแคตตาล็อก และเรายินดีช่วยไล่ว่าห้องของคุณต้องใช้อะไรบ้าง',
      en: 'Not renders. Every piece in these rooms is in the catalogue, and we are glad to work out what yours would need.',
    },
    links: [GO.products, GO.guides, GO.contact],
  },
  articles: {
    kicker: CONTINUE,
    title: { th: 'อ่านต่อ หรือลงมือเลย', en: 'Read on, or get started' },
    body: {
      th: 'ถ้ากำลังอยู่ระหว่างตัดสินใจ คู่มือเลือกซื้อจะตรงกว่าบทความ และถ้าตัดสินใจแล้ว โชว์รูมคือขั้นถัดไป',
      en: 'If you are still deciding, the buying guides are more use than the essays. If you have decided, the showroom is the next step.',
    },
    links: [GO.guides, GO.ideas, GO.stores],
  },
  stores: {
    kicker: CONTINUE,
    title: { th: 'ก่อนออกจากบ้าน', en: 'Before you set out' },
    body: {
      th: 'โทรบอกเราล่วงหน้าว่าสนใจอะไร เราจะได้เตรียมของไว้ให้ดู และบอกได้ว่ารุ่นที่คุณอยากเห็นอยู่ที่สาขาไหน',
      en: 'Call ahead with what you want to see. We will have it out for you, and we can tell you which branch holds it.',
    },
    links: [GO.contact, GO.products, GO.about],
  },
  contact: {
    kicker: CONTINUE,
    title: { th: 'ระหว่างรอเราตอบ', en: 'While you wait to hear back' },
    body: {
      th: 'ถ้ายังไม่แน่ใจว่าจะถามอะไร ลองไล่ดูแคตตาล็อกหรือคู่มือเลือกซื้อก่อน คำถามจะชัดขึ้นเอง',
      en: 'If you are not sure what to ask yet, walk the catalogue or a buying guide first. The question tends to sharpen itself.',
    },
    links: [GO.products, GO.guides, GO.stores],
  },
  about: {
    kicker: CONTINUE,
    title: { th: 'เกณฑ์ที่ว่ามา ดูได้จากของ', en: 'The standard, in objects' },
    body: {
      th: 'ที่เล่ามาทั้งหมดตัดสินกันที่ของบนชั้น ไม่ใช่ที่หน้าเว็บ แวะมาดูแล้วตัดสินเองว่าจริงไหม',
      en: 'All of it is settled by what is on the shelf, not by this page. Come and judge it yourself.',
    },
    links: [GO.products, GO.stores, GO.contact],
  },
  info: {
    kicker: CONTINUE,
    title: { th: 'ยังไม่ได้คำตอบใช่ไหม', en: 'Still not answered' },
    body: {
      th: 'หน้าข้อมูลตอบเรื่องทั่วไปได้ แต่ของแต่ละรุ่นมีเงื่อนไขต่างกัน ถามมาตรง ๆ เร็วกว่าอ่านไล่',
      en: 'These pages cover the general case. Individual models carry their own terms — asking is faster than reading around it.',
    },
    links: [GO.contact, GO.warranty, GO.stores],
  },
};

/** หน้าสินค้ารายชิ้น — ต่างจากหน้ารวม เพราะผู้อ่านเจาะจงมาแล้ว */
const PRODUCT_DETAIL: BandCopy = {
  kicker: CONTINUE,
  title: { th: 'สนใจชิ้นนี้', en: 'Interested in this one' },
  body: {
    th: 'ถามได้เลยว่ามีของพร้อมส่งไหม เฉดไหนสั่งได้บ้าง และติดตั้งกับหน้างานแบบคุณได้หรือเปล่า',
    en: 'Ask us whether it is in stock, which finishes we can order, and whether it fits the space you have.',
  },
  links: [GO.contact, GO.stores, GO.info],
};

/** บทความรายชิ้น */
const ARTICLE_DETAIL: BandCopy = {
  kicker: CONTINUE,
  title: { th: 'จากเรื่องนี้ ไปต่อได้ที่', en: 'Where this leads' },
  body: {
    th: 'เรื่องที่เพิ่งอ่านจบลงที่ของจริงเสมอ — ไม่ว่าจะเป็นรุ่นที่พูดถึง วิธีดูแลมัน หรือห้องที่ใช้มันอยู่',
    en: 'What you just read ends in an object — the model itself, how to keep it, or a room already living with it.',
  },
  links: [GO.products, GO.ideas, GO.info],
};

const FALLBACK: BandCopy = BANDS[''];

/**
 * เลือกแถบจาก path ที่ตัดคำนำหน้าภาษาออกแล้ว
 *
 * `/products/` กับ `/products/xxx/` ได้คนละแถบโดยตั้งใจ: หน้ารวมคือคนที่ยัง
 * เลือกไม่ถูก หน้ารายชิ้นคือคนที่เลือกได้แล้วและกำลังจะถามเรื่องของจริง
 */
export function ctaFor(path: string): CtaBand {
  const segments = path.split('/').filter(Boolean);
  const [section, slug] = segments;

  if (section === 'products' && slug) return PRODUCT_DETAIL;
  if (section === 'articles' && slug) return ARTICLE_DETAIL;

  return BANDS[section ?? ''] ?? FALLBACK;
}

/** หน้าที่ไม่ควรมีแถบนี้ — 404 ไม่มี "เนื้อหาของหน้านั้น" ให้ต่อ */
export function hasCta(path: string): boolean {
  return path !== '/404' && path !== '/404/' && !path.startsWith('/_');
}
