'use client';

// หน้ารวมบทความ — เดิมฮาร์ดโค้ด post.title.th / excerpt.th และวันที่ th-TH
// ทั้งที่ lib/posts.ts มีฉบับอังกฤษของ title กับ excerpt อยู่แล้วแต่ไม่มีใครอ่าน

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { posts } from '@/lib/posts';
import { articlesIntro, pick } from '@/lib/i18n';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';

// ความกว้างจริงของการ์ดที่ 1440 ใช้เลือก rendition ไม่ให้ภาพถูกขยาย
const CARD_SLOT = 370;

/** ค้นภาพจาก id — id ผิดจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า */
function pic(id: string) {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}

export default function ArticlesContent() {
  const { lang, t } = useLang();
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';

  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.articles.kicker}</p>
          <h1 className="font-display text-4xl font-normal tracking-wide text-ink md:text-5xl">
            {t.nav.articles}
          </h1>
          <p className="mt-4 max-w-lg text-body-sm font-normal leading-relaxed text-dim">
            {pick(articlesIntro, lang)}
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => {
            const cover = pic(post.coverId);
            return (
            <Reveal key={post.slug} delay={(i % 3) * 0.12} y={30}>
              <Link href={`/articles/${post.slug}/`} className="group block">
                <div className="overflow-hidden border border-line-6 bg-surface">
                  <div
                    className="transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ aspectRatio: `${cover.width} / ${cover.height}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
                    <img
                      src={lifestyleSrc(cover, CARD_SLOT, 2)}
                      alt={cover.alt[lang]}
                      width={cover.width}
                      height={cover.height}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <p className="mt-5 micro">
                  {post.tagEn && lang === 'en' ? post.tagEn : post.tag} ·{' '}
                  {new Date(post.date).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <h2 className="mt-2 text-lg font-normal leading-snug tracking-wide text-ink">
                  {post.title[lang]}
                </h2>
                <p className="mt-2 text-body-sm font-normal leading-relaxed text-dim">
                  {post.excerpt[lang]}
                </p>
                <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
                  {t.common.readMore} →
                </span>
              </Link>
            </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
}
