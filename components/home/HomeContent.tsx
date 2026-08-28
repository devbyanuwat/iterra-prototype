'use client';

// หน้าแรก: hero parallax → หมวดสินค้า → horizontal gallery →
// pinned story → สถิติ count-up → บทความล่าสุด → CTA

import Link from 'next/link';
import Hero from '@/components/Hero';
import PinnedStory from '@/components/PinnedStory';
import HorizontalGallery from '@/components/HorizontalGallery';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import ParallaxImage from '@/components/ParallaxImage';
import { useLang } from '@/components/LangProvider';
import { featuredProducts } from '@/lib/products';
import { posts } from '@/lib/posts';

function CategoryBand() {
  const { t } = useLang();
  const cats = [
    { key: 'kitchen', title: t.home.catKitchen, desc: t.home.catKitchenDesc, label: 'หมวดครัว 3:2' },
    { key: 'bath', title: t.home.catBath, desc: t.home.catBathDesc, label: 'หมวดห้องน้ำ 3:2' },
  ];
  return (
    <section className="px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14">
        <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">CATEGORIES</p>
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.catTitle}</h2>
        <p className="mt-3 text-sm font-light text-warm-500">{t.home.catSub}</p>
      </Reveal>
      <div className="grid gap-8 md:grid-cols-2">
        {cats.map((c, i) => (
          <Reveal key={c.key} delay={i * 0.12}>
            <Link href={`/products/?cat=${c.key}`} className="group block">
              <ParallaxImage label={c.label} ratio="3/2" speed={i % 2 ? 7 : -7} />
              <div className="mt-5 flex items-baseline justify-between">
                <h3 className="text-2xl font-extralight tracking-wide">{c.title}</h3>
                <span className="text-[11px] uppercase tracking-widest2 text-warm-500 transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </div>
              <p className="mt-2 text-[13px] font-light text-warm-500">{c.desc}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useLang();
  return (
    <section className="border-y border-warm-200 px-6 py-20 md:px-[8vw] md:py-24">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
        {t.home.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} y={20}>
            <div className="text-center">
              <p className="text-5xl font-extralight tracking-wide md:text-6xl">
                <CountUp to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-[12px] font-light uppercase tracking-widest text-warm-500">{s.label}</p>
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
    <section className="px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">{t.home.articlesKicker}</p>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.articlesTitle}</h2>
        </div>
        <Link
          href="/articles/"
          className="hidden text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline md:block"
        >
          {t.common.viewAll}
        </Link>
      </Reveal>
      <div className="grid gap-10 md:grid-cols-3">
        {latest.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.12}>
            <Link href={`/articles/${post.slug}/`} className="group block">
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                  <ParallaxImage label={post.cover} ratio="16/9" speed={i % 2 ? 5 : -5} />
                </div>
              </div>
              <p className="mt-5 text-[10px] uppercase tracking-widest2 text-warm-500">
                {post.tag} · {new Date(post.date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <h3 className="mt-2 text-lg font-light leading-snug tracking-wide">{post.title[lang]}</h3>
              <p className="mt-2 text-[13px] font-light leading-relaxed text-warm-500">{post.excerpt[lang]}</p>
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
    <section className="relative overflow-hidden bg-ink px-6 py-28 text-center text-paper md:py-36">
      <Reveal>
        <h2 className="mx-auto max-w-2xl text-3xl font-extralight leading-snug tracking-wide md:text-5xl">
          {t.home.ctaTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light text-paper/60">{t.home.ctaSub}</p>
        <Link
          href="/contact/"
          className="mt-10 inline-block border border-paper/50 px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-paper hover:text-ink"
        >
          {t.home.ctaBtn}
        </Link>
      </Reveal>
    </section>
  );
}

export default function HomeContent() {
  return (
    <>
      <Hero />
      <CategoryBand />
      <HorizontalGallery items={featuredProducts} />
      <PinnedStory />
      <Stats />
      <LatestPosts />
      <ContactCta />
    </>
  );
}
