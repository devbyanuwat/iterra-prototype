'use client';

// หน้าสินค้ารวม: grid มืด + 3D tilt + filter หมวดครัว/ห้องน้ำ แบบ client-side
// รองรับ ?cat=kitchen|bath จากหน้าแรก (อ่านจาก URL ตอน mount)

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { products, type Category } from '@/lib/products';

type Filter = 'all' | Category;

// t.products.sub ยังเขียนตายตัวว่า "12 รายการ" / "Twelve curated…" ตั้งแต่ตอนเป็น mock
// ตอนนี้แคตตาล็อกจริงมีเป็นร้อยชิ้น ประโยคนั้นเลยผิดข้อเท็จจริง
// lib/i18n.ts อยู่นอกขอบเขต task E จึงประกอบประโยคจากจำนวนจริงที่นี่แทน
// ถ้าแก้ i18n เมื่อไหร่ ให้กลับไปใช้ t.products.sub ได้เลย
const SUB = {
  th: (n: number) => `อุปกรณ์ครัวและสุขภัณฑ์คัดสรร ${n} รายการ — ทุกชิ้นสัมผัสจริงได้ที่โชว์รูม`,
  en: (n: number) => `${n} curated kitchen and bath pieces — every one on display at our showroom.`,
};

export default function ProductsContent() {
  const { lang, t } = useLang();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('cat');
    if (cat === 'kitchen' || cat === 'bath') setFilter(cat);
  }, []);

  const list = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const filters: Filter[] = ['all', 'kitchen', 'bath'];

  return (
    <>
      <section className="px-6 pb-12 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.products.kicker}</p>
          <h1 className="font-display text-4xl font-extralight tracking-wide text-cream md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-dim">
            {SUB[lang](products.length)}
          </p>
        </Reveal>

        <div className="mt-10 flex items-center gap-2" role="group" aria-label={t.products.filterLabel}>
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`border px-5 py-2 text-[11px] uppercase tracking-widest2 transition-colors duration-300 ${
                filter === f
                  ? 'border-cream bg-cream text-[#08090A]'
                  : 'border-line-12 text-dim hover:border-cream hover:text-cream'
              }`}
            >
              {t.common.category[f]}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        {list.length === 0 ? (
          <p className="py-20 text-center text-sm text-dim">{t.products.empty}</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" key={filter}>
            {list.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.1} y={28}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
