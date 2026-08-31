import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/components/LangProvider';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
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
// ต้องมี 200/300/500 ด้วย ไม่ใช่แค่ 100/400/700: โค้ดใช้ font-light (300) กับ
// font-extralight (200) เป็นหลัก และ .micro ขอ 500 · การจับคู่น้ำหนักของ CSS
// สำหรับค่าต่ำกว่า 400 จะไล่ลงก่อน ทั้ง 300 และ 200 จึงตกไปใช้หน้า 100 เงียบ ๆ
// ตัวหนังสือทั้งเว็บเลยบางกว่าที่ออกแบบไว้ ซึ่งอ่านยากที่สุดบนพื้น #08090A
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '700'],
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
    'ITERRA ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม คัดสรรซิงก์ ก๊อก เตา เครื่องใช้บิลท์อิน และสุขภัณฑ์จากแบรนด์ชั้นนำระดับโลก พร้อมโชว์รูมให้สัมผัสจริงในกรุงเทพฯ',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${dmSans.variable} ${plexThai.variable}`}>
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
