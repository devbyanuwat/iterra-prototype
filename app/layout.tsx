import type { Metadata } from 'next';
import { DM_Sans, Sarabun } from 'next/font/google';
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
// 600 มาจาก h1 หน้าสินค้า 30px/600 ในตาราง §3.2
//
// Sarabun, not Plex Thai. Measured ink coverage of a real Thai sentence at 16px:
// Plex Thai 400 (what shipped) 2821 px, Noto Sans Thai 500 3184, Anuphan 500 3415,
// Sarabun 500 3714 — a third more ink than the face the client called too thin to
// read, three separate times.
//
// Kohler themselves run Noto Sans, and matching the brand was the argument for Plex.
// The complaint here is legibility, not brand fit, and Sarabun is drawn for Thai body
// copy at small sizes. Copying a value off kohler.co.th without checking it against
// our own context is a mistake already made once on this project, with `dim`.
const thai = Sarabun({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-thai',
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
    <html lang="th" suppressHydrationWarning className={`${dmSans.variable} ${thai.variable}`}>
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
