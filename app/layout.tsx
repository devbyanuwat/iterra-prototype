import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/components/LangProvider';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { LANG_HIDE_ATTR, LANG_STORAGE_KEY } from '@/lib/i18n';
import { CONTACT, SITE_NAME, SITE_TAGLINE_EN, SITE_TAGLINE_TH, SITE_URL } from '@/lib/site';

// Display + micro-caps. Variable — opsz ปรับรูปตัวอักษรตามขนาดที่ใช้จริง
// ไม่มีแกน wdth (ต่างจาก Archivo เดิม) การยืดพาดหัวจึงทำด้วย transform แทน
const dmSans = DM_Sans({
  subsets: ['latin'],
  axes: ['opsz'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-dm-sans',
});

// Body face: ไทย + ละติน · ไม่ใช่ variable font ต้องระบุน้ำหนักเป็นชุด
//
// เคยโหลด 100/200/300 ด้วย เพราะทั้งเว็บเซ็ตด้วย font-light/font-extralight
// สเปก 2026-09-01 §3.2 ตัดน้ำหนักต่ำกว่า 400 ออกจากข้อความที่ต้องอ่านทั้งหมด
// เหลือแค่ ModelNumber ที่ยังบาง และตัวนั้นเป็น font-display (DM Sans variable)
// ไม่ได้ใช้ Plex Thai — สามน้ำหนักนั้นจึงไม่มีใครเรียกแล้ว ตัดทิ้งได้ทั้งชุด
// 600 มาจาก h1 หน้าสินค้า 30px/600 ในตาราง §3.2
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-thai',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE_TH} | ${SITE_TAGLINE_EN}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'KOHLER ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม คัดสรรซิงก์ ก๊อก เตา เครื่องใช้บิลท์อิน และสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก พร้อมโชว์รูมให้สัมผัสจริงในกรุงเทพฯ',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'th_TH',
    title: `${SITE_NAME} — ${SITE_TAGLINE_TH}`,
    description: 'คัดสรรอุปกรณ์ครัวและสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  description: 'ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
  telephone: CONTACT.phone,
  email: CONTACT.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '888 ถนนสุขุมวิท',
    addressLocality: 'คลองเตย',
    addressRegion: 'กรุงเทพมหานคร',
    postalCode: '10110',
    addressCountry: 'TH',
  },
};

// ทำงานก่อนหน้าจอวาดครั้งแรก: ถ้าเคยเลือกอังกฤษไว้ ให้แก้ <html lang> ทันที
// แล้วซ่อน body ไว้จนกว่า LangProvider จะสลับข้อความเสร็จ (ดูคอมเมนต์ในไฟล์นั้น)
// timeout เป็นวาล์วนิรภัย เผื่อ JS พังกลางทางจะได้ไม่เหลือหน้าเปล่า
const RESTORE_LANG = `try{if(localStorage.getItem('${LANG_STORAGE_KEY}')==='en'){
document.documentElement.lang='en';
var s=document.createElement('style');
s.setAttribute('${LANG_HIDE_ATTR}','');
s.textContent='body{visibility:hidden}';
document.head.appendChild(s);
setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},2000);}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // สคริปต์ข้างล่างแก้ lang ก่อน hydrate — บอก React ว่า attribute นี้ต่างได้
    <html lang="th" suppressHydrationWarning className={`${dmSans.variable} ${plexThai.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: RESTORE_LANG }} />
      </head>
      <body>
        <LangProvider>
          {/* Entry gate อยู่ใน layout ไม่ใช่ในหน้าใดหน้าหนึ่ง — layout ไม่ถูก
              remount ตอนเปลี่ยน route ฝั่ง client ประตูจึงไม่เด้งขึ้นซ้ำ
              และตัวมันเองก็ gate ด้วย sessionStorage อีกชั้น */}
          <Preloader />
          <SmoothScroll />
          <Nav />
          <main>{children}</main>
          <Footer />
        </LangProvider>
        <JsonLd data={organizationJsonLd} />
      </body>
    </html>
  );
}
