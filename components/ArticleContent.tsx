'use client';

// หน้าบทความเดี่ยว — เดิมฮาร์ดโค้ด .th ทุกจุด
// title / excerpt มีฉบับอังกฤษใน lib/posts.ts อยู่แล้ว
// tag กับเนื้อบทความ (body) ยังมีแต่ไทย → ตกกลับไปใช้ไทย ไม่ปล่อยว่าง

import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import { useLang } from './LangProvider';
import { getPost } from '@/lib/posts';

// แทรกภาพ parallax หลังย่อหน้าที่ 2 และ 4 (ยังไม่มีภาพบทความจริง — กรอบตาม token)
const IMAGE_AFTER = new Set([1, 3]);

export default function ArticleContent({ slug }: { slug: string }) {
  const { lang, t } = useLang();
  const post = getPost(slug);
  if (!post) return null;

  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  const tag = lang === 'en' ? (post.tagEn ?? post.tag) : post.tag;
  const body = lang === 'en' ? (post.bodyEn ?? post.body) : post.body;

  return (
    <article className="px-6 pb-28 pt-36 md:pt-44">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="mb-4 micro">
            {tag} ·{' '}
            {new Date(post.date).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="font-display text-3xl font-extralight leading-snug tracking-wide text-cream md:text-5xl md:leading-[1.25]">
            {post.title[lang]}
          </h1>
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-12 max-w-4xl">
        <ParallaxImage ratio="16/9" speed={-6} />
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl">
        {body.map((para, i) => (
          <div key={i}>
            <Reveal y={24}>
              <p className="mb-8 text-[15px] font-light leading-loose text-dim">{para}</p>
            </Reveal>
            {IMAGE_AFTER.has(i) && (
              <Reveal className="mb-10">
                <ParallaxImage ratio="3/2" speed={i % 2 ? 6 : -6} />
              </Reveal>
            )}
          </div>
        ))}

        <Reveal>
          <div className="mt-12 border-t border-line-6 pt-8">
            <Link href="/articles/" className="micro underline-offset-8 hover:underline">
              ← {t.nav.articles}
            </Link>
          </div>
        </Reveal>
      </div>
    </article>
  );
}
