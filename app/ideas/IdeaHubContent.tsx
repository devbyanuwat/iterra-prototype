'use client';

// ไอเดียหนึ่งชุด (task C1)
//
// การ์ดหน้าตาเดียวกับ /articles เป๊ะ ๆ เพราะมันคือของชนิดเดียวกัน: เรื่องให้อ่าน
// ต่างกันแค่ปลายทาง — เรื่องไหนที่เรามีบทความอยู่ในเว็บนี้แล้วจะพาไปอ่านที่นี่
// เรื่องที่เหลือลิงก์ออกไปต้นฉบับพร้อมเครื่องหมาย ↗ ไม่ใช่ลิงก์ตายหรือการ์ดที่กดไม่ได้
//
// หัวข้อกับคำโปรยเป็นของต้นทางทั้งคู่ ไม่ได้เอาชื่อบทความในเว็บเรามาทับ:
// บทความไทยของ KOHLER ไม่มีฉบับอังกฤษ (lib/posts.ts เขียนไว้ว่า en ถือสตริงไทย
// ตัวเดียวกัน) ส่วนการ์ดของหน้าไอเดียมีอังกฤษจริง การเอาชื่อบทความมาทับจึงเท่ากับ
// ทิ้งภาษาอังกฤษที่มีอยู่แล้วลงถังในหน้าที่ประกาศ lang="en"

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { useLang } from '@/components/LangProvider';
import type { Picture } from './media';

export type IdeaCard = {
  key: string;
  href: string;
  /** true = ออกไปนอกเว็บ (ต้นฉบับบน kohler.co.th) */
  external: boolean;
  heading: { th: string; en: string };
  blurb: { th: string; en: string };
  picture: Picture | null;
};

export type HubView = {
  slug: string;
  sourceUrl: string;
  items: IdeaCard[];
};

/** ความกว้างจริงของการ์ดที่ 1440 — กริดสามคอลัมน์ใน px-[8vw] */
const CARD_SLOT = 370;

export default function IdeaHubContent({ hub }: { hub: HubView }) {
  const { lang, t } = useLang();
  const name = t.ideas.names[hub.slug] ?? hub.slug;

  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <Link href="/ideas/" className="mb-4 inline-block micro underline-offset-8 hover:underline">
            ← {t.ideas.title}
          </Link>
          <h1 className="font-display text-hero font-normal text-ink">{name}</h1>
          <p className="mt-6 max-w-xl text-body text-dim">{t.ideas.stories(hub.items.length)}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {hub.items.map((item, i) => {
            const inner = (
              <>
                <div className="overflow-hidden border border-line-6 bg-surface">
                  <div
                    className="transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ aspectRatio: '3 / 2' }}
                  >
                    {item.picture && (
                      /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */
                      <img
                        src={item.picture.src}
                        srcSet={item.picture.srcSet}
                        sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${CARD_SLOT}px`}
                        alt=""
                        width={item.picture.width}
                        height={item.picture.height}
                        className="h-full w-full object-cover"
                        loading={i < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    )}
                  </div>
                </div>
                <h2 className="mt-5 text-card font-normal text-ink">{item.heading[lang]}</h2>
                <p className="mt-3 text-body-sm leading-relaxed text-dim">{item.blurb[lang]}</p>
                <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
                  {item.external ? `${t.articles.source} ↗` : `${t.ideas.readHere} →`}
                </span>
              </>
            );

            return (
              <li key={item.key}>
                <Reveal delay={(i % 3) * 0.1} y={30}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link href={item.href} className="group block">
                      {inner}
                    </Link>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line-6 pt-8">
          <Link href="/articles/" className="micro underline-offset-8 hover:underline">
            {t.nav.articles} →
          </Link>
          <a
            href={hub.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="micro underline-offset-8 hover:underline"
          >
            {t.articles.source} ↗
          </a>
          <p className="w-full text-body-sm text-dim">{t.articles.sourceNote}</p>
        </Reveal>
      </section>
    </>
  );
}
