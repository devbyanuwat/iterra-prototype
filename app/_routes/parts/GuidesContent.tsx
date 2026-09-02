'use client';

// หน้ารวมคู่มือเลือกซื้อ (task C1)
//
// วางตัวแบบเดียวกับ /articles: หัวเรื่องเป็น text-hero แล้วตามด้วยกริดการ์ด —
// นี่คือหน้าอ่าน ไม่ใช่กริดสินค้า ระยะและสเกลจึงยืมจาก ArticlesContent ตรง ๆ
//
// สิ่งที่การ์ดต้องบอกให้ครบมีสามอย่าง: คู่มือนี้คืออะไร ข้างในมีเท่าไหร่ และ
// **ฉบับอังกฤษมีไม่ครบตรงไหน** ข้อสุดท้ายมีเฉพาะตอนอ่านเป็นภาษาอังกฤษ เพราะ
// ฉบับไทยของต้นทางมีครบทุกบล็อกอยู่แล้ว ธงที่ข้อมูลติดมาคือ "อังกฤษไม่มี"
// ไม่ใช่ "ไทยไม่มี" (ดู app/guides/coverage.ts)

import Link from '@/components/Link';
import Reveal from '@/components/Reveal';
import { useLang } from '@/components/LangProvider';
import type { GuidePicture } from './guide-media';
import type { Coverage } from './coverage';

export type GuideCard = {
  slug: string;
  sections: number;
  options: number;
  coverage: Coverage;
  cover: GuidePicture | null;
};

/** ความกว้างจริงของการ์ดที่ 1440 (กริดสามคอลัมน์ใน px-[8vw]) */
const CARD_SLOT = 370;

export default function GuidesContent({ items }: { items: GuideCard[] }) {
  const { lang, t } = useLang();

  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.guides.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.guides.title}</h1>
          <p className="mt-6 max-w-xl text-body text-dim">{t.guides.intro(items.length)}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const partial = item.coverage.missing > 0;
            return (
              <li key={item.slug}>
                <Reveal delay={(i % 3) * 0.1} y={30}>
                  <Link href={`/guides/${item.slug}/`} className="group block">
                    <div className="overflow-hidden border border-line-6 bg-surface">
                      <div
                        className="transition-transform duration-700 ease-out group-hover:scale-105"
                        style={{ aspectRatio: '3 / 2' }}
                      >
                        {item.cover && (
                          /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */
                          <img
                            src={item.cover.src}
                            srcSet={item.cover.srcSet}
                            sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${CARD_SLOT}px`}
                            alt=""
                            width={item.cover.width}
                            height={item.cover.height}
                            className="h-full w-full object-cover"
                            loading={i < 3 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                        )}
                      </div>
                    </div>

                    <p className="mt-5 micro">
                      {t.guides.sections(item.sections)} · {t.guides.options(item.options)}
                    </p>
                    <h2 className="mt-2 text-card font-normal text-ink">
                      {t.guideNames[item.slug] ?? item.slug}
                    </h2>
                    {/* ป้ายความครบของภาษาอังกฤษ — เฉพาะตอนอ่านเป็นอังกฤษ
                        ฉบับไทยไม่มีช่องว่างให้ประกาศ จึงไม่ควรมีป้ายมารบกวน */}
                    {lang === 'en' && (
                      <p className={`mt-3 text-body-sm ${partial ? 'text-ink' : 'text-dim'}`}>
                        {partial ? (
                          <span className="inline-block border border-line-12 px-2 py-0.5 text-label uppercase tracking-widest2">
                            {t.guides.enCoverage(item.coverage.withEn, item.coverage.total)}
                          </span>
                        ) : (
                          t.guides.enCoverage(item.coverage.withEn, item.coverage.total)
                        )}
                      </p>
                    )}
                    <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
                      {t.common.readMore} →
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mt-16 border-t border-line-6 pt-8">
          <p className="text-body-sm text-dim">{t.guides.referenceNote}</p>
          <p className="mt-2 text-body-sm text-dim">{t.articles.sourceNote}</p>
        </Reveal>
      </section>
    </>
  );
}
