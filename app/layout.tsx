import type { Metadata } from 'next';
import { DM_Sans, Sarabun } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/components/LangProvider';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { ALT_LANG, DEFAULT_LANG, dict, LANG_HIDE_ATTR, LANG_STORAGE_KEY } from '@/lib/i18n';
import { ADDRESS, CONTACT, SITE_NAME, SITE_URL } from '@/lib/site';

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

// ทุกอย่างใน <head> ตามภาษาที่ export ออกมาจริง ไม่ใช่ค่าคงที่ที่พิมพ์ไว้ครั้งเดียว
const seo = dict[DEFAULT_LANG].seo;
const gate = dict[DEFAULT_LANG].gate;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${seo.tagline}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: seo.description,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: seo.ogLocale,
    // og:locale:alternate เป็นแค่ "หน้านี้มีภาษานี้ด้วย" ไม่ได้อ้างว่ามี URL แยก
    // จึงพูดได้จริงกับเว็บที่สลับภาษาฝั่ง client — ต่างจาก hreflang ที่ต้องมี URL
    // ต่อภาษา และเราไม่มี ดูเหตุผลเต็มใน lib/i18n.ts (DEFAULT_LANG)
    alternateLocale: [dict[ALT_LANG].seo.ogLocale],
    title: `${SITE_NAME} — ${seo.tagline}`,
    description: seo.ogDescription,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  description: seo.orgDescription,
  // ทั้งสองภาษาเสิร์ฟจาก URL เดียวกันจริง ๆ inLanguage บอกได้ตรงตามนั้น
  inLanguage: [DEFAULT_LANG, ALT_LANG],
  telephone: CONTACT.phone,
  email: CONTACT.email,
  address: { '@type': 'PostalAddress', ...ADDRESS[DEFAULT_LANG] },
};

// ทำงานก่อนหน้าจอวาดครั้งแรก: ถ้าค่าที่จำไว้ไม่ใช่ภาษาที่อยู่ใน markup
// ให้แก้ <html lang> ทันทีแล้วซ่อน body ไว้จนกว่า LangProvider จะสลับข้อความเสร็จ
// (ดูคอมเมนต์ในไฟล์นั้น) timeout เป็นวาล์วนิรภัย เผื่อ JS พังกลางทางจะได้ไม่เหลือหน้าเปล่า
//
// เทียบกับ ALT_LANG ไม่ใช่ฮาร์ดโค้ด 'en' — สคริปต์นี้ถูกฝังเป็นสตริงลง HTML
// ถ้าเขียนภาษาไว้ตรง ๆ การพลิก DEFAULT_LANG จะทำให้สคริปต์กู้ภาษาผิดตัวเงียบ ๆ
// โดยที่ TypeScript มองไม่เห็น เพราะมันเป็นข้อความ ไม่ใช่โค้ดที่ถูก type-check
const RESTORE_LANG = `try{if(localStorage.getItem('${LANG_STORAGE_KEY}')==='${ALT_LANG}'){
document.documentElement.lang='${ALT_LANG}';
var s=document.createElement('style');
s.setAttribute('${LANG_HIDE_ATTR}','');
s.textContent='body{visibility:hidden}';
document.head.appendChild(s);
setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},2000);}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // สคริปต์ข้างล่างแก้ lang ก่อน hydrate — บอก React ว่า attribute นี้ต่างได้
    <html
      lang={DEFAULT_LANG}
      suppressHydrationWarning
      className={`${dmSans.variable} ${thai.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: RESTORE_LANG }} />
      </head>
      <body>
        <LangProvider>
          {/* Entry gate อยู่ใน layout ไม่ใช่ในหน้าใดหน้าหนึ่ง — layout ไม่ถูก
              remount ตอนเปลี่ยน route ฝั่ง client ประตูจึงไม่เด้งขึ้นซ้ำ
              และตัวมันเองก็ gate ด้วย sessionStorage อีกชั้น

              ป้ายปุ่มส่งเข้าไปจาก dict ไม่ปล่อยให้ใช้ค่า default ของ Preloader
              ซึ่งเป็นภาษาไทยฝังไว้: ปุ่มนี้คือข้อความแรกที่คนเห็น ถ้าเป็นไทยใน
              เอกสารที่ประกาศ lang="en" ก็คือหน้าที่ประกาศภาษาไม่ตรงกับที่แสดง
              ตั้งแต่พิกเซลแรก

              ข้อจำกัดที่ยอมรับไว้: ค่านี้นิ่งตาม DEFAULT_LANG ไม่ตามปุ่มสลับ
              ประตูขึ้นครั้งเดียวต่อ session ก่อนมีการกดอะไรทั้งนั้น จึงพอรับได้
              ทางแก้ที่ถูกจริงคือให้ Preloader เรียก useLang() เอง — หนึ่งบรรทัด
              ในไฟล์ที่ไม่ได้อยู่ในขอบเขตงานนี้ */}
          <Preloader enterLabel={gate.enter} stalledLabel={gate.stalled} />
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
