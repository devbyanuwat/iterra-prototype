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
  { href: '/gallery/', key: 'gallery' },
  { href: '/articles/', key: 'articles' },
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
          <nav aria-label={t.a11y.menuMain} className="pointer-events-auto hidden items-center gap-8 md:flex">
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
          <div className="pointer-events-auto flex items-center gap-4 md:hidden">
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
        className={`fixed inset-0 z-[60] flex flex-col bg-base text-ink transition-transform duration-500 md:hidden ${
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
