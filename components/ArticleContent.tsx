'use client';

// หน้าบทความเดี่ยว — เดิมฮาร์ดโค้ด .th ทุกจุด
// title / excerpt มีฉบับอังกฤษใน lib/posts.ts อยู่แล้ว
// tag กับเนื้อบทความ (body) ยังมีแต่ไทย → ตกกลับไปใช้ไทย ไม่ปล่อยว่าง

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { getPost } from '@/lib/posts';
import { lifestyleImages, lifestyleSrc, type LifestyleImage } from '@/lib/lifestyle.generated';

// แทรกภาพหลังย่อหน้าที่ 2 และ 4 — ภาพมาจาก post.bodyIds ตามลำดับ
const IMAGE_AFTER = [1, 3];

// ความกว้างจริงของช่องที่ 1440 ใช้เลือก rendition ไม่ให้ภาพถูกขยาย
const HERO_SLOT = 894;
const BODY_SLOT = 670;

/** ค้นภาพจาก id — id ผิดจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า */
function pic(id: string) {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}

/** กรอบภาพตามสัดส่วนจริงของไฟล์ — กันภาพกระโดดตอนโหลด */
function Figure({ image, alt, slot }: { image: LifestyleImage; alt: string; slot: number }) {
  return (
    <div
      className="overflow-hidden border border-line-6 bg-surface"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
      <img
        src={lifestyleSrc(image, slot, 2)}
        alt={alt}
        width={image.width}
        height={image.height}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export default function ArticleContent({ slug }: { slug: string }) {
  const { lang, t } = useLang();
  const post = getPost(slug);
  if (!post) return null;

  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  const tag = lang === 'en' ? (post.tagEn ?? post.tag) : post.tag;
  const body = lang === 'en' ? (post.bodyEn ?? post.body) : post.body;
  const hero = pic(post.heroId);
  const bodyImages = post.bodyIds.map(pic);

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
          <h1 className="font-display text-3xl font-normal leading-snug tracking-wide text-ink md:text-5xl md:leading-[1.25]">
            {post.title[lang]}
          </h1>
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-12 max-w-4xl">
        <Figure image={hero} alt={hero.alt[lang]} slot={HERO_SLOT} />
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl">
        {body.map((para, i) => (
          <div key={i}>
            <Reveal y={24}>
              <p className="mb-8 text-[15px] font-normal leading-loose text-dim">{para}</p>
            </Reveal>
            {IMAGE_AFTER.includes(i) && (
              <Reveal className="mb-10">
                <Figure
                  image={bodyImages[IMAGE_AFTER.indexOf(i)]}
                  alt={bodyImages[IMAGE_AFTER.indexOf(i)].alt[lang]}
                  slot={BODY_SLOT}
                />
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
