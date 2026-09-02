'use client';

// เมนูหลัก + ปุ่มสลับภาษา TH/EN (ทำงานจริงผ่าน LangProvider)
//
// เคยเป็น `mix-blend-difference` + text-white เพื่อให้ลอยอยู่บนพื้นอะไรก็อ่านออก
// ซึ่งไม่จริง: difference คืนค่า |backdrop − 255| พื้นโทนกลางจึงให้ตัวอักษรโทนกลาง
// วัดบนกำแพงจริง (canvas อ่านพิกเซลแถบบนของแต่ละแผง):
//   Vibrant Brushed Titanium  152,148,146 → ตัวอักษร 103,107,109 = **1.79:1**
//   Vibrant Brushed Rose Gold 202,168,149 → 3.51:1
//   Vibrant Rose Gold         197,173,159 → 3.85:1
// ธีมมืดเดิมซ่อนปัญหานี้ไว้เพราะหน้าแรกไม่ได้เอาแผงโทนกลางมาไว้ใต้เมนู
// ธีมสว่างเอากำแพงขึ้นเป็นจอแรก เมนูจึงลอยอยู่บนสามแผงนั้นตรง ๆ
//
// แก้ด้วยการให้เมนูมีพื้นของตัวเอง (แบบเดียวกับ kohler.co.th) — ink บน base
// คงที่ 13.2:1 ทุกหน้า ทุกแผง ไม่ขึ้นกับว่าอะไรอยู่ข้างหลัง
// กำแพงเผื่อที่ให้แถบนี้อยู่แล้ว (FinishWall วาง header ของตัวเองที่ top-[64px])

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from './BrandMark';
import { useLang } from './LangProvider';
import { ALT_LANG, DEFAULT_LANG, type Lang } from '@/lib/i18n';

const LINKS = [
  { href: '/', key: 'home' },
  { href: '/about/', key: 'about' },
  { href: '/products/', key: 'products' },
  // จานสีอยู่ติดกับสินค้าเพราะมันคือ "อีกด้าน" ของเรื่องเดียวกัน: หน้าเฉดบอกว่า
  // เรามีอะไรในสีนั้น หน้าจานสีบอกว่าสีนั้นคืออะไร และเป็นทางที่หน้า /finish
  // เดินกลับมาหาหน้าอ้างอิงได้จากทุกหน้าของเว็บ
  { href: '/palette/', key: 'palette' },
  { href: '/collections/', key: 'collections' },
  { href: '/gallery/', key: 'gallery' },
  { href: '/articles/', key: 'articles' },
  // task C1 — คู่มือเลือกซื้อกับไอเดียอยู่ติดกับบทความ เพราะทั้งสามคือของอ่าน
  // ชุดเดียวกันจาก kohler.co.th ต่างกันแค่รูปแบบ: บทความคือเรื่องยาว ไอเดียคือ
  // ชุดเรื่องที่ต้นทางจัดไว้ให้ ส่วนคู่มือคือวิธีเลือกของทีละหมวด
  { href: '/guides/', key: 'guides' },
  { href: '/ideas/', key: 'ideas' },
  // task C3 — ร้านค้าอยู่ในเมนูหลัก ไม่ใช่ท้ายเว็บ ทั้งที่หน้าข้อมูลอีกเก้าหน้า
  // อยู่ท้ายเว็บ เพราะมันตอบคนละคำถาม: เก้าหน้านั้นคือ "อ่านเพิ่ม" ส่วนหน้านี้คือ
  // "แล้วจะไปดูของจริงได้ที่ไหน" ซึ่งเป็นปลายทางของทั้งเว็บ และเป็นหน้าที่ลูกค้า
  // ทักมาเองว่าหายไป วางไว้ติดกับติดต่อเราเพราะเป็นความตั้งใจเดียวกัน
  { href: '/stores/', key: 'stores' },
  { href: '/contact/', key: 'contact' },
] as const;

function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  const Btn = ({ code }: { code: Lang }) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      // 0.5 คือ ink บน base = 3.2:1 อ่านไม่ผ่านเกณฑ์ AC ข้อ 3 (ต้อง ≥ 4.5:1)
      // 0.8 ให้ 7.04:1 และตัวที่เลือกอยู่ยังแยกออกด้วยขีดใต้ ไม่ได้พึ่งความจางอย่างเดียว
      className={`px-1.5 py-0.5 text-label uppercase tracking-widest transition-opacity ${
        lang === code ? 'opacity-100 underline underline-offset-4' : 'opacity-80 hover:opacity-100'
      }`}
    >
      {code}
    </button>
  );
  return (
    // เรียงตาม DEFAULT_LANG ก่อน: ภาษาที่อยู่ใน HTML จริงควรเป็นตัวแรกที่ตาเห็น
    // ไม่ใช่ 'th' ที่ฮาร์ดโค้ดไว้ตอนที่ไทยยังเป็นภาษาเริ่มต้น
    // group + aria-label เพราะปุ่มสองปุ่มนี้เป็นตัวเลือกชุดเดียวกัน ไม่ใช่ปุ่มลอย ๆ
    <div role="group" aria-label={t.a11y.langSwitch} className={`flex items-center ${className}`}>
      <Btn code={DEFAULT_LANG} />
      {/* ตัวคั่นล้วน ๆ screen reader ได้ยินปุ่มสองปุ่มอยู่แล้วไม่ต้องได้ยิน "/" */}
      <span aria-hidden className="opacity-40">
        /
      </span>
      <Btn code={ALT_LANG} />
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 border-b border-line-6 bg-base/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-5 text-ink md:px-[4vw]">
          {/* เวิร์ดมาร์กจริง ไม่ใช่ตัวอักษรที่จัด tracking เอาเอง
              alt = 'KOHLER' เป็นชื่อที่ลิงก์กลับหน้าแรกใช้ประกาศตัว ถ้าเป็น alt=""
              ลิงก์นี้จะไม่มีชื่อให้ screen reader อ่านเลย
              โลโก้เป็นสีดำล้วน แถบเมนูเป็นพื้นทึบ bg-base/95 ตั้งแต่ task H จึงอยู่บน
              #E5E5E5 เสมอ ไม่ได้ลอยอยู่บนแผงกำแพงที่โทนสีเอาแน่ไม่ได้ */}
          <Link href="/" className="pointer-events-auto">
            <BrandMark height={18} />
          </Link>
          {/* gap-4 และ lg: ไม่ใช่ gap-8 กับ md: — เมนูโตเป็นสิบเอ็ดรายการแล้ว
              (palette/collections/stores จาก task C2–C3 และ guides/ideas จาก C1)
              วัดที่ 1440 ภาษาอังกฤษ: ตัวอักษรของลิงก์ทั้งสิบเอ็ด + ปุ่มภาษา รวม
              1014px ส่วนที่ว่างระหว่างเวิร์ดมาร์กกับขอบขวามี 1241px
                gap-8 → 1014 + 11×32 = 1366  เกิน 125px
                gap-6 → 1278                 เกิน 37px  (ป้ายยาวถูกหักสองบรรทัด)
                gap-5 → 1234                 พอดี เหลือ 7px — ยังชนเวิร์ดมาร์กด้วยตา
                gap-4 → 1190                 เหลือ 51px ให้เวิร์ดมาร์กหายใจ
              เหลือ 7px คือ "พอดีจริง ๆ" ไม่ใช่ "สบาย" — ป้ายใหม่อีกอันเดียวก็หัก
              บรรทัดอีก และเมื่อดูด้วยตา เมนูก็ไปติดเวิร์ดมาร์กอยู่ดี จึงเลือก gap-4
              เมนูสิบเอ็ดรายการเกินความกว้างของแถวเดียวไปแล้วโดยธรรมชาติ
              การจัดกลุ่มเมนูเป็นการตัดสินใจของงานออกแบบ ไม่ใช่ของ task ใด task หนึ่ง
              (บันทึกไว้ใน scratchpad/task-c1.md)
              ส่วน lg: แทน md: เพราะที่ 768–1023 แถวเดียวใส่ไม่ลงในทุกกรณี — ช่วงนั้น
              ใช้เมนูเต็มจอซึ่งมีลิงก์ครบชุดเดียวกันอยู่แล้ว */}
          <nav aria-label={t.a11y.menuMain} className="pointer-events-auto hidden items-center gap-4 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-label uppercase tracking-widest2 transition-opacity ${
                  // เหตุผลเดียวกับ LangSwitch: 0.6 = 3.88:1 ตกเกณฑ์ · 0.8 = 7.04:1
                  pathname === l.href ? 'opacity-100 underline underline-offset-8' : 'opacity-80 hover:opacity-100'
                }`}
              >
                {t.nav[l.key]}
              </Link>
            ))}
            <LangSwitch />
          </nav>
          <div className="pointer-events-auto flex items-center gap-4 lg:hidden">
            <LangSwitch />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t.a11y.menuOpen}
              className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
            >
              <span className="block h-px w-6 bg-ink" />
              <span className="block h-px w-6 bg-ink" />
            </button>
          </div>
        </div>
      </header>

      {/* เมนูมือถือแบบเต็มจอ */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-base text-ink transition-transform duration-500 lg:hidden ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-6 py-5">
          {/* ในเมนูมือถือ โลโก้ไม่ใช่ลิงก์ (มีรายการ "หน้าแรก" อยู่ในเมนูแล้ว)
              จึงเป็นภาพประดับ ไม่ต้องมีชื่อซ้ำให้ screen reader อ่านสองรอบ */}
          <BrandMark height={18} alt="" />
          <button type="button" onClick={() => setOpen(false)} aria-label={t.a11y.menuClose} className="text-2xl font-normal">
            ×
          </button>
        </div>
        <nav aria-label={t.a11y.menuMobile} className="flex flex-1 flex-col justify-center gap-7 px-8">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-2xl font-normal tracking-wide"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {t.nav[l.key]}
            </Link>
          ))}
        </nav>
        <div className="px-8 pb-10">
          <LangSwitch />
        </div>
      </div>
    </>
  );
}
