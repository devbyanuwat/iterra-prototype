// ── i18n ──
// Two-language dictionary for the prototype. A real build should move to
// next-intl with a /th and /en route each — see the note on DEFAULT_LANG.

export type Lang = 'th' | 'en';

/**
 * The language served from the unprefixed route tree.
 *
 * This is a static export: one HTML file per route, and whatever language is in
 * that file is what a crawler, a link preview, a no-JS reader and the first
 * paint all get. Until task D3 there was exactly one tree, so this constant
 * decided which language was *real* and which was a JS enhancement.
 *
 * Both languages are real now. Every route is exported twice — English at its
 * bare path, Thai under /th/ — each prerendered in its own language, with its
 * own <html lang> from a per-tree root layout. So what this constant decides is
 * narrower and purely a URL question: which language gets the bare path and
 * which one carries the prefix. Flipping it moves the prefix to the other
 * language; nothing else has to change, because LANG_PREFIX below is derived
 * from it and every link, canonical, hreflang and sitemap entry is derived from
 * LANG_PREFIX.
 *
 * The old caveat here — that hreflang was unearnable because both languages
 * came from one URL — is gone with the second tree. There are two URLs per
 * route now, they reciprocate, and app/_lib/routes.ts declares them.
 */
export const DEFAULT_LANG: Lang = 'en';

/** The language that carries the URL prefix, whichever that is. */
export const ALT_LANG: Lang = DEFAULT_LANG === 'en' ? 'th' : 'en';

/**
 * The path prefix each tree lives under. Derived, never typed out twice.
 *
 * `''` for the default language and `/th` for the other one — so the exported
 * trees are `/products/` and `/th/products/`. Everything that builds a URL goes
 * through `langPath` or `treeUrl` rather than concatenating this itself.
 */
export const LANG_PREFIX = {
  [DEFAULT_LANG]: '',
  [ALT_LANG]: `/${ALT_LANG}`,
} as Record<Lang, string>;

/**
 * Move an in-site path into a language's tree.
 *
 * Deliberately conservative about what it will touch, because it sits under
 * every `<Link>` on the site (see components/Link.tsx): only root-relative
 * paths are prefixed. External URLs, protocol-relative URLs, `mailto:`, `tel:`,
 * bare hashes and query-only hrefs are returned untouched, and a path already
 * inside the tree is not prefixed twice.
 */
export function langPath(lang: Lang, href: string): string {
  const prefix = LANG_PREFIX[lang];
  if (!prefix || !href.startsWith('/') || href.startsWith('//')) return href;
  if (href === prefix || href.startsWith(`${prefix}/`)) return href;
  return `${prefix}${href}`;
}

/**
 * The inverse: which tree a pathname is in, and what the path is inside it.
 *
 * The language toggle needs this to answer "the same page, in the other
 * language" — it is the whole reason the toggle can keep the reader in place
 * instead of dropping them on a home page.
 */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  const prefix = LANG_PREFIX[ALT_LANG];
  if (pathname === prefix) return { lang: ALT_LANG, path: '/' };
  if (pathname.startsWith(`${prefix}/`)) {
    return { lang: ALT_LANG, path: pathname.slice(prefix.length) };
  }
  return { lang: DEFAULT_LANG, path: pathname };
}

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
      guides: 'คู่มือเลือกซื้อ',
      ideas: 'ไอเดีย',
      palette: 'สีและผิวเคลือบ',
      collections: 'คอลเลกชัน',
      stores: 'ร้านค้า',
      info: 'ข้อมูลและบริการ',
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
    // ── <title> และ <meta description> ของแต่ละหน้า ──
    //
    // เคยเขียนไทยฝังไว้ในไฟล์ page.tsx ทีละหน้า ซึ่งพอ ba10764 พลิกเอกสารเป็น
    // อังกฤษ ทุกหน้าก็เหลือ <title> ไทยอยู่ในเอกสารที่ประกาศ lang="en" — บั๊กที่
    // มองไม่เห็นบนหน้าจอ แต่เห็นเต็ม ๆ ในผลค้นหาและ link preview
    //
    // ตอนนี้มีสองต้นไม้จริง หน้าเดียวกันจึงต้องมีสองชุดจริง ๆ ไม่ใช่ชุดเดียวที่
    // เดาเอา คีย์ตรงกับ path ของหน้า และ Record<Lang, Dict> บังคับให้ทั้งสอง
    // ภาษามีครบเท่ากันเสมอ
    meta: {
      home: {
        title: 'KOHLER — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
        description:
          'อุปกรณ์ครัวและสุขภัณฑ์คัดสรรจากแบรนด์ชั้นนำระดับโลก — 182 รายการ สิบเอ็ดเฉดผิวเคลือบ สัมผัสจริงได้ที่โชว์รูม KOHLER กรุงเทพฯ',
      },
      about: {
        title: 'เกี่ยวกับเรา — เรื่องราวของ KOHLER',
        description:
          'กว่า 25 ปีของ KOHLER ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม จากร้านเล็กบนถนนสุขุมวิทสู่โชว์รูมที่ให้คุณสัมผัสของจริงทุกชิ้น',
      },
      products: {
        title: 'สินค้าทั้งหมด — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
        description:
          'สินค้าคัดสรร 182 รายการของ KOHLER — กรองตามเฉด หมวด และประเภทสินค้า พร้อมกำแพงสิบเอ็ดเฉดสำหรับเลือกจากผิวเคลือบ',
      },
      palette: {
        title: 'สีและผิวเคลือบทั้งหมด',
        description:
          'ทุกสีและผิวเคลือบที่ KOHLER ประกาศไว้ ยกมาจากหน้าอ้างอิงต้นทาง — พร้อมสิบเอ็ดเฉดที่เรามีของจริง ซึ่งห่างจากห้องที่มันเติมอยู่หนึ่งคลิก',
      },
      collections: {
        title: 'คอลเลกชัน',
        description:
          'สิบหกคอลเลกชันจากหน้ารวมของ KOHLER พร้อมชิ้นที่เรามีในแคตตาล็อกของแต่ละชุด และหมายเหตุตรง ๆ เมื่อหน้าของต้นทางหายไปแล้ว',
      },
      gallery: {
        title: 'แกลเลอรี — สนามภาพเชิงลึก',
        description:
          'สินค้าคัดสรรลอยอยู่ในสนามภาพเชิงลึก เลื่อนเมาส์เพื่อเดินดู คลิกเพื่อเปิดชิ้นนั้นในเฉดที่กำลังมองอยู่ — พร้อมมุมมองดัชนีสำหรับการค้นหา',
      },
      articles: {
        title: 'บทความ — ไอเดียครัวสไตล์โชว์รูม',
        description:
          'รวมบทความไอเดียครัวและห้องน้ำจาก KOHLER — วิธีจัดครัวให้เหมือนโชว์รูม คู่มือเลือกซื้อ และเทรนด์วัสดุพรีเมียม',
      },
      guides: {
        title: 'คู่มือเลือกซื้อ',
        description:
          'คู่มือเลือกซื้อของ KOHLER สิบสามชุด ยกมาจาก kohler.co.th ทั้งสองภาษา — ก๊อก อ่างล้างจาน สุขภัณฑ์ ฝักบัว เฟอร์นิเจอร์ห้องน้ำ และอื่น ๆ',
      },
      ideas: {
        title: 'ไอเดียแต่งห้อง',
        description:
          'ไอเดียห้องน้ำและห้องครัวจาก kohler.co.th ทั้งไทยและอังกฤษ — เรื่องไหนที่เรามีบทความอยู่แล้วจะเปิดอ่านในเว็บนี้ ไม่ต้องออกไปข้างนอก',
      },
      stores: {
        title: 'ร้านที่มีของจริงให้จับ',
        description:
          'ตัวแทนจำหน่าย KOHLER ในเขตกรุงเทพฯ และปริมณฑล พร้อมที่อยู่ เบอร์โทร และแผนที่ — ยกมาจากหน้าค้นหาร้านค้าของ kohler.co.th',
      },
      info: {
        title: 'ข้อมูลและบริการ',
        description:
          'คู่มือดูแลรักษา การรับประกัน แคตตาล็อก ข่าว และเรื่องขององค์กร — ยกมาจาก kohler.co.th',
      },
      contact: {
        title: 'ติดต่อเรา — นัดหมายชมโชว์รูม',
        description:
          'ติดต่อทีมที่ปรึกษา KOHLER สอบถามสินค้า นัดหมายเข้าชมโชว์รูมอุปกรณ์ครัวและสุขภัณฑ์พรีเมียมในกรุงเทพฯ ตอบกลับภายใน 24 ชั่วโมง',
      },
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
    // ── /palette และ /collections (task C2) ──
    // สองชุดนี้มาจาก lib/palette.generated.ts และ lib/collections.generated.ts
    // ซึ่งเก็บมาจาก /colorpalette และ /Collections ของ kohler.co.th
    palette: {
      kicker: 'COLOURS & FINISHES',
      title: 'สีและผิวเคลือบทั้งหมด',
      sub: (groups: number, finishes: number) =>
        `${groups} หมวดอ้างอิง รวม ${finishes} สีและผิวเคลือบ — ชุดเดียวกับที่ทั้งเว็บนี้ใช้เรียกชื่อเฉด`,
      groupsLabel: 'หมวดอ้างอิง',
      finishesIn: (n: number) => `${n} เฉดในหมวดนี้`,
      stockedTitle: 'สิบเอ็ดเฉดที่เรามีของจริง',
      stockedSub:
        'หน้าอ้างอิงข้างบนเป็นจานสีทั้งหมดของ KOHLER ส่วนข้างล่างนี้คือเฉดที่อยู่ในแคตตาล็อกของเราจริง กดเพื่อดูทั้งห้องในเฉดนั้น',
      inStock: (n: number) => `มีในแคตตาล็อก ${n} ชิ้น`,
      seeFinish: 'ดูทั้งห้องในเฉดนี้',
      notStocked: 'เฉดอ้างอิง — ยังไม่มีในแคตตาล็อกของเรา',
      backToIndex: 'กลับไปหน้าสีและผิวเคลือบ',
      sourceNote: 'หน้าอ้างอิงชุดนี้ต้นทางมีเฉพาะภาษาอังกฤษ ทั้งใน URL ไทยและอังกฤษ',
    },
    collections: {
      kicker: 'COLLECTIONS',
      title: 'คอลเลกชัน',
      sub: (n: number) => `${n} คอลเลกชันจากหน้ารวมของ KOHLER`,
      lead: 'เลือกทั้งห้องให้เป็นภาษาเดียวกัน — คอลเลกชันหนึ่งคือชุดที่ออกแบบมาให้อยู่ด้วยกัน',
      inCatalogue: (n: number) => `มีในแคตตาล็อกของเรา ${n} ชิ้น`,
      noPage: 'ต้นทางไม่มีหน้าของคอลเลกชันนี้แล้ว',
      noPageLong:
        'การ์ดใบนี้ยังอยู่บนหน้ารวมของ KOHLER แต่ลิงก์ที่มันชี้ไปตอบ 404 เราจึงเก็บการ์ดไว้ตามจริงและไม่สร้างหน้าปลอมขึ้นมาแทน',
      noProducts: 'ยังไม่มีชิ้นไหนของคอลเลกชันนี้ในแคตตาล็อกของเรา',
      sourceLabel: 'ลิงก์เดิมที่ต้นทาง',
    },
    // ── ร้านค้า (task C3) ──
    // ข้อมูลตัวแทนจำหน่ายเป็นภาษาไทยล้วนที่ต้นทาง (ดู storeSource.englishNote)
    // ป้ายรอบ ๆ จึงแปลได้ แต่ชื่อร้านกับที่อยู่แปลไม่ได้ ต้องประกาศ lang="th" แทน
    stores: {
      kicker: 'WHERE TO BUY',
      title: 'ร้านที่มีของจริงให้จับ',
      sub: (n: number) => `ตัวแทนจำหน่าย KOHLER ${n} แห่งในเขตกรุงเทพฯ และปริมณฑล`,
      kecLabel: 'KOHLER EXPERIENCE CENTER',
      kecNote: 'โชว์รูมของแบรนด์เอง เป็นที่เดียวในรายการนี้ที่ประกาศเวลาทำการไว้',
      dealers: 'ตัวแทนจำหน่าย',
      phone: 'โทร',
      hours: 'เวลาทำการ',
      map: 'เปิดในแผนที่',
      mapAria: (name: string) => `เปิด ${name} ใน Google Maps`,
      noPhone: 'ต้นทางไม่ได้ให้เบอร์โทรไว้',
      count: (n: number) => `${n} แห่ง`,
      // ข้อจำกัดของข้อมูล พูดไว้บนหน้าเลย ไม่ใช่ซ่อนในโค้ด
      limitTitle: 'ข้อมูลชุดนี้ครอบคลุมแค่ไหน',
      limitCap:
        'ต้นทางเรียงตามระยะห่างจากพิกัดกรุงเทพฯ ที่ตั้งไว้ แล้วตัดที่ 50 ราย และไม่มีปุ่มขอเพิ่ม นี่จึงไม่ใช่รายชื่อทั้งประเทศ',
      limitLang: 'ชื่อร้านและที่อยู่เป็นภาษาไทยล้วนที่ต้นทาง ไม่มีฉบับภาษาอังกฤษให้ดึง',
      limitFields:
        'ต้นทางให้มาแค่ ชื่อ ที่อยู่ เบอร์โทร และพิกัด ไม่มีอีเมล เว็บไซต์ รูปร้าน หรือประเภทร้าน และมีเวลาทำการเพียงแห่งเดียว',
      source: 'ที่มาของข้อมูล',
    },
    // ── หน้าข้อมูล (task C3) ──
    info: {
      kicker: 'INFORMATION',
      title: 'ข้อมูลและบริการ',
      sub: 'คู่มือดูแลรักษา การรับประกัน แคตตาล็อก ข่าว และเรื่องขององค์กร — ยกมาจาก kohler.co.th',
      readPage: 'อ่านหน้านี้',
      backToIndex: 'กลับไปหน้าข้อมูลทั้งหมด',
      downloads: 'ดาวน์โหลด',
      downloadPdf: 'เปิดไฟล์ PDF',
      pressTitle: 'ข่าวประชาสัมพันธ์',
      pressCount: (n: number) => `${n} รายการ`,
      readOnSource: 'อ่านต้นฉบับที่ kohler.co.th',
      sourceNote: 'เนื้อหาและภาพทั้งหมดเป็นของ KOHLER',
      // หน้า /faq ของต้นทางว่างจริง ๆ — ไม่แต่งคำถามคำตอบขึ้นมาเอง
      stubBadge: 'ต้นทางยังไม่มีเนื้อหา',
      // ป้ายสั้นสำหรับท้ายเว็บและการ์ดในดัชนี — stubTitle เป็นทั้งประโยค ยาวเกินคอลัมน์
      faqShort: 'คำถามที่พบบ่อย',
      stubTitle: 'หน้าคำถามที่พบบ่อยของ KOHLER ยังว่างอยู่',
      stubBody:
        'หน้า /faq ของ kohler.co.th มีอยู่จริงทั้งสองภาษา แต่ยังไม่มีคำถามหรือคำตอบอยู่ในนั้นเลย — หัวข้อเดียวบนหน้าคือคำว่า "Empty" เราจึงไม่แต่งคำถามคำตอบขึ้นมาเอง',
      stubWhere: 'คำตอบที่มีอยู่จริงอยู่ที่หน้าเหล่านี้',
      stubAsk: 'ถามเราโดยตรง',
      // /kohler-service-solution ไม่มี <h1> และไม่มีหัวข้อเลยที่ต้นทาง
      untitled: 'บริการหลังการขาย',
    },
    articles: {
      kicker: 'JOURNAL',
      // บทความทั้งหมดเป็นของ KOHLER คัดลอกมาทั้งข้อความและภาพ ไม่ได้เขียนเอง
      // ป้ายนี้จึงอยู่บนการ์ดทุกใบและบนหัวบทความ ไม่ใช่ซ่อนไว้ท้ายหน้า
      source: 'ต้นฉบับที่ kohler.co.th',
      sourceNote: 'บทความและภาพทั้งหมดเป็นของ KOHLER',
    },
    // คู่มือเลือกซื้อ (task C1) — ข้อมูลอยู่ใน lib/guides.generated.ts ซึ่งไม่มีชื่อ
    // ของคู่มือติดมาด้วย มีแต่ slug ชื่อทั้งสิบสามจึงอยู่ที่นี่ ไม่ใช่เดาจาก slug
    // ตอน render (ภาษาไทยเดาจาก slug ไม่ได้อยู่แล้ว)
    guides: {
      kicker: 'SHOPPING GUIDES',
      title: 'คู่มือเลือกซื้อ',
      intro: (n: number) => `คู่มือเลือกซื้อ ${n} ชุด ยกมาจาก kohler.co.th ทั้งหมด ไม่ได้เรียบเรียงใหม่`,
      sections: (n: number) => `${n} หมวด`,
      options: (n: number) => `${n} ตัวเลือก`,
      // ป้ายกำกับบล็อกที่ฉบับอังกฤษของต้นทางไม่มี — ดู enAvailable ในไฟล์ข้อมูล
      thaiOnly: 'ไทยเท่านั้น',
      gapNote: (missing: number, total: number) =>
        `${missing} จาก ${total} บล็อกในหน้านี้ไม่มีในฉบับภาษาอังกฤษของต้นทาง ระบบจึงแสดงข้อความไทยพร้อมป้ายกำกับ`,
      fullEn: 'ทุกบล็อกในหน้านี้มีทั้งไทยและอังกฤษที่ต้นทาง',
      enCoverage: (withEn: number, total: number) => `อังกฤษ ${withEn}/${total} บล็อก`,
      // ตัวเลือกในคู่มือเป็นภาพอ้างอิง ไม่ใช่ตัวกรองของเว็บนี้ — ลิงก์ต้นทางของมัน
      // ชี้ไปที่ kohler.co.th ซึ่งเป็นคนละแคตตาล็อกกับที่เราสต็อกจริง
      referenceNote: 'ตัวเลือกทั้งหมดเป็นภาพอ้างอิงจากคู่มือต้นฉบับ ไม่ใช่ตัวกรองสินค้าของเว็บนี้',
      browse: 'ดูของที่เรามีจริง',
    },
    ideas: {
      kicker: 'IDEAS',
      title: 'ไอเดียแต่งห้อง',
      intro: (n: number) =>
        `ไอเดีย ${n} ชุดจาก kohler.co.th — เรื่องไหนที่เรามีบทความอยู่แล้วจะพาไปอ่านในเว็บนี้ ที่เหลือลิงก์ไปต้นฉบับ`,
      stories: (n: number) => `${n} เรื่อง`,
      readHere: 'อ่านบทความ',
      names: {
        bathroom: 'ไอเดียห้องน้ำ',
        kitchen: 'ไอเดียห้องครัว',
      } as Record<string, string>,
    },
    guideNames: {
      'bathroom-accessories': 'อุปกรณ์เสริมห้องน้ำ',
      'bathroom-faucets': 'ก๊อกน้ำห้องน้ำ',
      'bathroom-furniture': 'เฟอร์นิเจอร์ห้องน้ำ',
      bathtubs: 'อ่างอาบน้ำ',
      'bidet-seat': 'ฝารองนั่งอัตโนมัติ',
      commercial: 'สินค้าสำหรับโครงการ',
      'kitchen-faucets': 'ก๊อกน้ำห้องครัว',
      'kitchen-sinks': 'อ่างล้างจาน',
      lavatories: 'อ่างล้างหน้า',
      'mirrored-cabinets': 'ตู้กระจกเงา',
      mirrors: 'กระจกเงา',
      showering: 'ฝักบัวและระบบอาบน้ำ',
      toilets: 'สุขภัณฑ์',
    } as Record<string, string>,
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
      guides: 'Guides',
      ideas: 'Ideas',
      palette: 'Colours & Finishes',
      collections: 'Collections',
      stores: 'Where to buy',
      info: 'Information',
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
    meta: {
      home: {
        title: 'KOHLER — Premium Kitchen & Bath',
        description:
          'Kitchen and bath curated from the world’s leading brands — 182 pieces, eleven finishes, all of them on the floor of our Bangkok showroom.',
      },
      about: {
        title: 'About — the KOHLER story',
        description:
          '25 years of KOHLER, premium kitchen and bath dealer: from one shophouse on Sukhumvit to a showroom where every piece can be touched, opened and run.',
      },
      products: {
        title: 'All products — premium kitchen and bath',
        description:
          '182 curated KOHLER pieces — filter by finish, by room and by type, with the eleven-finish wall for choosing from the surface rather than the spec.',
      },
      palette: {
        title: 'Colours & Finishes',
        description:
          'Every colour and finish KOHLER publishes, harvested from the source reference — and the eleven finishes we actually stock, each one a click from the room it fills.',
      },
      collections: {
        title: 'Collections',
        description:
          'The sixteen collections on KOHLER’s own index, with the pieces from each one that are in our catalogue — and a plain note where the source’s own page is gone.',
      },
      gallery: {
        title: 'Gallery — the depth field',
        description:
          'Curated pieces suspended in a field of depth. Move the mouse to walk through them, click one to open it in the finish you are looking at — with an index view for searching.',
      },
      articles: {
        title: 'Journal — kitchen ideas from the showroom floor',
        description:
          'Kitchen and bath stories from KOHLER — how to lay out a kitchen like a showroom, how to choose, and what the premium materials actually do.',
      },
      guides: {
        title: 'Shopping guides',
        description:
          'KOHLER shopping guides taken from kohler.co.th in both languages — 13 guides covering faucets, sinks, toilets, showering, bathroom furniture and more.',
      },
      ideas: {
        title: 'Ideas',
        description:
          'Bathroom and kitchen ideas from kohler.co.th, in Thai and English — with the articles we hold opening here rather than off-site.',
      },
      stores: {
        title: 'Where you can actually touch one',
        description:
          'KOHLER dealers across Bangkok and the surrounding provinces, with address, phone and map — taken from KOHLER’s own store finder.',
      },
      info: {
        title: 'Information & service',
        description:
          'Care, warranty, catalogues, press and the corporate pages — taken from kohler.co.th',
      },
      contact: {
        title: 'Contact us — book a showroom visit',
        description:
          'Talk to a KOHLER consultant, ask about a piece, or book a visit to the premium kitchen and bath showroom in Bangkok. We reply within 24 hours.',
      },
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
    palette: {
      kicker: 'COLOURS & FINISHES',
      title: 'Every colour and finish',
      sub: (groups: number, finishes: number) =>
        `${groups} reference groups, ${finishes} colours and finishes — the same set this whole site names its finishes from.`,
      groupsLabel: 'Reference groups',
      finishesIn: (n: number) => `${n} in this group`,
      stockedTitle: 'The eleven finishes we actually stock',
      stockedSub:
        'The reference pages above are KOHLER’s full palette. These are the finishes in our own catalogue — open one to see the whole room in it.',
      inStock: (n: number) => `${n} pieces in the catalogue`,
      seeFinish: 'See the whole room in this finish',
      notStocked: 'Reference finish — not in our catalogue',
      backToIndex: 'Back to colours & finishes',
      sourceNote: 'The source publishes this reference in English only, at both the Thai and English URLs.',
    },
    collections: {
      kicker: 'COLLECTIONS',
      title: 'Collections',
      sub: (n: number) => `${n} collections from KOHLER’s own index`,
      lead: 'A collection is a set designed to live together — one language for the whole room.',
      inCatalogue: (n: number) => `${n} pieces in our catalogue`,
      noPage: 'The source no longer has a page for this collection',
      noPageLong:
        'The card is still on KOHLER’s index, but the link behind it answers 404. We keep the card as it is and do not invent a page to replace it.',
      noProducts: 'None of this collection is in our catalogue yet',
      sourceLabel: 'Original link',
    },
    stores: {
      kicker: 'WHERE TO BUY',
      title: 'Where you can actually touch one',
      sub: (n: number) => `${n} KOHLER dealers across Bangkok and the surrounding provinces`,
      kecLabel: 'KOHLER EXPERIENCE CENTER',
      kecNote: 'The brand’s own showroom, and the only entry in this list that publishes its hours',
      dealers: 'Dealers',
      phone: 'Phone',
      hours: 'Hours',
      map: 'Open in Maps',
      mapAria: (name: string) => `Open ${name} in Google Maps`,
      noPhone: 'The source lists no phone number',
      count: (n: number) => `${n} branches`,
      limitTitle: 'What this list does and does not cover',
      limitCap:
        'The source ranks dealers by distance from one fixed Bangkok coordinate and stops at 50, with no control to ask for more. This is not the national list.',
      limitLang: 'Dealer names and addresses are Thai-only at source. There is no English version to pull.',
      limitFields:
        'The source carries name, address, phone and coordinates — no email, no website, no photograph, no store type, and opening hours for exactly one branch.',
      source: 'Where this came from',
    },
    info: {
      kicker: 'INFORMATION',
      title: 'Information & service',
      sub: 'Care, warranty, catalogues, press and the corporate pages — taken from kohler.co.th',
      readPage: 'Read this page',
      backToIndex: 'All information pages',
      downloads: 'Downloads',
      downloadPdf: 'Open the PDF',
      pressTitle: 'News and press releases',
      pressCount: (n: number) => `${n} items`,
      readOnSource: 'Read the original on kohler.co.th',
      sourceNote: 'Every page and image here is KOHLER’s',
      stubBadge: 'Empty at source',
      faqShort: 'Frequently asked questions',
      stubTitle: 'KOHLER’s FAQ page has nothing in it yet',
      stubBody:
        'kohler.co.th/faq is live in both languages and carries no questions and no answers — its only heading is the literal word “Empty”. So we have not written any, because inventing an FAQ and putting it under their name would be inventing what the brand says.',
      stubWhere: 'The answers that do exist are on these pages',
      stubAsk: 'Ask us directly',
      untitled: 'Service solutions',
    },
    articles: {
      kicker: 'JOURNAL',
      source: 'Original on kohler.co.th',
      sourceNote: 'Every article and image here is KOHLER’s',
    },
    guides: {
      kicker: 'SHOPPING GUIDES',
      title: 'Shopping guides',
      intro: (n: number) => `${n} shopping guides, taken from kohler.co.th — not rewritten by us.`,
      sections: (n: number) => `${n} sections`,
      options: (n: number) => `${n} options`,
      thaiOnly: 'Thai only',
      gapNote: (missing: number, total: number) =>
        `${missing} of ${total} blocks on this guide have no English at source. They are shown in Thai and marked.`,
      fullEn: 'Every block on this guide exists in both languages at source.',
      enCoverage: (withEn: number, total: number) => `${withEn}/${total} blocks in English`,
      referenceNote:
        'These options are reference imagery from the original guide, not filters on this site.',
      browse: 'See what we actually stock',
    },
    ideas: {
      kicker: 'IDEAS',
      title: 'Ideas',
      intro: (n: number) =>
        `${n} idea hubs from kohler.co.th — where we hold the article it opens here, otherwise it links to the original.`,
      stories: (n: number) => `${n} stories`,
      readHere: 'Read the article',
      names: {
        bathroom: 'Bathroom ideas',
        kitchen: 'Kitchen ideas',
      } as Record<string, string>,
    },
    guideNames: {
      'bathroom-accessories': 'Bathroom accessories',
      'bathroom-faucets': 'Bathroom faucets',
      'bathroom-furniture': 'Bathroom furniture',
      bathtubs: 'Bathtubs',
      'bidet-seat': 'Bidet seats',
      commercial: 'Commercial',
      'kitchen-faucets': 'Kitchen faucets',
      'kitchen-sinks': 'Kitchen sinks',
      lavatories: 'Lavatories',
      'mirrored-cabinets': 'Mirrored cabinets',
      mirrors: 'Mirrors',
      showering: 'Showering',
      toilets: 'Toilets',
    } as Record<string, string>,
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

// ── การจำภาษาที่เลือก: ไม่มีแล้ว ──
//
// 5af7a23 เก็บภาษาที่เลือกไว้ใน localStorage แล้วกู้คืนด้วยสคริปต์ก่อนหน้าจอวาด
// (`kohler:lang` + `data-lang-restore`) ซึ่งจำเป็นตอนที่ทั้งเว็บมี URL ชุดเดียว —
// ถ้าไม่จำ ภาษาที่ผู้อ่านเลือกจะหายไปทุกครั้งที่โหลดหน้าใหม่
//
// ตอนนี้ภาษาอยู่ใน URL แล้ว ค่าที่จำไว้จึงกลายเป็นของที่ "แย่งกับ URL" ได้:
// คนที่เคยกดไทยไว้แล้วเปิดลิงก์ /products/ จะได้หน้าอังกฤษที่ถูกสลับเป็นไทยหลัง
// hydrate ทั้งที่ URL, <html lang>, canonical และ hreflang ทั้งหมดบอกว่าอังกฤษ
// — ความจำที่ขัดกับ URL แย่กว่าไม่มีความจำเลย จึงถอดทิ้งทั้งชุด
//
// คีย์เก่าถูกลบออกจากเครื่องผู้อ่านใน LangProvider (ครั้งเดียวตอน mount)
export const LEGACY_LANG_STORAGE_KEY = 'kohler:lang';


// ── เนื้อหาที่ยังไม่มีฉบับภาษาอังกฤษ ──
// ป้าย UI ทั้งหมดอยู่ใน dict ด้านบนและแปลครบสองภาษาแล้ว
// ส่วนด้านล่างนี้เป็น "เนื้อหาบรรณาธิการ" ที่เขียนไว้ภาษาไทยอย่างเดียว
// จึงประกาศ en เป็น optional: ถ้ายังไม่มีให้ตกกลับไปใช้ไทย ไม่ใช่ปล่อยว่าง
// นักแปลเติมฟิลด์ en ได้ทีละอันโดยไม่ต้องแก้ component
export type Localized = { th: string; en?: string };

/** เลือกภาษา แล้วตกกลับเป็นไทยเมื่อยังไม่มีฉบับอังกฤษ */
export const pick = (v: Localized, lang: Lang) => (lang === 'en' ? (v.en ?? v.th) : v.th);

// ── อ่านภาษาจาก "ตัวอักษรที่อยู่ในสตริง" ไม่ใช่จาก "ฟิลด์ที่มันมาจาก" ──────────
//
// นี่คือแก่นของ task E1 ทั้งงาน
//
// resolve() รุ่นแรกถามว่า "มีฟิลด์ en ไหม" ซึ่งฟังดูถูกจนกระทั่งดูข้อมูลจริง:
// lib/posts.ts เขียนไว้ตรง ๆ ในคอมเมนต์ของตัวเองว่า title.en กับ excerpt.en ถือ
// "สตริงเดียวกันกับไทย ไม่ใช่คำแปลที่เราแต่งขึ้น" — ทั้งสิบบทความ ผลคือฟิลด์ en
// มีอยู่ครบ resolve() จึงตอบว่า "นี่คืออังกฤษ" แล้วไม่ติดป้ายอะไรเลย ทั้งที่สิ่งที่
// ออกไปอยู่บนหน้าจอเป็นอักษรไทยล้วนในเอกสารที่ประกาศ lang="en"
//
// ฟิลด์โกหกได้ ตัวอักษรโกหกไม่ได้ ทุกอย่างข้างล่างนี้จึงตัดสินจากสตริงที่จะถูก
// เรนเดอร์จริง ไม่ใช่จากรูปร่างของข้อมูล

const THAI_RE = /[฀-๿]/;
/** ตัวอักษรไทย vs ตัวอักษรละติน — ตัวเลข ช่องว่าง เครื่องหมาย ไม่นับทั้งคู่ */
const THAI_G = /[฀-๿]/g;
const LATIN_G = /[A-Za-z]/g;

/** มีอักษรไทยอยู่ในสตริงนี้ไหม (แม้แต่ตัวเดียว) */
export const hasThai = (text: string) => THAI_RE.test(text);

/**
 * ภาษาที่ "ตัวอักษร" ในสตริงนี้บอก — คืน null เมื่อไม่มีตัวอักษรเลย
 * (เลขรุ่น 'K-8623X', ราคา, ขนาด — พวกนี้ไม่มีภาษา ไม่ต้องติดป้าย)
 */
export function scriptOf(text: string): Lang | null {
  const thai = (text.match(THAI_G) ?? []).length;
  const latin = (text.match(LATIN_G) ?? []).length;
  if (!thai && !latin) return null;
  return thai > latin ? 'th' : 'en';
}

/**
 * ค่าที่จะใส่ใน `lang=` ของ element — undefined เมื่อไม่ต้องใส่
 *
 * ติดป้ายเฉพาะตอนที่ตัวอักษรไม่ตรงกับภาษาของเอกสาร เพราะ `lang` ที่ซ้ำกับ <html>
 * ไม่ได้บอกอะไรใครเพิ่ม มีแต่ทำให้ markup รก
 *
 * ทิศทางเดียว (ไทยบนหน้าอังกฤษ) โดยตั้งใจ: หน้าไทยที่มีคำละตินอยู่คือชื่อเฉด
 * ชื่อคอลเลกชัน และเลขรุ่น ซึ่งเป็นวิสามานยนามที่คนไทยอ่านออกอยู่แล้ว การไล่ติด
 * lang="en" ให้ทุกคำจะได้ markup ที่รกโดยไม่มีใครได้อะไร และ QA-F5 ตรวจต้นไม้ไทย
 * ผ่านแล้ว ส่วนทางกลับกันคือข้อร้องเรียนจริงที่มีคนนับมาแล้วว่า 196 จาก 259 หน้า
 */
export const langAttr = (text: string, docLang: Lang): Lang | undefined => {
  if (docLang === 'th') return undefined;
  const thai = (text.match(THAI_G) ?? []).length;
  if (!thai) return undefined;
  // เสมอกันให้ถือว่าเป็นไทย ต่างจาก scriptOf ที่เสมอกันแล้วถือว่าเป็นอังกฤษ
  //
  // ที่นี่ใช้กับสตริงที่ **แบ่งไม่ได้** — alt กับ aria-label เป็น attribute จะห่อ
  // span ไม่ได้ ต้องเลือกภาษาเดียวให้ทั้งก้อน และสองทางเลือกนั้นไม่ได้เสียหาย
  // เท่ากัน: อักษรไทยที่ถูกอ่านด้วยเสียงอังกฤษออกมาเป็นเสียงที่ไม่มีความหมายเลย
  // ส่วนคำละตินที่ถูกอ่านด้วยเสียงไทยยังพอฟังออก เมื่อคะแนนเท่ากันจึงเอียงไปทาง
  // ที่เสียหายน้อยกว่า (เจอจริงกับ alt ว่า "Vibrant® ไทเทเนียม (TT)" — ไทย 9
  // ละติน 9 พอดี)
  return thai >= (text.match(LATIN_G) ?? []).length ? 'th' : undefined;
};

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
 * `lang` here is what the text IS, not what the field claimed. Between ba10764
 * and task E1 this read `!v.en ? th : lang`, which trusted the shape of the data
 * and was wrong for every one of the ten articles (see the note above). It is
 * also the reason this function had zero callers for two tasks: AboutContent
 * kept using `pick`, and switching it over would not have marked anything.
 *
 * This is deliberately NOT wired into the Thai line-height floor, because that
 * floor does not need it: `h1..h4 { line-height: 1.6 }` and `.leading-thai` in
 * globals.css carry no `lang` selector, so Thai keeps its measured leading no
 * matter what the document declares. The one lang-scoped rule in the stylesheet
 * is `.en-tight`, which is opt-in and currently used by zero components.
 */
export const resolve = (v: Localized, lang: Lang): { text: string; lang: Lang } => {
  const text = pick(v, lang);
  return { text, lang: scriptOf(text) === 'th' ? 'th' : lang };
};

// ── ชื่อบทความภาษาอังกฤษ (task E1) ──────────────────────────────────────────
//
// ปัญหา: kohler.co.th ตีพิมพ์บทความสิบชิ้นนี้เป็นภาษาไทยอย่างเดียว เราจึงไม่มี
// พาดหัวภาษาอังกฤษของมัน และ <title> ติดป้าย lang ไม่ได้ (มันไม่ใช่ element ที่มี
// ลูกเป็น element ได้) ผลคือ /articles/<slug>/ ซึ่งเป็น URL อังกฤษ เสิร์ฟ <title>
// ไทยล้วน — ข้อเดียวในรายงาน QA ที่ลูกค้าบอกตรง ๆ ว่ารับไม่ได้
//
// สิ่งที่เรามีจริง: **สแลกของ KOHLER เอง** ทุกบทความอยู่ที่ URL อังกฤษของเขาเอง
// (`/articles/choosing-the-perfect-kitchen-faucets.html`) ซึ่งเป็นถ้อยคำที่ KOHLER
// เลือกเอง ไม่ใช่คำที่เราแต่ง การคลี่สแลกกลับเป็นประโยคจึงไม่ใช่การเขียนเนื้อหา
// ใหม่ แต่เป็นการอ่านข้อมูลที่มีอยู่แล้วอีกช่องหนึ่ง — ท่าเดียวกับ guideNames
// ข้างบนที่มีอยู่เพราะไฟล์ข้อมูลมีแต่สแลกเหมือนกัน
//
// deslug() ทำงานอัตโนมัติกับทุกสแลก บทความใหม่ที่ crawl เข้ามาจึงได้ชื่ออังกฤษ
// เองโดยไม่มีใครต้องมาเติม ส่วนแผนที่ข้างล่างมีไว้เฉพาะกรณีที่สแลกดิบอ่านผิด:
// เครื่องหมายวรรคตอนที่ URL ใส่ไม่ได้ และคำที่ต้นทางพิมพ์ตกเอง
const POST_TITLE_EN: Readonly<Record<string, string>> = {
  // 'artilcle' สะกดผิดอยู่ใน URL ของ KOHLER เอง และ ':' ใส่ใน URL ไม่ได้
  'functional-beauty-reconsidering-the-kitchen-sink': 'Functional Beauty: Reconsidering the Kitchen Sink',
  'cleaner-toilets-revolution-360': 'Cleaner Toilets: Revolution 360',
  'easy-affordable-bath-upgrades': 'Easy, Affordable Bath Upgrades',
};

/** คำที่ไม่ขึ้นต้นด้วยตัวใหญ่เมื่ออยู่กลางพาดหัว (Chicago-style, ย่อ) */
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'up', 'with']);

/** `choosing-the-perfect-kitchen-faucets` → `Choosing the Perfect Kitchen Faucets` */
function deslug(slug: string): string {
  return slug
    // ส่วนท้ายที่เป็นชนิดของหน้า ไม่ใช่ส่วนหนึ่งของชื่อเรื่อง (รวมที่สะกดผิดที่ต้นทาง)
    .replace(/-(article|artilcle|page)$/, '')
    .split('-')
    .map((w, i) => (i > 0 && MINOR.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * พาดหัวบทความในภาษาของหน้า พร้อมบอกว่ามันเป็นภาษาอะไรจริง ๆ
 *
 * ลำดับ: ฉบับอังกฤษจริงถ้ามี (สองในสิบชิ้นมี เพราะ KOHLER ตั้งชื่อเป็นอังกฤษเอง)
 * → แผนที่ด้านบน → คลี่สแลก และภาษาไทยได้พาดหัวไทยเสมอ
 */
export function postTitle(post: { slug: string; title: Localized }, lang: Lang): { text: string; lang: Lang } {
  if (lang === 'th') return { text: post.title.th, lang: 'th' };
  const given = post.title.en;
  // `en` ของ lib/posts.ts ถือสำเนาภาษาไทยไว้โดยตั้งใจ — เชื่อมันได้เฉพาะตอนที่
  // ตัวอักษรในนั้นเป็นอังกฤษจริง
  if (given && scriptOf(given) === 'en') return { text: given, lang: 'en' };
  return { text: POST_TITLE_EN[post.slug] ?? deslug(post.slug), lang: 'en' };
}

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
