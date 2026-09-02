// ── โครงเอกสารร่วมของทั้งสองต้นไม้ (task D3) ────────────────────────────────
//
// เว็บนี้มี root layout สองตัว — app/(en)/layout.tsx และ app/(th)/layout.tsx —
// เพราะ <html lang> ต้องนิ่งและถูกต้องตั้งแต่ HTML ที่ static export เขียนออกมา
// ไม่ใช่ค่าที่ JS มาแก้ทีหลัง (ดูเหตุผลเต็มที่ LangProvider) และใน App Router
// มีที่เดียวที่เขียน <html> ได้คือ root layout ดังนั้น "หนึ่งภาษา = หนึ่ง root
// layout" ไม่ใช่ทางเลือกด้านสไตล์ มันคือข้อบังคับของเฟรมเวิร์ก
//
// สิ่งที่ต้องมีอยู่ชุดเดียวจริง ๆ ถูกดึงมาไว้ที่นี่ ไม่ใช่ก๊อปสองรอบ:
//   • ฟอนต์ — next/font สร้างคลาสตอนโหลดโมดูล ถ้าเรียกสองที่จะได้สองชุด
//   • โครง <body> ทั้งหมด รวมประตูเข้า สนามภาพ เมนู และท้ายเว็บ
//   • เมทาดาทาราก และ JSON-LD ขององค์กร ซึ่งต่างกันแค่ "ภาษาอะไร"
//
// ประตูเข้า/สนามภาพ/กำแพงเฉด ไม่ซ้อนกันและไม่เด้งใหม่ตอนสลับภาษา: แต่ละต้นไม้
// mount ชุดเดียว การสลับภาษาข้ามต้นไม้เป็นการโหลดเอกสารใหม่ (Next บังคับ เพราะ
// root layout คนละตัว) และประตูเข้าจำสถานะไว้ที่ sessionStorage ไม่ใช่ที่ React
// state — คนที่ผ่านประตูมาแล้วจึงไม่เจอประตูอีกรอบหลังกดสลับภาษา

import type { Metadata } from 'next';
import { DM_Sans, Sarabun } from 'next/font/google';
import '../globals.css';
import { LangProvider } from '@/components/LangProvider';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { ALT_LANG, DEFAULT_LANG, dict, type Lang } from '@/lib/i18n';
import { ADDRESS, CONTACT, SITE_NAME, SITE_URL } from '@/lib/site';
import { treeUrl } from './routes';

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

/**
 * เมทาดาทาของรากต้นไม้หนึ่งต้น
 *
 * ทุกอย่างอ่านจาก dict ของภาษานั้น ไม่ใช่ DEFAULT_LANG อีกแล้ว — ต้นไม้ไทยต้อง
 * ได้ title, description, og:locale ของไทย ไม่ใช่ของอังกฤษที่บังเอิญเป็นค่าตั้งต้น
 *
 * og:locale:alternate ยังอยู่ และตอนนี้พูดได้แข็งกว่าเดิม: มันไม่ได้แค่บอกว่า
 * "หน้านี้มีภาษานี้ด้วย" แต่มีหน้าจริงอยู่ที่ URL ซึ่ง alternates ของแต่ละหน้า
 * ชี้ไปถึงตรง ๆ
 */
export function rootMetadata(lang: Lang): Metadata {
  const seo = dict[lang].seo;
  const other = lang === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG;
  return {
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
      alternateLocale: [dict[other].seo.ogLocale],
      title: `${SITE_NAME} — ${seo.tagline}`,
      description: seo.ogDescription,
    },
  };
}

function organizationJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    // องค์กรเดียว มี @id เดียว ไม่ว่าจะอ่านเจอในต้นไม้ไหน — ถ้าให้ url ตามต้นไม้
    // จะกลายเป็นสองนิติบุคคลที่ชื่อเหมือนกัน ซึ่งไม่ใช่สิ่งที่หน้านี้อธิบายอยู่
    '@id': `${SITE_URL}/#organization`,
    url: SITE_URL,
    description: dict[lang].seo.orgDescription,
    // ตอนนี้เป็นเรื่องจริงในความหมายที่แข็งกว่าเดิม: มีสองต้นไม้จริง ไม่ใช่
    // เอกสารเดียวที่สลับภาษาด้วย JS
    inLanguage: [DEFAULT_LANG, ALT_LANG],
    telephone: CONTACT.phone,
    email: CONTACT.email,
    address: { '@type': 'PostalAddress', ...ADDRESS[lang] },
    // หน้าแรกของอีกภาษาเป็นตัวแทนของ "เว็บเดียวกันในอีกภาษา"
    sameAs: [treeUrl(lang === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG, '/')],
  };
}

export default function RootShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const gate = dict[lang].gate;
  return (
    // ไม่มี suppressHydrationWarning และไม่มีสคริปต์กู้ภาษาใน <head> อีกแล้ว:
    // lang ตัวนี้มาจากต้นไม้ ไม่มีใครแก้มันหลังโหลด markup กับ DOM จึงตรงกัน
    // ตั้งแต่ต้น (5af7a23 ใส่ทั้งสองอย่างไว้เพื่อกัน mismatch ที่ไม่มีอีกแล้ว)
    <html lang={lang} className={`${dmSans.variable} ${thai.variable}`}>
      <body>
        <LangProvider lang={lang}>
          {/* Entry gate อยู่ใน layout ไม่ใช่ในหน้าใดหน้าหนึ่ง — layout ไม่ถูก
              remount ตอนเปลี่ยน route ฝั่ง client ประตูจึงไม่เด้งขึ้นซ้ำ
              และตัวมันเองก็ gate ด้วย sessionStorage อีกชั้น ซึ่งเป็นชั้นที่
              รับผิดชอบตอนสลับภาษาข้ามต้นไม้ (โหลดเอกสารใหม่)

              ป้ายปุ่มมาจาก dict ของภาษาต้นไม้นี้ ไม่ใช่ DEFAULT_LANG:
              ข้อจำกัดที่ app/layout.tsx เดิมยอมรับไว้ ("ป้ายนิ่งตาม DEFAULT_LANG
              ไม่ตามปุ่มสลับ") หายไปเองพร้อมกับปุ่มสลับที่กลายเป็นลิงก์ข้ามต้นไม้ */}
          <Preloader enterLabel={gate.enter} stalledLabel={gate.stalled} />
          <SmoothScroll />
          <Nav />
          <main>{children}</main>
          <Footer />
        </LangProvider>
        <JsonLd data={organizationJsonLd(lang)} />
      </body>
    </html>
  );
}
