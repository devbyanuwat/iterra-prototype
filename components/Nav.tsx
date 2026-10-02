'use client';

// เมนูหลัก + ปุ่มสลับภาษา TH/EN (ทำงานจริงผ่าน LangProvider)
// ใช้ mix-blend-difference ให้ตัวหนังสืออ่านออกบนทุกพื้นหลัง (ลุคโชว์รูม)

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from './LangProvider';
import type { Lang } from '@/lib/i18n';

const LINKS = [
  { href: '/', key: 'home' },
  { href: '/about/', key: 'about' },
  { href: '/products/', key: 'products' },
  { href: '/catalog/', key: 'catalog' },
  { href: '/articles/', key: 'articles' },
  { href: '/contact/', key: 'contact' },
] as const;

function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  const Btn = ({ code }: { code: Lang }) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      className={`px-1.5 py-0.5 text-[11px] uppercase tracking-widest transition-opacity ${
        lang === code ? 'opacity-100 underline underline-offset-4' : 'opacity-50 hover:opacity-80'
      }`}
    >
      {code}
    </button>
  );
  return (
    <div className={`flex items-center ${className}`}>
      <Btn code="th" />
      <span className="opacity-40">/</span>
      <Btn code="en" />
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 mix-blend-difference">
        <div className="flex items-center justify-between px-6 py-5 text-white md:px-[4vw]">
          <Link href="/" className="pointer-events-auto text-lg font-light tracking-widest2">
            ITERRA
          </Link>
          <nav aria-label="เมนูหลัก" className="pointer-events-auto hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[11px] uppercase tracking-widest2 transition-opacity ${
                  pathname === l.href ? 'opacity-100 underline underline-offset-8' : 'opacity-60 hover:opacity-100'
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
              aria-label="เปิดเมนู"
              className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
            >
              <span className="block h-px w-6 bg-white" />
              <span className="block h-px w-6 bg-white" />
            </button>
          </div>
        </div>
      </header>

      {/* เมนูมือถือแบบเต็มจอ */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-ink text-paper transition-transform duration-500 md:hidden ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-lg font-light tracking-widest2">ITERRA</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="ปิดเมนู" className="text-2xl font-extralight">
            ×
          </button>
        </div>
        <nav aria-label="เมนูมือถือ" className="flex flex-1 flex-col justify-center gap-7 px-8">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-2xl font-extralight tracking-wide"
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
