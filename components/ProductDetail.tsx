'use client';

// รายละเอียดสินค้า (template): แกลเลอรีภาพ parallax เลื่อนสวนทิศเล็กน้อย,
// ข้อมูล sticky ด้านขวา, ตารางสเปก, สินค้าใกล้เคียง, ปุ่มสอบถาม

import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import ProductCard from './ProductCard';
import { useLang } from './LangProvider';
import { getProduct, relatedProducts } from '@/lib/products';

export default function ProductDetail({ slug }: { slug: string }) {
  const { lang, t } = useLang();
  const product = getProduct(slug);
  if (!product) return null;
  const related = relatedProducts(slug);

  return (
    <>
      <section className="px-6 pb-24 pt-32 md:px-[6vw] md:pt-40">
        {/* breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-10 text-[11px] uppercase tracking-widest2 text-warm-500">
          <Link href="/products/" className="hover:text-ink">
            {t.nav.products}
          </Link>
          <span className="mx-2">/</span>
          <span aria-current="page">{product.name[lang]}</span>
        </nav>

        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-[6vw]">
          {/* แกลเลอรี parallax — ภาพคู่–คี่เลื่อนสวนทิศกัน */}
          <div className="space-y-8">
            {[
              ...product.images.map((src) => ({ src, fit: 'contain' as const })),
              ...(product.scenes ?? []).map((src) => ({ src, fit: 'cover' as const })),
            ].map((img, i) => (
              <Reveal key={img.src} delay={i === 0 ? 0 : 0.1}>
                <ParallaxImage
                  label={product.name[lang]}
                  src={img.src}
                  fit={img.fit}
                  ratio={i === 0 ? '4/5' : '3/2'}
                  speed={i % 2 ? 7 : -7}
                />
              </Reveal>
            ))}
          </div>

          {/* ข้อมูลสินค้า */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">
                {t.common.category[product.category]}
              </p>
              <h1 className="text-3xl font-extralight leading-snug tracking-wide md:text-4xl">
                {product.name[lang]}
              </h1>
              <p className="mt-2 text-sm font-light text-warm-500">
                {lang === 'th' ? product.name.en : product.name.th}
              </p>
              <p className="mt-6 max-w-md text-sm font-light leading-loose text-stone-600">
                {product.desc[lang]}
              </p>
              <p className="mt-6 text-lg font-light">{product.price[lang]}</p>

              {/* ตารางสเปก */}
              <h2 className="mb-3 mt-10 text-[11px] uppercase tracking-widest2 text-warm-500">
                {t.products.specs}
              </h2>
              <table className="w-full max-w-md border-collapse text-sm font-light">
                <tbody>
                  {product.specs.map((s) => (
                    <tr key={s.label} className="border-b border-warm-200">
                      <th scope="row" className="py-3 pr-6 text-left font-normal text-warm-500">
                        {s.label}
                      </th>
                      <td className="py-3">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <Link
                href={`/contact/?product=${product.slug}`}
                className="mt-10 inline-block border border-ink px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
              >
                {t.common.inquire}
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* สินค้าใกล้เคียง */}
      {related.length > 0 && (
        <section className="border-t border-warm-200 px-6 py-24 md:px-[6vw]">
          <Reveal className="mb-12">
            <h2 className="text-2xl font-extralight tracking-wide md:text-3xl">{t.products.related}</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.1}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
