'use client';

// หน้าสินค้ารวม: grid สินค้าครัว + 3D tilt

import ProductCard from './ProductCard';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { products } from '@/lib/products';

export default function ProductsContent() {
  const { t } = useLang();
  return (
    <>
      <section className="px-6 pb-12 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.products.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.products.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.1} y={28}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
