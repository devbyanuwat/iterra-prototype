'use client';

import Link from 'next/link';
import { useLang } from './LangProvider';
import { CONTACT, SITE_NAME } from '@/lib/site';

export default function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-6 bg-base text-cream">
      <div className="grid gap-12 px-6 py-16 md:grid-cols-3 md:px-[8vw] md:py-20">
        <div>
          <p className="mb-4 text-lg font-light tracking-widest2">{SITE_NAME}</p>
          <p className="max-w-xs text-sm font-light leading-relaxed text-dim">{t.footer.blurb}</p>
        </div>
        <nav aria-label="เมนูท้ายเว็บ">
          <p className="mb-4 micro">{t.footer.nav}</p>
          <ul className="space-y-2.5 text-sm font-light">
            <li><Link href="/about/" className="text-dim transition-colors hover:text-cream">{t.nav.about}</Link></li>
            <li><Link href="/products/" className="text-dim transition-colors hover:text-cream">{t.nav.products}</Link></li>
            <li><Link href="/articles/" className="text-dim transition-colors hover:text-cream">{t.nav.articles}</Link></li>
            <li><Link href="/contact/" className="text-dim transition-colors hover:text-cream">{t.nav.contact}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-4 micro">{t.footer.contact}</p>
          <address className="space-y-2.5 text-sm font-light not-italic text-dim">
            <p>{lang === 'th' ? CONTACT.address_th : CONTACT.address_en}</p>
            <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
            <p>{CONTACT.email}</p>
            <p>{CONTACT.hours_th}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-line-6 px-6 py-6 text-[11px] tracking-widest text-dim md:px-[8vw]">
        © {year} {SITE_NAME} — {t.footer.rights}
      </div>
    </footer>
  );
}
