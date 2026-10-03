'use client';

// หน้าแรก: hero → ผนังภาพ parallax → เรื่องราว → สินค้าเด่น → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA (ไม่มี section ไหน pin)

import Link from 'next/link';
import Hero from '@/components/Hero';
import CatalogTeaser from '@/components/CatalogTeaser';
import ImageWall from '@/components/ImageWall';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import ParallaxImage from '@/components/ParallaxImage';
import ProductCard from '@/components/ProductCard';
import Placeholder from '@/components/Placeholder';
import { useLang } from '@/components/LangProvider';
import { featuredProducts } from '@/lib/products';
import { posts } from '@/lib/posts';

// ภาพประกอบเรื่องราวยังเป็น placeholder (ลำดับตรงกับ t.home.storySlides)
const STORY_IMAGES = ['เรื่องราว ภาพ 01 (โชว์รูม)', 'เรื่องราว ภาพ 02 (สัมผัสจริง)', 'เรื่องราว ภาพ 03 (ทีมติดตั้ง)'];

function StoryText({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h2 className="mb-4 text-2xl font-extralight tracking-wide md:text-3xl">{title}</h2>
      <p className="text-sm font-light leading-relaxed text-warm-500">{body}</p>
    </>
  );
}

// เรื่องราว: 2 แถวแรกภาพสลับซ้าย-ขวา แถวที่ 3 ภาพเต็มความกว้างแล้วข้อความใต้ภาพ (ไม่ zigzag เกิน 2 แถว)
// ภาพ parallax ในกรอบ + ข้อความ reveal (เหตุผล: ภาพเลื่อนช้ากว่ากรอบให้ความลึกเหมือนผนังภาพด้านบน)
function StoryRows() {
  const { t } = useLang();
  const slides = t.home.storySlides;
  const last = slides[slides.length - 1];
  return (
    <section className="space-y-24 px-6 py-24 md:space-y-40 md:px-[8vw] md:py-40">
      {slides.slice(0, -1).map((s, i) => (
        <div key={i} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
          <ParallaxImage
            label={STORY_IMAGES[i]}
            ratio="3/2"
            className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}
          />
          <Reveal className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
            <StoryText title={s.title} body={s.body} />
          </Reveal>
        </div>
      ))}
      <div>
        <ParallaxImage label={STORY_IMAGES[slides.length - 1]} ratio="21/9" />
        <Reveal className="mt-8 max-w-[65ch]">
          <StoryText title={last.title} body={last.body} />
        </Reveal>
      </div>
    </section>
  );
}

// สินค้าเด่น: สินค้าหลักใบใหญ่ + อีก 3 ชิ้นเป็นรายการ (ไม่ซ้ำแบบการ์ดเท่ากันของบทความ)
// reveal ใบหลักก่อนแล้วรายการทีละแถว (เหตุผล: ลำดับความสำคัญ สินค้าหลักมาก่อน)
function FeaturedProducts() {
  const { lang, t } = useLang();
  const [lead, ...rest] = featuredProducts;
  return (
    <section className="border-t border-warm-200 px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between gap-6">
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.featuredTitle}</h2>
        <Link
          href="/products/"
          className="shrink-0 text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
        >
          {t.common.viewAll} →
        </Link>
      </Reveal>
      <div className="grid gap-12 md:grid-cols-12 md:gap-16">
        <Reveal className="md:col-span-7">
          <ProductCard product={lead} />
        </Reveal>
        <ul className="divide-y divide-warm-200 md:col-span-5 md:self-center">
          {rest.map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={i * 0.1} y={20}>
                <Link href={`/products/${p.slug}/`} className="group flex items-center gap-5 py-6">
                  <div className="w-24 shrink-0 overflow-hidden md:w-28">
                    <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                      <Placeholder label={p.images[0]} ratio="1/1" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-light tracking-wide">{p.name[lang]}</h3>
                    <p className="mt-1 text-[12px] font-light text-warm-500">{p.price[lang]}</p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
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
          <Reveal key={i} delay={i * 0.1} y={20}>
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
      <ImageWall />
      <StoryRows />
      <FeaturedProducts />
      <Stats />
      <CatalogTeaser />
      <LatestPosts />
      <ContactCta />
    </>
  );
}
