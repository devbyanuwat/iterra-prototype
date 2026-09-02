'use client';

import Link from '@/components/Link';
import BrandMark from './BrandMark';
import { useLang } from './LangProvider';
import { contentPages } from '@/lib/pages.generated';
import { CONTACT, SITE_NAME } from '@/lib/site';

/**
 * หน้าข้อมูลเก้าหน้าอยู่ท้ายเว็บ ไม่ใช่เมนูหลัก (task C3)
 *
 * เมนูหลักมีเก้ารายการแล้ว และเก้าหน้านี้เป็นของที่คนหาเมื่อ "รู้ว่าอยากได้อะไร"
 * — วิธีล้างผิวเคลือบ เงื่อนไขรับประกัน แคตตาล็อก PDF — ไม่ใช่ของที่ต้องเห็น
 * ตลอดเวลาระหว่างเดินดูสินค้า ท้ายเว็บคือที่ที่คนไปหาของแบบนี้จริง ๆ
 *
 * เรียงตามความยาวชื่อ ไม่ใช่ตามลำดับใน harvest — คอลัมน์ท้ายเว็บอ่านเป็นรายการ
 * ไม่ใช่สารบัญ ชื่อสั้นขึ้นก่อนทำให้กวาดตาได้เร็วกว่า
 */
const INFO_LINKS = [...contentPages].sort(
  (a, b) => (a.title.en || a.title.th).length - (b.title.en || b.title.th).length,
);

export default function Footer() {
  const { lang, t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-6 bg-base text-ink">
      <div className="grid gap-12 px-6 py-16 md:grid-cols-4 md:px-[8vw] md:py-20">
        <div>
          {/* เวิร์ดมาร์กเดียวกับเมนู ไม่ใช่ชื่อที่จัด tracking เอง — ไม่งั้นท้ายเว็บ
              กับหัวเว็บจะแสดงแบรนด์คนละแบบบนหน้าจอเดียวกัน
              (บรรทัดลิขสิทธิ์ข้างล่างยังเป็นตัวหนังสือ ตรงนั้นคือชื่อนิติบุคคลในประโยค
              ไม่ใช่โลโก้) */}
          <BrandMark height={20} alt={SITE_NAME} className="mb-4" />
          <p className="max-w-xs text-body-sm font-normal leading-relaxed text-dim">{t.footer.blurb}</p>
        </div>
        <nav aria-label={t.footer.nav}>
          <p className="mb-4 micro">{t.footer.nav}</p>
          <ul className="space-y-2.5 text-body-sm font-normal">
            <li><Link href="/about/" className="text-dim transition-colors hover:text-ink">{t.nav.about}</Link></li>
            <li><Link href="/products/" className="text-dim transition-colors hover:text-ink">{t.nav.products}</Link></li>
            <li><Link href="/articles/" className="text-dim transition-colors hover:text-ink">{t.nav.articles}</Link></li>
            <li><Link href="/stores/" className="text-dim transition-colors hover:text-ink">{t.nav.stores}</Link></li>
            <li><Link href="/contact/" className="text-dim transition-colors hover:text-ink">{t.nav.contact}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t.nav.info}>
          <p className="mb-4 micro">{t.nav.info}</p>
          <ul className="space-y-2.5 text-body-sm font-normal">
            {INFO_LINKS.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/info/${page.slug}/`}
                  className="text-dim transition-colors hover:text-ink"
                >
                  {/* /faq ว่างที่ต้นทาง ชื่อจริงของมันคือคำว่า "Empty" ตามตัวอักษร
                      จึงใช้ชื่อที่บอกความจริงแทน ไม่ใช่พาไปหน้าที่ชื่อว่า Empty */}
                  {page.status === 'stub'
                    ? t.info.faqShort
                    : page.title[lang] || page.title.th || t.info.untitled}
                </Link>
              </li>
            ))}
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
