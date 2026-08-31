'use client';

// หน้าแรก: hero AD-1 → หมวดสินค้า → horizontal gallery →
// pinned story → สถิติ count-up → บทความล่าสุด → CTA
//
// Hero กับ HorizontalGallery รับรูปสินค้าจริงเป็น prop จาก generated catalogue
// (task D ทำ component ไว้แบบ props-only จงใจ ไม่ให้ผูกกับ lib/products)

import Link from 'next/link';
import Hero from '@/components/Hero';
import PinnedStory from '@/components/PinnedStory';
import HorizontalGallery from '@/components/HorizontalGallery';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import ParallaxImage from '@/components/ParallaxImage';
import { useLang } from '@/components/LangProvider';
import { featuredProducts, products } from '@/lib/products';
import { posts } from '@/lib/posts';

/** สินค้าที่มีเฉดเยอะสุด ใช้เป็นตัวชูโรงบน hero */
function heroProduct() {
  const pool = featuredProducts.length ? featuredProducts : products;
  return [...pool].sort((a, b) => b.finishes.length - a.finishes.length)[0];
}

function CategoryBand() {
  const { lang, t } = useLang();
  // รูปหมวดใช้สินค้าจริงตัวแรกของหมวดนั้น แทนที่จะเป็นภาพ stock ที่ยังไม่มี
  const pick = (cat: 'kitchen' | 'bath') => products.find((p) => p.category === cat);
  const cats = [
    { key: 'kitchen' as const, title: t.home.catKitchen, desc: t.home.catKitchenDesc },
    { key: 'bath' as const, title: t.home.catBath, desc: t.home.catBathDesc },
  ];
  return (
    <section className="bg-base px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14">
        <p className="micro mb-3">CATEGORIES</p>
        <h2 className="font-display text-3xl font-extralight tracking-wide text-cream md:text-4xl">
          {t.home.catTitle}
        </h2>
        <p className="mt-3 text-sm font-light text-dim">{t.home.catSub}</p>
      </Reveal>
      <div className="grid gap-8 md:grid-cols-2">
        {cats.map((c, i) => {
          const p = pick(c.key);
          return (
            <Reveal key={c.key} delay={i * 0.12}>
              <Link href={`/products/?cat=${c.key}`} className="group block">
                <ParallaxImage
                  src={p?.finishes[0]?.image}
                  alt={p ? p.name[lang] : ''}
                  ratio="3/2"
                  speed={i % 2 ? 7 : -7}
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
                <div className="mt-5 flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-extralight tracking-wide text-cream">
                    {c.title}
                  </h3>
                  <span className="micro transition-transform duration-300 group-hover:translate-x-1.5">
                    →
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-light text-dim">{c.desc}</p>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useLang();
  return (
    <section className="border-y border-line-6 bg-base px-6 py-20 md:px-[8vw] md:py-24">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
        {t.home.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} y={20}>
            <div className="text-center">
              <p className="font-display text-5xl font-extralight tracking-wide text-cream md:text-6xl">
                <CountUp to={s.value} suffix={s.suffix} />
              </p>
              <p className="micro mt-3">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function LatestPosts() {
  const { lang, t } = useLang();
  const latest = posts.slice(0, 3);
  return (
    <section className="bg-base px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between">
        <div>
          <p className="micro mb-3">{t.home.articlesKicker}</p>
          <h2 className="font-display text-3xl font-extralight tracking-wide text-cream md:text-4xl">
            {t.home.articlesTitle}
          </h2>
        </div>
        <Link href="/articles/" className="micro hidden underline-offset-8 hover:underline md:block">
          {t.common.viewAll}
        </Link>
      </Reveal>
      <div className="grid gap-10 md:grid-cols-3">
        {latest.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.12}>
            <Link href={`/articles/${post.slug}/`} className="group block">
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                  <ParallaxImage ratio="16/9" speed={i % 2 ? 5 : -5} sizes="(max-width: 768px) 100vw, 30vw" />
                </div>
              </div>
              <p className="micro mt-5">
                {post.tag} ·{' '}
                {new Date(post.date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <h3 className="mt-2 text-lg font-light leading-snug tracking-wide text-cream">
                {post.title[lang]}
              </h3>
              <p className="mt-2 text-[13px] font-light leading-relaxed text-dim">{post.excerpt[lang]}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ContactCta() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-base px-6 py-28 text-center md:py-36">
      <Reveal>
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-extralight leading-snug tracking-wide text-cream md:text-5xl">
          {t.home.ctaTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light text-dim">{t.home.ctaSub}</p>
        <Link
          href="/contact/"
          className="mt-10 inline-block border border-line-12 px-10 py-4 text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          <span className="micro !text-current">{t.home.ctaBtn}</span>
        </Link>
      </Reveal>
    </section>
  );
}

export default function HomeContent() {
  const { lang } = useLang();
  const hero = heroProduct();

  // การ์ดแกลเลอรีรับรูปจริง + จำนวนเฉดเป็น meta (ไม่ใช่ราคา)
  const galleryItems = (featuredProducts.length ? featuredProducts : products.slice(0, 8)).map((p) => ({
    slug: p.slug,
    category: p.category,
    name: p.name,
    image: p.finishes[0]?.image,
    meta:
      p.finishes.length > 1
        ? { th: `${p.finishes.length} เฉด`, en: `${p.finishes.length} finishes` }
        : undefined,
  }));

  return (
    <>
      <Hero image={hero?.finishes[0]?.image} imageAlt={hero ? hero.name[lang] : ''} />
      <CategoryBand />
      <HorizontalGallery items={galleryItems} />
      <PinnedStory />
      <Stats />
      <LatestPosts />
      <ContactCta />
    </>
  );
}
