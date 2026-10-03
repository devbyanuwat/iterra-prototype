'use client';

// หน้าสินค้ารวมแบบ editorial: สินค้าเด่นเต็มความกว้าง → แถวภาพ/ข้อความสลับซ้าย–ขวา
// ภาพ parallax เลื่อนสวนทิศทีละแถว + reveal (เดสก์ท็อป) · มือถือเรียงภาพแล้วข้อความ

import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import { useLang } from './LangProvider';
import { products } from '@/lib/products';

export default function ProductsContent() {
  const { lang, t } = useLang();
  const [lead, ...rest] = [...products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

  return (
    <>
      <section className="px-6 pb-12 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.products.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.products.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 md:px-[8vw]">
        <Reveal>
          <Link href={`/products/${lead.slug}/`} className="group block">
            {/* ภาพสินค้าตัดพื้นหลังบนเวทีสีเข้ม ข้อความอยู่ใต้ภาพทุกขนาดจอ จะได้ไม่ทับตัวสินค้า */}
            <ParallaxImage src={lead.images[0]} fit="contain" ratio="21/9" speed={-6} dark />
            <div className="pt-6">
              <p className="mb-2 text-[10px] uppercase tracking-widest2 text-warm-500">{t.products.featured}</p>
              <h2 className="text-2xl font-extralight tracking-wide md:text-4xl">{lead.name[lang]}</h2>
              <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-stone-600">{lead.desc[lang]}</p>
              <span className="mt-6 inline-block text-[11px] uppercase tracking-widest2 transition-transform duration-500 group-hover:translate-x-1.5">
                {t.common.readMore} →
              </span>
            </div>
          </Link>
        </Reveal>
      </section>

      <section className="space-y-24 px-6 py-24 md:space-y-36 md:px-[8vw] md:py-36">
        {rest.map((p, i) => (
          <div key={p.slug} className="grid items-center gap-8 md:grid-cols-12 md:gap-0">
            <Reveal className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}>
              {/* ลิงก์ภาพซ้ำกับ "อ่านต่อ" → ซ่อนจาก tab/screen reader */}
              <Link href={`/products/${p.slug}/`} className="block" tabIndex={-1} aria-hidden="true">
                <ParallaxImage src={p.images[0]} fit="contain" ratio="4/5" speed={i % 2 ? 7 : -7} />
              </Link>
            </Reveal>
            <Reveal delay={0.12} className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
              <p className="text-[10px] uppercase tracking-widest2 text-warm-500">{t.common.category[p.category]}</p>
              <h2 className="mt-3 text-3xl font-extralight leading-snug tracking-wide">{p.name[lang]}</h2>
              <p className="mt-5 text-sm font-light leading-loose text-stone-600">{p.desc[lang]}</p>
              <p className="mt-5 text-sm font-light">{p.price[lang]}</p>
              <Link
                href={`/products/${p.slug}/`}
                className="mt-8 inline-block text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
              >
                {t.common.readMore} →
              </Link>
            </Reveal>
          </div>
        ))}
      </section>
    </>
  );
}
