'use client';

// คู่มือเลือกซื้อหนึ่งชุด (task C1)
//
// ── ช่องว่างภาษาอังกฤษต้องเห็นได้ ไม่ใช่เงียบ ──────────────────────────────
// หน้าไทยกับหน้าอังกฤษของ kohler.co.th ไม่ใช่คำแปลของกันและกัน 113 จาก 153 บล็อก
// เท่านั้นที่มีอังกฤษจริง ที่เหลือข้อมูลตกค่า en กลับเป็นข้อความไทยและติดธง
// `enAvailable: false` มาให้ (ดู scratchpad/task-b1.md §English)
//
// ถ้าปล่อยให้ตกกลับเงียบ ๆ หน้าอังกฤษจะมีย่อหน้าไทยแทรกอยู่โดยไม่มีอะไรอธิบาย
// ที่นี่จึงทำสามอย่างพร้อมกัน เฉพาะตอนอ่านเป็นภาษาอังกฤษ:
//   1. แถบสรุปบนหัวหน้า บอกจำนวนบล็อกที่ไม่มีอังกฤษ
//   2. ป้าย "Thai only" ติดกับบล็อกนั้นเอง ไม่ใช่รวมไว้ท้ายหน้า
//   3. `lang="th"` บน element นั้น — โปรแกรมอ่านหน้าจอจะได้ออกเสียงไทยด้วยเสียงไทย
//      ไม่ใช่ไล่อ่านอักษรไทยด้วยเสียงอังกฤษ (ท่าเดียวกับที่ resolve() ใน
//      lib/i18n.ts อธิบายไว้ แต่ที่นี่ธงมากับข้อมูล จึงไม่ต้องเดาจากค่าว่าง)
//
// ไม่มีบล็อกไหนถูกซ่อน: หน้าอังกฤษที่หายไปครึ่งหน้าอ่านว่า "เว็บพัง" ส่วนหน้าที่
// บอกว่า "ตรงนี้ต้นทางไม่มีอังกฤษ" อ่านว่าเว็บรู้ตัว

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { useLang } from '@/components/LangProvider';
import type { GuidePicture } from './media';
import type { Coverage } from './coverage';

export type OptionView = {
  label: { th: string; en: string };
  enAvailable: boolean;
  picture: GuidePicture | null;
};

export type SectionView = {
  title: { th: string; en: string };
  enAvailable: boolean;
  options: OptionView[];
};

export type GuideView = {
  slug: string;
  /** URL ของคู่มือต้นฉบับบน kohler.co.th */
  sourceUrl: string;
  sections: SectionView[];
  coverage: Coverage;
  cat?: 'kitchen' | 'bath';
};

/** ช่องของตัวเลือกที่ 1440 (กริดหกคอลัมน์) — ไทล์ต้นทางกว้าง 400px จริง */
const TILE_SLOT = 200;

export default function GuideContent({ guide }: { guide: GuideView }) {
  const { lang, t } = useLang();
  const name = t.guideNames[guide.slug] ?? guide.slug;
  // ธงทั้งหมดในข้อมูลพูดถึง "ฉบับอังกฤษของต้นทาง" เท่านั้น ฉบับไทยมีครบเสมอ
  const flagging = lang === 'en';
  const totals = {
    sections: guide.sections.length,
    options: guide.sections.reduce((n, s) => n + s.options.length, 0),
  };

  /** ป้ายเล็ก ๆ ที่ติดกับบล็อกที่ต้นทางไม่มีฉบับอังกฤษ */
  const ThaiOnly = () => (
    <span className="ml-3 inline-block whitespace-nowrap border border-line-12 px-2 py-0.5 align-middle text-label uppercase tracking-widest2 text-dim">
      {t.guides.thaiOnly}
    </span>
  );

  return (
    <article className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal className="max-w-3xl">
        <Link href="/guides/" className="mb-4 inline-block micro underline-offset-8 hover:underline">
          ← {t.guides.title}
        </Link>
        <h1 className="font-display text-section font-normal text-ink">{name}</h1>
        <p className="mt-4 micro">
          {t.guides.sections(totals.sections)} · {t.guides.options(totals.options)}
        </p>

        {/* แถบสรุปช่องว่างภาษา — ประกาศก่อนอ่าน ไม่ใช่ให้ไปสะดุดเอาเอง */}
        {flagging && (
          <p
            className={`mt-6 border-l-2 py-1 pl-4 text-body-sm ${
              guide.coverage.missing > 0 ? 'border-accent text-ink' : 'border-line-12 text-dim'
            }`}
          >
            {guide.coverage.missing > 0
              ? t.guides.gapNote(guide.coverage.missing, guide.coverage.total)
              : t.guides.fullEn}
          </p>
        )}
      </Reveal>

      {guide.sections.map((section, si) => {
        const sectionThai = flagging && !section.enAvailable;
        return (
          <section key={`${section.title.th}-${si}`} className="mt-16">
            <Reveal>
              <h2
                className="text-card font-normal text-ink"
                // ข้อความไทยในเอกสารที่ประกาศ lang="en" ต้องประกาศตัวเองที่ element
                lang={sectionThai ? 'th' : undefined}
              >
                {sectionThai ? section.title.th : section.title[lang]}
                {sectionThai && <ThaiOnly />}
              </h2>
            </Reveal>

            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {section.options.map((option, oi) => {
                const optionThai = flagging && !option.enAvailable;
                return (
                  <li key={`${option.label.th}-${oi}`}>
                    <Reveal delay={(oi % 6) * 0.05} y={20}>
                      <div className="overflow-hidden border border-line-6 bg-surface">
                        <div style={{ aspectRatio: '4 / 3' }}>
                          {option.picture && (
                            /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */
                            <img
                              src={option.picture.src}
                              srcSet={option.picture.srcSet}
                              sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${TILE_SLOT}px`}
                              alt=""
                              width={option.picture.width}
                              height={option.picture.height}
                              className="h-full w-full object-cover"
                              loading={si === 0 && oi < 6 ? 'eager' : 'lazy'}
                              decoding="async"
                            />
                          )}
                        </div>
                      </div>
                      <p
                        className="mt-3 text-body-sm text-ink"
                        lang={optionThai ? 'th' : undefined}
                      >
                        {optionThai ? option.label.th : option.label[lang]}
                      </p>
                      {optionThai && (
                        <p className="mt-1">
                          <span className="inline-block border border-line-12 px-2 py-0.5 text-label uppercase tracking-widest2 text-dim">
                            {t.guides.thaiOnly}
                          </span>
                        </p>
                      )}
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <Reveal className="mt-20 border-t border-line-6 pt-8">
        <p className="max-w-2xl text-body-sm text-dim">{t.guides.referenceNote}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
          {/* ปิดหน้าด้วยทางเข้าแคตตาล็อกของเราเอง ไม่ใช่ทางตัน — ตัวเลือกข้างบน
              เป็นภาพจากคู่มือต้นทาง ของที่กดซื้อได้จริงอยู่ที่ /products */}
          <Link
            href={guide.cat ? `/products/?cat=${guide.cat}` : '/products/'}
            className="border border-line-12 px-8 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">{t.guides.browse} →</span>
          </Link>
          <a
            href={guide.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="micro underline-offset-8 hover:underline"
          >
            {t.articles.source} ↗
          </a>
        </div>
      </Reveal>
    </article>
  );
}
