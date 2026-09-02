'use client';

import Link from 'next/link';
import BrandMark from './BrandMark';
import { useLang } from './LangProvider';
import { CONTACT, SITE_NAME } from '@/lib/site';

export default function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-6 bg-base text-ink">
      <div className="grid gap-12 px-6 py-16 md:grid-cols-3 md:px-[8vw] md:py-20">
        <div>
          {/* เวิร์ดมาร์กเดียวกับเมนู ไม่ใช่ชื่อที่จัด tracking เอง — ไม่งั้นท้ายเว็บ
              กับหัวเว็บจะแสดงแบรนด์คนละแบบบนหน้าจอเดียวกัน
              (บรรทัดลิขสิทธิ์ข้างล่างยังเป็นตัวหนังสือ ตรงนั้นคือชื่อนิติบุคคลในประโยค
              ไม่ใช่โลโก้) */}
          <BrandMark height={20} alt={SITE_NAME} className="mb-4" />
          <p className="max-w-xs text-body-sm font-normal leading-relaxed text-dim">{t.footer.blurb}</p>
        </div>
        <nav aria-label="เมนูท้ายเว็บ">
          <p className="mb-4 micro">{t.footer.nav}</p>
          <ul className="space-y-2.5 text-body-sm font-normal">
            <li><Link href="/about/" className="text-dim transition-colors hover:text-ink">{t.nav.about}</Link></li>
            <li><Link href="/products/" className="text-dim transition-colors hover:text-ink">{t.nav.products}</Link></li>
            <li><Link href="/articles/" className="text-dim transition-colors hover:text-ink">{t.nav.articles}</Link></li>
            <li><Link href="/contact/" className="text-dim transition-colors hover:text-ink">{t.nav.contact}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-4 micro">{t.footer.contact}</p>
          <address className="space-y-2.5 text-body-sm font-normal not-italic text-dim">
            <p>{lang === 'th' ? CONTACT.address_th : CONTACT.address_en}</p>
            <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
            <p>{CONTACT.email}</p>
            <p>{t.footer.hours}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-line-6 px-6 py-6 text-label tracking-widest text-dim md:px-[8vw]">
        © {year} {SITE_NAME} — {t.footer.rights}
      </div>
    </footer>
  );
}
