'use client';

// หน้าแคตตาล็อก: หัวเรื่อง ปุ่มดาวน์โหลด และ grid ทุกหน้า · ข้อมูลไฟล์มาจาก DB (แก้ที่ /admin/catalog/)
// ภาพรายหน้าสร้างจาก PDF ชุดเดิมด้วย scripts/build-media.sh · เปลี่ยน PDF แล้วภาพชุดนี้ไม่ตรง จึงให้เปิด PDF ตรงแทน (spec หัวข้อ 10)

import Reveal from './Reveal';
import CatalogViewer from './CatalogViewer';
import { useLang } from './LangProvider';
import type { CatalogInfo } from '@/lib/server/catalog';

const button =
  'inline-block shrink-0 border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper';

export default function CatalogContent({ catalog }: { catalog: CatalogInfo }) {
  const { t } = useLang();
  return (
    <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.catalog.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        </div>
        <a href={catalog.pdf} download className={button}>
          {t.catalog.download} · {catalog.sizeMb} MB
        </a>
      </Reveal>
      {catalog.images ? (
        <CatalogViewer pages={catalog.pages} pdf={catalog.pdf} />
      ) : (
        <Reveal>
          <p className="max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.noPreview}</p>
          <a href={catalog.pdf} target="_blank" rel="noopener" className={`${button} mt-8`}>
            {t.catalog.openPdf}
          </a>
        </Reveal>
      )}
    </section>
  );
}
