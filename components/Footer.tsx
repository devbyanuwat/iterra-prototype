'use client';

import Link from 'next/link';
import { useLang } from './LangProvider';
import { CONTACT, SITE_NAME } from '@/lib/site';

export default function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper">
      <div className="grid gap-12 px-6 py-16 md:grid-cols-3 md:px-[8vw] md:py-20">
        <div>
          <p className="mb-4 text-lg font-light tracking-widest2">{SITE_NAME}</p>
          <p className="max-w-xs text-sm font-light leading-relaxed text-paper/60">{t.footer.blurb}</p>
        </div>
        <nav aria-label="เมนูท้ายเว็บ">
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-paper/50">{t.footer.nav}</p>
          <ul className="space-y-2.5 text-sm font-light">
            <li><Link href="/about/" className="text-paper/75 hover:text-paper">{t.nav.about}</Link></li>
            <li><Link href="/products/" className="text-paper/75 hover:text-paper">{t.nav.products}</Link></li>
            <li><Link href="/articles/" className="text-paper/75 hover:text-paper">{t.nav.articles}</Link></li>
            <li><Link href="/contact/" className="text-paper/75 hover:text-paper">{t.nav.contact}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-paper/50">{t.footer.contact}</p>
          <address className="space-y-2.5 text-sm font-light not-italic text-paper/75">
            <p>{lang === 'th' ? CONTACT.address_th : CONTACT.address_en}</p>
            <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
            <p>{CONTACT.email}</p>
            <p>{CONTACT.hours_th}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-paper/10 px-6 py-6 text-[11px] tracking-widest text-paper/40 md:px-[8vw]">
        © {year} {SITE_NAME} — {t.footer.rights}
      </div>
    </footer>
  );
}
