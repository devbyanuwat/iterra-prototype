'use client';

// หน้าแรก: แถบชวนเปิดแคตตาล็อก — ปกขยายเล็กน้อยตอน hover + ปุ่มเปิดดู/ดาวน์โหลด

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogTeaser() {
  const { t } = useLang();
  return (
    <section className="grid items-center gap-12 px-6 py-24 md:grid-cols-[1.3fr_1fr] md:px-[8vw] md:py-32">
      <Reveal>
        <Link href="/catalog/" className="group block overflow-hidden">
          <img
            src={CATALOG.page(1)}
            alt={t.catalog.title}
            loading="lazy"
            className="aspect-[1.414/1] w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
          />
        </Link>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.catalog.title}</h2>
        <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/catalog/"
            className="inline-block border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
          >
            {t.catalog.open}
          </Link>
          <a
            href={CATALOG.pdf}
            download
            className="inline-block px-2 py-3.5 text-[11px] uppercase tracking-widest2 text-warm-500 underline-offset-8 hover:text-ink hover:underline"
          >
            {t.catalog.download}
          </a>
        </div>
      </Reveal>
    </section>
  );
}
