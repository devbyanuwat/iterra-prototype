// ── i18n MOCK ──
// จุดเปลี่ยนเป็นของจริง #3: dictionary สองภาษาแบบง่ายสำหรับเดโม่
// ของจริงแนะนำย้ายไป next-intl / เส้นทาง /en แยก เพื่อ SEO ต่อภาษา
// ตอนนี้แปลครบ: เมนู, หน้าแรก, หน้าสินค้ารวม + ปุ่ม/ป้ายที่ใช้ร่วมกัน

export type Lang = 'th' | 'en';

export const dict = {
  th: {
    nav: {
      home: 'หน้าแรก',
      about: 'เกี่ยวกับเรา',
      products: 'สินค้า',
      catalog: 'แคตตาล็อก',
      articles: 'บทความ',
      contact: 'ติดต่อเรา',
      showroom: 'นัดชมโชว์รูม',
    },
    common: {
      inquire: 'สอบถามสินค้านี้',
      priceOnRequest: 'สอบถามราคา',
      viewAll: 'ดูทั้งหมด',
      readMore: 'อ่านต่อ',
      explore: 'ชมคอลเลกชัน',
      scroll: 'เลื่อนเพื่อชม',
      category: { all: 'ทั้งหมด', faucet: 'ก๊อกครัว', sink: 'ซิงก์ล้างจาน' } as Record<string, string>,
    },
    home: {
      heroKicker: 'PREMIUM KITCHEN DEALER',
      heroTitle: 'ศิลปะของครัว\nที่คู่ควรกับบ้านคุณ',
      heroSub: 'คัดสรรชุดครัวและอุปกรณ์ครัวจากแบรนด์ชั้นนำระดับโลก สำหรับบ้านที่ไม่ประนีประนอมเรื่องดีไซน์',
      featuredTitle: 'สินค้าเด่นประจำฤดูกาล',
      galleryTitle: 'ครัวที่ออกแบบมาให้ใช้ทุกวัน',
      storySlides: [
        {
          title: 'เริ่มจากความเชื่อเรื่องงานฝีมือ',
          body: 'กว่า 25 ปีที่เราคัดสรรชุดครัวและอุปกรณ์ครัวด้วยเกณฑ์เดียว คือต้องเป็นชิ้นที่เราอยากใช้ในบ้านของเราเอง',
        },
        {
          title: 'โชว์รูมที่ให้คุณ "ลองจริง"',
          body: 'ทุกก๊อกเปิดน้ำได้ ทุกซิงก์ลองล้างได้ ทุกลิ้นชักเปิดปิดให้ฟังเสียง เพราะของพรีเมียมต้องพิสูจน์ได้ด้วยการสัมผัส',
        },
        {
          title: 'อยู่ด้วยกันจนหลังการติดตั้ง',
          body: 'ทีมช่างของเราเองดูแลตั้งแต่วัดหน้างาน ติดตั้ง จนถึงบริการหลังการขาย พร้อมรับประกันชิ้นงานสูงสุด 10 ปี',
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
      sub: 'ก๊อกและซิงก์ครัวจาก KOHLER ทุกชิ้นสัมผัสจริงได้ที่โชว์รูม',
      featured: 'สินค้าเด่น',
      specs: 'สเปกสินค้า',
      related: 'สินค้าใกล้เคียง',
    },
    catalog: {
      kicker: 'KOHLER KITCHENS 2026',
      title: 'แคตตาล็อกครัวและตู้เสื้อผ้า',
      sub: 'เปิดดูทุกหน้าได้ที่นี่ หรือดาวน์โหลดเก็บไว้อ่านทีหลัง',
      download: 'ดาวน์โหลด PDF',
      open: 'เปิดดูแคตตาล็อก',
      page: 'หน้า',
      of: 'จาก',
      close: 'ปิด',
      prev: 'หน้าก่อน',
      next: 'หน้าถัดไป',
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
      blurb: 'ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม คัดสรรจากแบรนด์ชั้นนำระดับโลก',
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
      catalog: 'Catalog',
      articles: 'Journal',
      contact: 'Contact',
      showroom: 'Book a Visit',
    },
    common: {
      inquire: 'Inquire about this piece',
      priceOnRequest: 'Price on request',
      viewAll: 'View all',
      readMore: 'Read more',
      explore: 'Explore the collection',
      scroll: 'Scroll to explore',
      category: { all: 'All', faucet: 'Kitchen faucet', sink: 'Kitchen sink' } as Record<string, string>,
    },
    home: {
      heroKicker: 'PREMIUM KITCHEN DEALER',
      heroTitle: 'The Art of the Kitchen,\nWorthy of Your Home',
      heroSub: 'A curated selection of kitchens and kitchen equipment from the world’s finest brands — for homes that never compromise on design.',
      featuredTitle: 'This Season’s Highlights',
      galleryTitle: 'Kitchens made for everyday cooking',
      storySlides: [
        {
          title: 'Born from a belief in craft',
          body: 'For over 25 years we have curated kitchen pieces with a single criterion: would we want this in our own home?',
        },
        {
          title: 'A showroom you can actually try',
          body: 'Every faucet runs, every sink is plumbed, every drawer glides. Premium quality should be proven by touch.',
        },
        {
          title: 'With you long after installation',
          body: 'Our own team handles survey, installation and after-sales care, with warranties of up to 10 years.',
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
      sub: 'KOHLER kitchen faucets and sinks, every one on display at our showroom.',
      featured: 'Featured',
      specs: 'Specifications',
      related: 'Related pieces',
    },
    catalog: {
      kicker: 'KOHLER KITCHENS 2026',
      title: 'Kitchens & Wardrobes Catalog',
      sub: 'Browse every page here, or download it to read later.',
      download: 'Download PDF',
      open: 'Browse the catalog',
      page: 'Page',
      of: 'of',
      close: 'Close',
      prev: 'Previous page',
      next: 'Next page',
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
      blurb: 'Premium kitchen dealer, curated from the world’s finest brands.',
      nav: 'Menu',
      contact: 'Contact',
      rights: 'All rights reserved',
    },
  },
};

export type Dict = (typeof dict)['th'];
