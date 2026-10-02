'use client';

// หน้าแคตตาล็อก: หัวเรื่อง + ปุ่มดาวน์โหลด + grid ทุกหน้า

import Reveal from './Reveal';
import CatalogViewer from './CatalogViewer';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogContent() {
  const { t } = useLang();
  return (
    <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.catalog.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        </div>
        <a
          href={CATALOG.pdf}
          download
          className="inline-block shrink-0 border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
        >
          {t.catalog.download} · {CATALOG.pdfSizeMB} MB
        </a>
      </Reveal>
      <CatalogViewer />
    </section>
  );
}
