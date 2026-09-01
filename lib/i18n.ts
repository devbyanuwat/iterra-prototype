// ── i18n MOCK ──
// จุดเปลี่ยนเป็นของจริง #3: dictionary สองภาษาแบบง่ายสำหรับเดโม่
// ของจริงแนะนำย้ายไป next-intl / เส้นทาง /en แยก เพื่อ SEO ต่อภาษา
// ตอนนี้แปลครบ: เมนู, หน้าแรก, หน้าสินค้ารวม + ปุ่ม/ป้ายที่ใช้ร่วมกัน

export type Lang = 'th' | 'en';

/**
 * ต่อชื่อเข้ากับข้อความไทย โดยเว้นวรรคให้เฉพาะเมื่อชื่อขึ้นต้นด้วยอักษรละติน
 *
 * ไทยไม่เว้นวรรคระหว่างคำ 'เฉด' + 'ดำด้าน' จึงต้องเป็น 'เฉดดำด้าน' ติดกัน
 * แต่ชื่อเฉด 5 จาก 11 ตัวยังเป็นละติน (Vibrant Brushed Moderne Brass ฯลฯ)
 * ซึ่งพอชนกับไทยตรง ๆ จะได้ 'เฉดVibrant Brushed…' อ่านสะดุดและดูเหมือนพิมพ์ตก
 * เป็นกฎของภาษา ไม่ใช่ของ component จึงอยู่คู่กับสตริงที่นี่
 */
export const thaiJoin = (name: string) => (/^[฀-๿]/.test(name) ? '' : ' ') + name;

export const dict = {
  th: {
    nav: {
      home: 'หน้าแรก',
      about: 'เกี่ยวกับเรา',
      products: 'สินค้า',
      articles: 'บทความ',
      contact: 'ติดต่อเรา',
      showroom: 'นัดชมโชว์รูม',
    },
    common: {
      inquire: 'สอบถามสินค้านี้',
      finish: 'ผิวเคลือบ',
      chooseFinish: 'เลือกผิวเคลือบ',
      finishCount: (n: number) => `มี ${n} เฉดผิวเคลือบ`,
      priceOnRequest: 'สอบถามราคา',
      viewAll: 'ดูทั้งหมด',
      readMore: 'อ่านต่อ',
      explore: 'ชมคอลเลกชัน',
      scroll: 'เลื่อนเพื่อชม',
      category: { all: 'ทั้งหมด', kitchen: 'ครัว', bath: 'ห้องน้ำ' } as Record<string, string>,
    },
    home: {
      heroKicker: 'PREMIUM KITCHEN & BATH DEALER',
      heroTitle: 'ศิลปะของครัว\nที่คู่ควรกับบ้านคุณ',
      heroSub: 'คัดสรรอุปกรณ์ครัวและสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก สำหรับบ้านที่ไม่ประนีประนอมเรื่องดีไซน์',
      catTitle: 'สองโลกของเรา',
      catSub: 'เลือกเดินชมตามหมวดที่คุณกำลังมองหา',
      catKitchen: 'ครัว',
      catKitchenDesc: 'ซิงก์ · ก๊อก · เตา · เครื่องใช้บิลท์อิน · ชุดครัวสั่งตัด',
      catBath: 'ห้องน้ำ',
      catBathDesc: 'สุขภัณฑ์อัจฉริยะ · ฝักบัว · อ่างล้างหน้า · อ่างอาบน้ำ',
      featuredKicker: 'FEATURED COLLECTION',
      featuredTitle: 'สินค้าเด่นประจำฤดูกาล',
      featuredHint: 'เลื่อนลงเพื่อชมสินค้า — แนวนอน',
      // ── บล็อกใหม่ของหน้าแรก (สเปก 2026-09-01 §3.3) ──
      topFinishKicker: 'IN STOCK, IN DEPTH',
      topFinishTitle: 'ชิ้นเด่นจากสามเฉดที่เรามีลึกที่สุด',
      // ไม่บวกจำนวนสามเฉดเข้าด้วยกัน: สินค้าชิ้นเดียวอยู่ได้หลายเฉด ผลบวกจึงนับซ้ำ
      // (74+68+40 = 182 ซึ่งบังเอิญเท่ากับจำนวนสินค้าทั้งแคตตาล็อกพอดี อ่านแล้วเข้าใจผิดทันที)
      topFinishSub: (names: string) =>
        `${names} — สามเฉดที่เรามีของลึกที่สุด ทุกภาพข้างล่างเรนเดอร์ในเฉดของตัวเองจริง ไม่ใช่เฉดแรกของสินค้า`,
      catCount: (n: number) => `${n} รายการ`,
      paletteKicker: 'THE FULL PALETTE',
      paletteTitle: 'สิบเอ็ดเฉดที่เราสต็อกจริง',
      paletteSub: 'ทุกเฉดบนกำแพงหน้าแรกมีของอยู่ในโชว์รูม ไม่ใช่แค่ในแคตตาล็อก',
      showroomKicker: 'SHOWROOM',
      showroomAddressLabel: 'ที่อยู่',
      showroomHoursLabel: 'เวลาทำการ',
      showroomPhoneLabel: 'โทรศัพท์',
      showroomHours: 'เปิดทุกวัน 10:00 – 19:00 น.',
      storyKicker: 'OUR STORY',
      storySlides: [
        {
          title: 'เริ่มจากความเชื่อเรื่องงานฝีมือ',
          body: 'กว่า 25 ปีที่เราคัดสรรอุปกรณ์ครัวและสุขภัณฑ์ด้วยเกณฑ์เดียว — ต้องเป็นชิ้นที่เราอยากใช้ในบ้านของเราเอง',
        },
        {
          title: 'โชว์รูมที่ให้คุณ "ลองจริง"',
          body: 'ทุกก๊อกเปิดได้ ทุกฝักบัวมีน้ำไหล ทุกลิ้นชักเปิดปิดให้ฟังเสียง เพราะของพรีเมียมต้องพิสูจน์ได้ด้วยการสัมผัส',
        },
        {
          title: 'อยู่ด้วยกันจนหลังการติดตั้ง',
          body: 'ทีมช่างของเราเองดูแลตั้งแต่วัดหน้างาน ติดตั้ง จนถึงบริการหลังการขาย — รับประกันชิ้นงานสูงสุด 10 ปี',
        },
      ],
      statsTitle: 'ตัวเลขที่เราภูมิใจ',
      stats: [
        { value: 25, suffix: '+', label: 'ปีประสบการณ์' },
        { value: 480, suffix: '+', label: 'โครงการที่ส่งมอบ' },
        { value: 12, suffix: '', label: 'แบรนด์พาร์ทเนอร์ระดับโลก' },
        { value: 2, suffix: '', label: 'โชว์รูมในกรุงเทพฯ' },
      ],
      articlesKicker: 'JOURNAL',
      articlesTitle: 'บทความล่าสุด',
      ctaTitle: 'ให้เราช่วยสร้างครัวในฝันของคุณ',
      ctaSub: 'นัดหมายเข้าชมโชว์รูมพร้อมที่ปรึกษาส่วนตัว ไม่มีค่าใช้จ่าย',
      ctaBtn: 'นัดหมายชมโชว์รูม',
    },
    products: {
      kicker: 'COLLECTION',
      title: 'สินค้าทั้งหมด',
      sub: (n: number) => `อุปกรณ์ครัวและสุขภัณฑ์คัดสรร ${n} รายการ — ทุกชิ้นสัมผัสจริงได้ที่โชว์รูม`,
      filterLabel: 'หมวดหมู่',
      empty: 'ไม่พบสินค้าในหมวดนี้',
      specs: 'สเปกสินค้า',
      related: 'สินค้าใกล้เคียง',
      onlyFinish: 'สินค้าชิ้นนี้มีเฉดเดียว',
      inFinish: (name: string) => `ดูทุกชิ้นในเฉด${thaiJoin(name)}`,
    },
    // กำแพงผิวเคลือบ = หน้าแรก (spec finish-first §4.1)
    // ห้ามมี hero heading และห้ามมี category nav บนหน้านี้ ป้ายทั้งหมดที่นี่จึงเป็น
    // micro-caps สั้น ๆ ที่อธิบายวิธีใช้กำแพง ไม่ใช่พาดหัวโฆษณา
    wall: {
      label: 'กำแพงผิวเคลือบ',
      hint: 'เลือกผิวเคลือบเพื่อเข้าชม',
      keyHint: 'ลูกศรเดิน · Enter เข้า',
      enter: 'เข้าชม',
    },
    finish: {
      kicker: 'FINISH',
      title: (name: string) => `ทั้งห้องในเฉด${thaiJoin(name)}`,
      sub: (n: number) => `${n} ชิ้นในแคตตาล็อกมีเฉดนี้ — และทุกชิ้นข้างล่างนี้เรนเดอร์ในเฉดนี้จริง`,
      pieces: (n: number) => `${n} ชิ้น`,
      railLabel: 'สลับผิวเคลือบ',
      backToWall: 'กลับไปกำแพงผิวเคลือบ',
      empty: 'ไม่พบสินค้าในหมวดนี้สำหรับเฉดนี้',
      otherFinishes: 'เฉดอื่น',
    },
    articles: {
      kicker: 'JOURNAL',
    },
    contact: {
      title: 'ติดต่อเรา',
      sub: 'ทีมที่ปรึกษาพร้อมตอบทุกคำถาม ภายใน 24 ชั่วโมง',
      name: 'ชื่อ',
      email: 'อีเมลหรือเบอร์โทร',
      interest: 'สนใจสินค้าหมวด',
      message: 'ข้อความ',
      send: 'ส่งข้อความ',
      toast: 'ส่งข้อความเรียบร้อย เราจะติดต่อกลับภายใน 24 ชม. (เดโม่ — ยังไม่เชื่อมระบบจริง)',
    },
    footer: {
      blurb: 'ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม คัดสรรจากแบรนด์ชั้นนำระดับโลก',
      nav: 'เมนู',
      contact: 'ติดต่อ',
      rights: 'สงวนลิขสิทธิ์',
    },
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      products: 'Products',
      articles: 'Journal',
      contact: 'Contact',
      showroom: 'Book a Visit',
    },
    common: {
      inquire: 'Inquire about this piece',
      finish: 'Finish',
      chooseFinish: 'Choose a finish',
      finishCount: (n: number) => `${n} finishes available`,
      priceOnRequest: 'Price on request',
      viewAll: 'View all',
      readMore: 'Read more',
      explore: 'Explore the collection',
      scroll: 'Scroll to explore',
      category: { all: 'All', kitchen: 'Kitchen', bath: 'Bath' } as Record<string, string>,
    },
    home: {
      heroKicker: 'PREMIUM KITCHEN & BATH DEALER',
      heroTitle: 'The Art of the Kitchen,\nWorthy of Your Home',
      heroSub: 'A curated selection of kitchen equipment and sanitary ware from the world’s finest brands — for homes that never compromise on design.',
      catTitle: 'Two Worlds',
      catSub: 'Browse by the space you are dreaming about',
      catKitchen: 'Kitchen',
      catKitchenDesc: 'Sinks · Faucets · Hobs · Built-in appliances · Bespoke kitchens',
      catBath: 'Bath',
      catBathDesc: 'Intelligent toilets · Showers · Basins · Bathtubs',
      featuredKicker: 'FEATURED COLLECTION',
      featuredTitle: 'This Season’s Highlights',
      featuredHint: 'Keep scrolling — the gallery moves sideways',
      topFinishKicker: 'IN STOCK, IN DEPTH',
      topFinishTitle: 'Highlights from our three deepest finishes',
      topFinishSub: (names: string) =>
        `${names} — the three finishes we stock deepest. Every frame below is rendered in its own finish, not in the product’s first one.`,
      catCount: (n: number) => `${n} pieces`,
      paletteKicker: 'THE FULL PALETTE',
      paletteTitle: 'The eleven finishes we actually stock',
      paletteSub: 'Every finish on the wall upstairs is on the showroom floor, not just in the catalogue.',
      showroomKicker: 'SHOWROOM',
      showroomAddressLabel: 'Address',
      showroomHoursLabel: 'Opening hours',
      showroomPhoneLabel: 'Phone',
      showroomHours: 'Open daily 10:00 – 19:00',
      storyKicker: 'OUR STORY',
      storySlides: [
        {
          title: 'Born from a belief in craft',
          body: 'For over 25 years we have curated kitchen and bath pieces with a single criterion — would we want this in our own home?',
        },
        {
          title: 'A showroom you can actually try',
          body: 'Every faucet runs, every shower flows, every drawer glides. Premium quality should be proven by touch.',
        },
        {
          title: 'With you long after installation',
          body: 'Our own team handles survey, installation and after-sales care — with warranties of up to 10 years.',
        },
      ],
      statsTitle: 'Numbers we are proud of',
      stats: [
        { value: 25, suffix: '+', label: 'Years of experience' },
        { value: 480, suffix: '+', label: 'Projects delivered' },
        { value: 12, suffix: '', label: 'World-class brand partners' },
        { value: 2, suffix: '', label: 'Showrooms in Bangkok' },
      ],
      articlesKicker: 'JOURNAL',
      articlesTitle: 'Latest Stories',
      ctaTitle: 'Let us build the kitchen you dream of',
      ctaSub: 'Book a private showroom visit with a personal consultant — free of charge.',
      ctaBtn: 'Book a showroom visit',
    },
    products: {
      kicker: 'COLLECTION',
      title: 'All Products',
      sub: (n: number) => `${n} curated kitchen and bath pieces — every one on display at our showroom.`,
      filterLabel: 'Category',
      empty: 'No products in this category',
      specs: 'Specifications',
      related: 'Related pieces',
      onlyFinish: 'Available in this finish only',
      inFinish: (name: string) => `See everything in ${name}`,
    },
    wall: {
      label: 'The finish wall',
      hint: 'Choose a finish to enter',
      keyHint: 'Arrows to walk · Enter to open',
      enter: 'Enter',
    },
    finish: {
      kicker: 'FINISH',
      title: (name: string) => `The whole room in ${name}`,
      sub: (n: number) =>
        `${n} pieces in the catalogue carry this finish — and every one below is rendered in it.`,
      pieces: (n: number) => `${n} pieces`,
      railLabel: 'Switch finish',
      backToWall: 'Back to the finish wall',
      empty: 'No pieces in this category for this finish',
      otherFinishes: 'Other finishes',
    },
    articles: {
      kicker: 'JOURNAL',
    },
    contact: {
      title: 'Contact Us',
      sub: 'Our consultants reply within 24 hours',
      name: 'Name',
      email: 'Email or phone',
      interest: 'Interested in',
      message: 'Message',
      send: 'Send message',
      toast: 'Message sent — we will get back to you within 24 hours. (Demo only)',
    },
    footer: {
      blurb: 'Premium kitchen & bath dealer, curated from the world’s finest brands.',
      nav: 'Menu',
      contact: 'Contact',
      rights: 'All rights reserved',
    },
  },
};

export type Dict = (typeof dict)['th'];


// ── เนื้อหาที่ยังไม่มีฉบับภาษาอังกฤษ ──
// ป้าย UI ทั้งหมดอยู่ใน dict ด้านบนและแปลครบสองภาษาแล้ว
// ส่วนด้านล่างนี้เป็น "เนื้อหาบรรณาธิการ" ที่เขียนไว้ภาษาไทยอย่างเดียว
// จึงประกาศ en เป็น optional: ถ้ายังไม่มีให้ตกกลับไปใช้ไทย ไม่ใช่ปล่อยว่าง
// นักแปลเติมฟิลด์ en ได้ทีละอันโดยไม่ต้องแก้ component
export type Localized = { th: string; en?: string };

/** เลือกภาษา แล้วตกกลับเป็นไทยเมื่อยังไม่มีฉบับอังกฤษ */
export const pick = (v: Localized, lang: Lang) => (lang === 'en' ? (v.en ?? v.th) : v.th);

/** บทนำหน้ารวมบทความ — ยังไม่มีฉบับอังกฤษ */
export const articlesIntro: Localized = {
  th: 'ไอเดียครัวสไตล์โชว์รูม คู่มือเลือกซื้อ และเรื่องเล่าจากหน้างานจริง',
};

export const aboutContent = {
  kicker: { th: 'OUR STORY', en: 'OUR STORY' },
  title: { th: '25 ปีของการคัดสรร\nสิ่งที่ดีที่สุดให้บ้านคุณ' },
  sections: [
    {
      kicker: { th: '2001 — จุดเริ่มต้น' },
      title: { th: 'จากร้านห้องแถวหนึ่งคูหา' },
      body: {
        th: 'KOHLER เริ่มต้นจากร้านอุปกรณ์ครัวเล็ก ๆ บนถนนสุขุมวิท ด้วยความเชื่อว่า "ของดีต้องให้ลูกค้าจับก่อนซื้อ" เราจึงแกะทุกกล่อง ต่อน้ำเข้าทุกก๊อก และเปิดให้ลองตั้งแต่วันแรก — ธรรมเนียมที่ยังทำอยู่จนถึงวันนี้',
      },
    },
    {
      kicker: { th: 'CURATION — วิธีคัดสรร' },
      title: { th: 'เกณฑ์เดียว: บ้านเราใช้เองได้ไหม' },
      body: {
        th: 'ทุกชิ้นที่อยู่ในโชว์รูมผ่านการใช้จริงโดยทีมงานอย่างน้อยสามเดือน ชิ้นไหนไม่ผ่านมือเรา ไม่มีสิทธิ์ผ่านตาลูกค้า ปัจจุบันเราเป็นดีลเลอร์อย่างเป็นทางการของแบรนด์ชั้นนำ 12 แบรนด์จากยุโรปและเอเชีย',
      },
    },
    {
      kicker: { th: 'SHOWROOM — พื้นที่ของเรา' },
      title: { th: 'โชว์รูมที่ออกแบบเหมือนบ้านจริง' },
      body: {
        th: 'เราจัดโชว์รูมเป็นห้องครัวและห้องน้ำขนาดเท่าของจริง ไม่ใช่ชั้นวางสินค้า เพื่อให้คุณเห็นว่าซิงก์ตัวนี้อยู่กับท็อปหินสีนี้แล้วเป็นอย่างไร แสงตอนเย็นตกกระทบก๊อกทองเหลืองแล้วให้อารมณ์แบบไหน',
      },
    },
    {
      kicker: { th: 'SERVICE — หลังการขาย' },
      title: { th: 'ทีมช่างของเราเอง ไม่ใช่ผู้รับเหมาช่วง' },
      body: {
        th: 'งานวัดหน้างาน ติดตั้ง และบริการหลังการขายทั้งหมดดูแลโดยทีมช่างประจำของ KOHLER ที่ผ่านการอบรมจากแบรนด์โดยตรง พร้อมรับประกันงานติดตั้งและตัวสินค้าสูงสุด 10 ปี',
      },
    },
  ],
} satisfies {
  kicker: Localized;
  title: Localized;
  sections: { kicker: Localized; title: Localized; body: Localized }[];
};
