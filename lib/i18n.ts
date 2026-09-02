// ── i18n ──
// Two-language dictionary for the prototype. A real build should move to
// next-intl with a /th and /en route each — see the note on DEFAULT_LANG.

export type Lang = 'th' | 'en';

/**
 * The language the exported HTML actually contains.
 *
 * This is a static export: one HTML file per route, and whatever language is in
 * that file is what a crawler, a link preview, a no-JS reader and the first
 * paint all get. The other language is a client-side switch restored from
 * localStorage. So this constant is not a preference — it decides which
 * language is *real* and which is a JS enhancement.
 *
 * Everything that has to agree with it reads it from here: <html lang> and the
 * pre-paint restore script in app/layout.tsx, the initial state in
 * LangProvider, the root metadata, and the JSON-LD.
 *
 * The honest limit of this arrangement, and the reason there is no hreflang
 * anywhere in this repo: hreflang describes *alternate URLs*, one per language.
 * We have one URL per route serving both languages through JS, so there is no
 * second URL to point at, and declaring one would be a claim we cannot back.
 * The fix is a real /en route tree, not a meta tag — see scratchpad/task-b3.md.
 */
export const DEFAULT_LANG: Lang = 'en';

/** The language that has to be restored from storage, whichever that is. */
export const ALT_LANG: Lang = DEFAULT_LANG === 'en' ? 'th' : 'en';

/**
 * ต่อชื่อเข้ากับข้อความไทย โดยเว้นวรรคให้เฉพาะเมื่อชื่อขึ้นต้นด้วยอักษรละติน
 *
 * ไทยไม่เว้นวรรคระหว่างคำ 'เฉด' + 'ดำด้าน' จึงต้องเป็น 'เฉดดำด้าน' ติดกัน
 * แต่ชื่อเฉด 5 จาก 11 ตัวยังเป็นละติน (Vibrant Brushed Moderne Brass ฯลฯ)
 * ซึ่งพอชนกับไทยตรง ๆ จะได้ 'เฉดVibrant Brushed…' อ่านสะดุดและดูเหมือนพิมพ์ตก
 * เป็นกฎของภาษา ไม่ใช่ของ component จึงอยู่คู่กับสตริงที่นี่
 */
export const thaiJoin = (name: string) => (/^[฀-๿]/.test(name) ? '' : ' ') + name;

const dictSource = {
  th: {
    nav: {
      home: 'หน้าแรก',
      about: 'เกี่ยวกับเรา',
      products: 'สินค้า',
      articles: 'บทความ',
      contact: 'ติดต่อเรา',
      showroom: 'นัดชมโชว์รูม',
      gallery: 'แกลเลอรี',
    },
    // ป้ายที่มีแต่ screen reader ได้ยิน เคยฮาร์ดโค้ดไทยไว้ใน Nav/Footer
    // ตอนที่เอกสารเป็นไทยเสมอมันก็พอถูก แต่ตอนนี้ HTML ที่ export เป็นอังกฤษ
    // aria-label ภาษาไทยใน document ที่ประกาศ lang=en คือป้ายที่ผิดภาษาจริง ๆ
    a11y: {
      menuMain: 'เมนูหลัก',
      menuMobile: 'เมนูมือถือ',
      menuOpen: 'เปิดเมนู',
      menuClose: 'ปิดเมนู',
      langSwitch: 'เลือกภาษา',
    },
    // ข้อความของ <head> เคยฮาร์ดโค้ดไทยไว้ใน app/layout.tsx ทั้งก้อน
    // ย้ายมาที่นี่เพราะมันต้องเปลี่ยนตาม DEFAULT_LANG ไม่ใช่ค่าคงที่ของเว็บ
    seo: {
      tagline: 'อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
      description:
        'KOHLER ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม คัดสรรซิงก์ ก๊อก เตา เครื่องใช้บิลท์อิน และสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก พร้อมโชว์รูมให้สัมผัสจริงในกรุงเทพฯ',
      ogDescription: 'คัดสรรอุปกรณ์ครัวและสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก',
      orgDescription: 'ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
      ogLocale: 'th_TH',
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
      // คำบรรยายใต้ภาพห้องบนหน้าสินค้า — บอกว่าเป็นภาพบรรยากาศห้อง ไม่ได้อ้างว่า
      // สินค้าชิ้นนี้อยู่ในภาพ (คลังภาพไม่มีข้อมูลว่าห้องไหนมีอะไรอยู่)
      inSitu: 'บรรยากาศห้องจริงจากคลังภาพของแบรนด์',
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
    // ประตูเข้า + สนามภาพเชิงลึก (spec 2026-09-01-kohler-depth-field)
    gate: {
      fieldLabel: 'สนามภาพสินค้าและห้องตัวอย่าง',
      // ปุ่มของประตูเข้าเคยเป็นค่า default ภาษาไทยฝังอยู่ใน Preloader.tsx
      // มันคือข้อความแรกที่คนเห็นก่อนอย่างอื่นทั้งหมด ปล่อยเป็นไทยใน HTML ที่
      // ประกาศ lang=en ไม่ได้ app/layout.tsx จึงส่งค่าจากที่นี่เข้าไปแทน
      enter: 'เข้าสู่โชว์รูม',
      stalled: 'เข้าสู่โชว์รูม — ข้ามการโหลด',
    },
    gallery: {
      kicker: 'GALLERY',
      title: 'สนามภาพเชิงลึก',
      sub: (n: number) =>
        `${n} ชิ้นลอยอยู่ในสนาม เลื่อนเมาส์เพื่อเดินดู คลิกเพื่อเปิดชิ้นนั้นในเฉดที่กำลังมองอยู่`,
      fieldLabel: 'สนามภาพสินค้า',
      hint: 'เลื่อนเมาส์เพื่อเดินดูสนาม',
      keyHint: 'Tab ไล่ทีละชิ้น · Enter เปิด',
      toIndex: 'มุมมองดัชนี',
      toField: 'มุมมองสนาม',
      indexLabel: 'ดัชนีสินค้าในสนาม',
      indexHint: 'สนาม 3 มิติหาของเฉพาะเจาะจงไม่ได้ — รายการนี้คือของชุดเดียวกันแบบค้นได้',
      viewAll: 'ดูแคตตาล็อกทั้งหมด',
    },
    articles: {
      kicker: 'JOURNAL',
      // บทความทั้งหมดเป็นของ KOHLER คัดลอกมาทั้งข้อความและภาพ ไม่ได้เขียนเอง
      // ป้ายนี้จึงอยู่บนการ์ดทุกใบและบนหัวบทความ ไม่ใช่ซ่อนไว้ท้ายหน้า
      source: 'ต้นฉบับที่ kohler.co.th',
      sourceNote: 'บทความและภาพทั้งหมดเป็นของ KOHLER',
    },
    video: {
      play: 'เล่นวิดีโอ',
      // ประกาศก่อนกด ไม่ใช่หลังกด — หน้านี้ตั้งใจไม่ติดต่อ YouTube จนกว่าจะกด
      source: 'เล่นจาก YOUTUBE',
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
      // เวลาทำการเคยอ่านจาก CONTACT.hours_th ตรง ๆ ท้ายเว็บจึงเป็นไทยค้างตอนสลับ EN
      hours: 'เปิดทุกวัน 10:00 – 19:00 น.',
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
      gallery: 'Gallery',
    },
    a11y: {
      menuMain: 'Main menu',
      menuMobile: 'Mobile menu',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      langSwitch: 'Choose language',
    },
    seo: {
      tagline: 'Premium Kitchen & Bath',
      description:
        'KOHLER — premium kitchen and bath dealer in Bangkok. Sinks, faucets, hobs, built-in appliances and sanitaryware from the world’s leading brands, with a showroom where every piece can be touched, opened and run.',
      ogDescription: 'Premium kitchen and bath, curated from the world’s leading brands.',
      orgDescription: 'Premium kitchen and bath dealer',
      ogLocale: 'en_US',
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
      inSitu: 'A room from the brand’s own photography',
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
    gate: {
      fieldLabel: 'A field of product and room photography',
      enter: 'Enter the showroom',
      stalled: 'Enter the showroom — skip loading',
    },
    gallery: {
      kicker: 'GALLERY',
      title: 'The depth field',
      sub: (n: number) =>
        `${n} pieces suspended in space. Move the mouse to walk through them; click one to open it in the finish you are looking at.`,
      fieldLabel: 'A field of product photography',
      hint: 'Move the mouse to walk the field',
      keyHint: 'Tab piece by piece · Enter to open',
      toIndex: 'Index view',
      toField: 'Field view',
      indexLabel: 'Index of the pieces in the field',
      indexHint: 'A 3D field cannot be searched — this is the same set, in a list you can scan.',
      viewAll: 'See the whole catalogue',
    },
    articles: {
      kicker: 'JOURNAL',
      source: 'Original on kohler.co.th',
      sourceNote: 'Every article and image here is KOHLER’s',
    },
    video: {
      play: 'Play video',
      source: 'PLAYS FROM YOUTUBE',
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
      hours: 'Open daily 10:00 – 19:00',
    },
  },
};

export type Dict = (typeof dictSource)['th'];

/**
 * `Record<Lang, Dict>`, not a bare `export const dict = {…}`.
 *
 * Dict is derived from the Thai half, and until now the English half was not
 * checked against it at all — a missing key would have compiled fine and
 * rendered `undefined` at runtime. That was survivable while Thai was the
 * default and English was an opt-in switch. It is not survivable now that
 * English is what every exported HTML file contains, so the annotation makes
 * tsc fail if the two halves ever drift. Currently 104 keys each, at parity.
 */
export const dict: Record<Lang, Dict> = dictSource;

// ── การจำภาษาที่เลือก ──
// อยู่ในไฟล์นี้เพราะทั้ง app/layout.tsx (server) และ LangProvider (client) ต้องใช้
// ถ้าประกาศไว้ใน LangProvider ซึ่งเป็น 'use client' ฝั่ง server จะได้ตัวแทน
// (client reference) มาแทนค่าจริง แล้วสคริปต์ก่อนวาดจะฝังสตริงผิดลงไปใน HTML
export const LANG_STORAGE_KEY = 'kohler:lang';
export const LANG_HIDE_ATTR = 'data-lang-restore';


// ── เนื้อหาที่ยังไม่มีฉบับภาษาอังกฤษ ──
// ป้าย UI ทั้งหมดอยู่ใน dict ด้านบนและแปลครบสองภาษาแล้ว
// ส่วนด้านล่างนี้เป็น "เนื้อหาบรรณาธิการ" ที่เขียนไว้ภาษาไทยอย่างเดียว
// จึงประกาศ en เป็น optional: ถ้ายังไม่มีให้ตกกลับไปใช้ไทย ไม่ใช่ปล่อยว่าง
// นักแปลเติมฟิลด์ en ได้ทีละอันโดยไม่ต้องแก้ component
export type Localized = { th: string; en?: string };

/** เลือกภาษา แล้วตกกลับเป็นไทยเมื่อยังไม่มีฉบับอังกฤษ */
export const pick = (v: Localized, lang: Lang) => (lang === 'en' ? (v.en ?? v.th) : v.th);

/**
 * Same choice as `pick`, but it also says which language actually came back.
 *
 * This matters now that the document declares English. `pick` silently returns
 * Thai when there is no English, which was fine when the page was Thai anyway —
 * the fallback and the document agreed. It does not agree any more: an English
 * document rendering Thai copy is a page whose `lang` is a lie, and a screen
 * reader will read Thai glyphs with an English voice.
 *
 * The fix is one attribute at the point of use, not a global rule:
 *
 *   const about = resolve(aboutContent.title, lang);
 *   <h1 lang={about.lang}>{about.text}</h1>
 *
 * `lang` on an element overrides `lang` on <html> for exactly the subtree that
 * needs it, so the rest of the page stays honestly English. It costs nothing
 * when the translation lands — `resolve` starts returning `lang: 'en'` and the
 * attribute becomes a no-op, so nobody has to remember to remove it.
 *
 * This is deliberately NOT wired into the Thai line-height floor, because that
 * floor does not need it: `h1..h4 { line-height: 1.6 }` and `.leading-thai` in
 * globals.css carry no `lang` selector, so Thai keeps its measured leading no
 * matter what the document declares. The one lang-scoped rule in the stylesheet
 * is `.en-tight`, which is opt-in and currently used by zero components.
 */
export const resolve = (v: Localized, lang: Lang): { text: string; lang: Lang } =>
  lang === 'en' && !v.en ? { text: v.th, lang: 'th' } : { text: pick(v, lang), lang };

/**
 * Editorial copy that has no English yet, as a flat list of paths.
 *
 * Kept as data rather than prose so it stays true: it is derived from the
 * content itself, so a field disappears from the list the moment a translation
 * lands, and nobody has to maintain a stale checklist in a spec. Consumed by
 * the report for task B3; safe for a check script to import later.
 */
export function untranslated(): string[] {
  const gaps: string[] = [];
  const check = (v: Localized, path: string) => {
    if (!v.en) gaps.push(path);
  };
  check(aboutContent.kicker, 'aboutContent.kicker');
  check(aboutContent.title, 'aboutContent.title');
  aboutContent.sections.forEach((section, i) => {
    check(section.kicker, `aboutContent.sections[${i}].kicker`);
    check(section.title, `aboutContent.sections[${i}].title`);
    check(section.body, `aboutContent.sections[${i}].body`);
  });
  return gaps;
}

/**
 * บทนำหน้ารวมบทความ
 *
 * เดิมบรรยายบทความที่เราแต่งขึ้นเองหกชิ้น ตอนนี้ lib/posts.ts เป็นบทความจริงของ
 * KOHLER ทั้งสิบชิ้น (ดู header ของไฟล์นั้น) บทนำจึงต้องพูดตรง ๆ ว่าเป็นของใคร
 * ไม่ใช่ปล่อยให้ผู้อ่านเข้าใจว่าเราเขียนเอง
 */
export const articlesIntro: Localized = {
  th: 'บทความและวิดีโอจาก KOHLER ทั้งหมด — ยกมาจาก kohler.co.th ไม่ได้เรียบเรียงใหม่',
  en: 'Articles and video from KOHLER — taken from kohler.co.th, not rewritten by us',
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
