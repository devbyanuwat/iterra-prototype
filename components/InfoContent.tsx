'use client';

// หน้าข้อมูลและบริการ — ทั้งหน้าดัชนีและหน้ารายตัว
//
// ข้อมูลมาจาก lib/pages.generated.ts (harvest ของ task B1) เป็นเนื้อหาของ KOHLER
// ทั้งหมด ไม่ได้เรียบเรียงใหม่ — จุดยืนเดียวกับ lib/posts.ts
//
// เก้าหน้ามีรูปร่างไม่เหมือนกันเลย: careandclean เป็นหัวข้อ+ย่อหน้ายาว ๆ,
// literature เป็นไทล์ที่ลิงก์ไป PDF, press-releases เป็นรายการข่าว 40 ชิ้น,
// service-solution มีแต่ไทล์และไม่มีแม้แต่ชื่อหน้า, faq ว่างเปล่าจริง ๆ
// เรนเดอร์จึงเป็น "มีอะไรก็แสดงอันนั้น" ไม่ใช่เทมเพลตตายตัวที่ต้องเติมช่องว่าง

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import type { Lang } from '@/lib/i18n';
import { contentPages, getContentPage, type ContentPage } from '@/lib/pages.generated';
import { getTile, tileSrc } from '@/lib/tiles.generated';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';

type Pair = { th: string; en: string };
const say = (v: Pair, lang: Lang) => v[lang] || v.th || v.en;

/**
 * ภาพของหน้าเหล่านี้อยู่สองคลัง
 *
 * task B1 แยกไว้ตั้งใจ: 28 จาก 43 id เป็น "ไทล์" (ชิปสีผิวเคลือบ ภาพลายเส้นบอก
 * ขนาด ภาพสินค้าตัดพื้น) ซึ่งไม่ใช่ภาพถ่ายบรรยากาศ อีก 15 อยู่ในคลังภาพถ่ายเดิม
 * ตัวเรนเดอร์จึงต้องถามทั้งสองคลัง — ถามผิดคลังแล้วได้ null คือภาพหาย
 */
function picture(id: string, slot: number) {
  const tile = getTile(id);
  if (tile) {
    return { src: tileSrc(tile, slot, 2), width: tile.width, height: tile.height, alt: tile.alt };
  }
  const shot = lifestyleImages.find((image) => image.id === id);
  if (shot) {
    return { src: lifestyleSrc(shot, slot, 2), width: shot.width, height: shot.height, alt: shot.alt };
  }
  return null;
}

/** ชื่อหน้า — /kohler-service-solution ไม่มีทั้ง <h1> และหัวข้อใด ๆ ที่ต้นทาง */
function titleOf(page: ContentPage, lang: Lang, fallback: string) {
  return say(page.title, lang) || fallback;
}

const SOURCE_ORIGIN = 'https://www.kohler.co.th';

// ลำดับบนหน้าดัชนี: เรียงตามว่าคนน่าจะมาหาอะไร ไม่ใช่ตามตัวอักษรหรือลำดับที่ harvest มา
const INDEX_ORDER = [
  'careandclean',
  'warranty',
  'kohler-service-solution',
  'literature',
  'press-releases',
  'kec',
  'global-projects',
  'kohler-150-anniversary',
  'faq',
];
const ORDERED = INDEX_ORDER.map((slug) => getContentPage(slug)).filter(Boolean) as ContentPage[];

/** หน้าที่ตอบคำถามได้จริง ใช้บนหน้า faq ที่ต้นทางว่าง */
const ANSWER_PAGES = ['careandclean', 'warranty', 'kohler-service-solution']
  .map((slug) => getContentPage(slug))
  .filter(Boolean) as ContentPage[];

function Figure({ id, slot, className = '' }: { id: string; slot: number; className?: string }) {
  const { lang } = useLang();
  const image = picture(id, slot);
  if (!image) return null;
  return (
    <div
      className={`overflow-hidden border border-line-6 bg-surface ${className}`}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */}
      <img
        src={image.src}
        alt={say(image.alt, lang)}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

// ── หน้าดัชนี ───────────────────────────────────────────────────────────────

function Index() {
  const { lang, t } = useLang();
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.info.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.info.title}</h1>
          <p className="mt-6 max-w-xl text-body text-dim">{t.info.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 md:px-[8vw]">
        <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {ORDERED.map((page, i) => {
            const isStub = page.status === 'stub';
            const cover = page.images[0] ?? page.tiles.find((tile) => tile.image)?.image ?? null;
            const title = isStub ? t.info.faqShort : titleOf(page, lang, t.info.untitled);
            return (
              <Reveal key={page.slug} delay={(i % 3) * 0.1} y={26}>
                <li>
                  <Link href={`/info/${page.slug}/`} className="group block">
                    {cover ? (
                      <div className="overflow-hidden">
                        <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                          <Figure id={cover} slot={370} />
                        </div>
                      </div>
                    ) : (
                      // ไม่มีภาพก็ไม่ใส่กรอบเปล่า — กรอบเปล่าคือความว่างแบบที่ลูกค้าบ่นมาแล้ว
                      <div className="border-t border-line-12" />
                    )}
                    <p className="mt-5 micro">
                      {isStub ? t.info.stubBadge : page.path}
                    </p>
                    <h2 className="mt-2 text-card font-normal text-ink">{title}</h2>
                    <span className="mt-3 inline-block micro underline-offset-8 group-hover:underline">
                      {t.info.readPage} →
                    </span>
                  </Link>
                </li>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mt-16 border-t border-line-6 pt-8">
          <p className="text-body-sm text-dim">{t.info.sourceNote}</p>
        </Reveal>
      </section>
    </>
  );
}

// ── หน้าที่ต้นทางว่าง ───────────────────────────────────────────────────────
//
// /faq มีอยู่จริงทั้งสองภาษาและหัวข้อเดียวบนหน้าคือคำว่า "Empty"
//
// สามทางที่ชั่งแล้ว: (ก) ไม่สร้างเส้นทางนี้เลย (ข) สร้างแล้วเขียนว่า "ว่าง"
// (ค) สร้างแล้วทำให้มันพาไปที่ที่มีคำตอบจริง
//
// เลือก (ค) — (ก) คือเงียบ ๆ ตัดของที่ลูกค้าสั่งมาออกหนึ่งชิ้น ส่วน (ข) คือหน้า
// เปล่าซึ่งเป็นความว่างแบบเดียวกับที่ลูกค้าบ่นมาสามรอบ (ค) พูดความจริงว่าต้นทาง
// ว่าง แล้วส่งต่อไปหน้าที่มีคำตอบอยู่แล้วในเว็บนี้ — ไม่มีคำถามคำตอบชิ้นไหนที่
// เราแต่งขึ้นมาเอง เพราะการแต่ง FAQ แล้วใส่ชื่อแบรนด์เขาคือการพูดแทนแบรนด์
function Stub({ page }: { page: ContentPage }) {
  const { lang, t } = useLang();
  return (
    <article className="px-6 pb-28 pt-36 md:pt-44">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="mb-4 micro">{t.info.stubBadge}</p>
          <h1 className="font-display text-section font-normal text-ink">{t.info.stubTitle}</h1>
          <p className="mt-8 text-body leading-loose text-dim">{t.info.stubBody}</p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="text-card font-normal text-ink">{t.info.stubWhere}</h2>
          <ul className="mt-5 space-y-3">
            {ANSWER_PAGES.map((answer) => (
              <li key={answer.slug}>
                <Link
                  href={`/info/${answer.slug}/`}
                  className="text-body text-dim underline-offset-8 transition-colors hover:text-ink hover:underline"
                >
                  {titleOf(answer, lang, t.info.untitled)} →
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact/"
                className="text-body text-dim underline-offset-8 transition-colors hover:text-ink hover:underline"
              >
                {t.info.stubAsk} →
              </Link>
            </li>
          </ul>
        </Reveal>

        <Reveal>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line-6 pt-8">
            <Link href="/info/" className="micro underline-offset-8 hover:underline">
              ← {t.info.backToIndex}
            </Link>
            <a
              href={`${SOURCE_ORIGIN}${page.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="micro underline-offset-8 hover:underline"
            >
              {t.info.readOnSource} ↗
            </a>
          </div>
        </Reveal>
      </div>
    </article>
  );
}

// ── หน้ารายตัว ──────────────────────────────────────────────────────────────

function Single({ page }: { page: ContentPage }) {
  const { lang, t } = useLang();
  const title = titleOf(page, lang, t.info.untitled);
  const headings = page.headings;
  const paragraphs = page.paragraphs;
  const hero = page.images[0] ?? null;
  const rest = page.images.slice(1);

  return (
    <article className="pb-28 pt-36 md:pt-44">
      <div className="px-6 md:px-[8vw]">
        <Reveal className="max-w-3xl">
          <p className="mb-4 micro">{page.path}</p>
          <h1 className="font-display text-section font-normal text-ink">{title}</h1>
        </Reveal>
      </div>

      {hero && (
        <Reveal className="mx-auto mt-12 max-w-5xl px-6 md:px-0">
          <Figure id={hero} slot={1024} />
        </Reveal>
      )}

      {/* ── ย่อหน้ากับหัวข้อ ──────────────────────────────────────────────
          ต้นทางเก็บ headings กับ paragraphs เป็นสองรายการแยกกัน ไม่ได้บอกว่า
          ย่อหน้าไหนอยู่ใต้หัวข้อไหน จึงไม่เดาความสัมพันธ์: หัวข้อทั้งชุดเป็น
          สารบัญของหน้า แล้วเนื้อความไหลต่อกันไป — เดาผิดแล้วเอาย่อหน้าไปอยู่ใต้
          หัวข้อที่ไม่ใช่ของมันคือการแต่งโครงสร้างที่ต้นทางไม่ได้เขียนไว้ */}
      {headings.length > 1 && (
        <section className="px-6 pt-16 md:px-[8vw]">
          <Reveal className="max-w-3xl">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {/* ไม่ใช้ .micro ตรงนี้ — .micro คือป้ายกำกับสั้น ๆ และมี line-height 1.3
                  ซึ่งต่ำกว่าพื้นระยะบรรทัดไทย 1.6 แต่หัวข้อของ /careandclean เป็น
                  ประโยคไทยจริงที่ตัดบรรทัด วัดได้ว่ามันคือจุดที่คับที่สุดในเว็บ:
                  ระยะห่างระหว่างบรรทัด 0.00px ที่ 390 บนคู่ รุ|ห้ คือแตะกันพอดี
                  เลือก step ให้ถูกแทนที่จะแก้ line-height ของ .micro ทั้งเว็บ */}
              {headings.map((heading, i) => (
                <li key={i} className="text-body-sm uppercase tracking-widest2 text-dim">
                  {say(heading, lang)}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {paragraphs.length > 0 && (
        <div className="mx-auto mt-14 max-w-2xl px-6 md:px-0">
          {paragraphs.map((paragraph, i) => (
            <Reveal key={i} y={24}>
              <p className="mb-8 text-body leading-loose text-dim">{say(paragraph, lang)}</p>
            </Reveal>
          ))}
        </div>
      )}

      {/* ── ไทล์ — literature และ service solution เขียนเป็นการ์ด ไม่ใช่ย่อหน้า ── */}
      {page.tiles.length > 0 && (
        <section className="mt-4 px-6 md:px-[8vw]">
          <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {page.tiles.map((tile, i) => {
              const body = (
                <>
                  {tile.image && (
                    <div className="overflow-hidden">
                      <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                        <Figure id={tile.image} slot={370} />
                      </div>
                    </div>
                  )}
                  <h2 className="mt-5 text-card font-normal text-ink">{say(tile.heading, lang)}</h2>
                  {say(tile.blurb, lang) && (
                    <p className="mt-2 text-body-sm leading-relaxed text-dim">{say(tile.blurb, lang)}</p>
                  )}
                </>
              );
              return (
                <Reveal key={i} delay={(i % 3) * 0.1} y={26}>
                  <li>
                    {tile.href ? (
                      // ปลายทางของ /literature เป็นไฟล์ PDF บนเซิร์ฟเวอร์ของ KOHLER
                      // บอกไว้ก่อนกด ไม่ใช่ให้รู้ตอนไฟล์เริ่มดาวน์โหลด
                      <a
                        href={tile.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        {body}
                        <span className="mt-3 inline-block micro underline-offset-8 group-hover:underline">
                          {/\.pdf($|\?)/i.test(tile.href) ? t.info.downloadPdf : t.info.readOnSource} ↗
                        </span>
                      </a>
                    ) : (
                      <div>{body}</div>
                    )}
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── ข่าว — 40 ชิ้น เป็นรายการ ไม่ใช่กริดการ์ด ─────────────────────
          ต้นทางให้มาแค่วันที่ หัวข้อ และลิงก์ ไม่มีภาพและไม่มีเนื้อข่าว
          การ์ดสี่สิบใบที่ในนั้นมีแต่ตัวหนังสือคือกริดของกล่องเปล่า */}
      {page.press.length > 0 && (
        <section className="mx-auto mt-6 max-w-3xl px-6 md:px-0">
          <Reveal className="mb-8 flex flex-wrap items-baseline gap-x-4">
            <h2 className="font-display text-card font-normal text-ink">{t.info.pressTitle}</h2>
            <span className="micro">{t.info.pressCount(page.press.length)}</span>
          </Reveal>
          <ul>
            {page.press.map((item, i) => (
              <Reveal key={item.href + i} y={18}>
                <li className="border-t border-line-12 py-5">
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="group block">
                    <p className="micro">{say(item.date, lang)}</p>
                    <p className="mt-1.5 text-body text-ink underline-offset-8 group-hover:underline">
                      {say(item.headline, lang)} ↗
                    </p>
                  </a>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {/* ── ดาวน์โหลดที่ไม่ได้อยู่ในไทล์ (warranty มีไฟล์เดียว) ─────────── */}
      {page.downloads.length > 0 && page.tiles.length === 0 && (
        <section className="mx-auto mt-6 max-w-2xl px-6 md:px-0">
          <Reveal>
            <h2 className="text-card font-normal text-ink">{t.info.downloads}</h2>
            <ul className="mt-5 space-y-3">
              {page.downloads.map((download, i) => (
                <li key={i}>
                  <a
                    href={download.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body text-dim underline-offset-8 transition-colors hover:text-ink hover:underline"
                  >
                    {say(download.label, lang)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {/* ── ภาพที่เหลือของหน้า ─────────────────────────────────────────── */}
      {rest.length > 0 && (
        <section className="mt-16 px-6 md:px-[8vw]">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((id, i) => (
              <Reveal key={id} delay={(i % 3) * 0.08} y={22}>
                <li>
                  <Figure id={id} slot={370} />
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <div className="mx-auto mt-16 max-w-2xl px-6 md:px-0">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-6 pt-8">
            <Link href="/info/" className="micro underline-offset-8 hover:underline">
              ← {t.info.backToIndex}
            </Link>
            <a
              href={`${SOURCE_ORIGIN}${page.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="micro underline-offset-8 hover:underline"
            >
              {t.info.readOnSource} ↗
            </a>
          </div>
        </Reveal>
      </div>
    </article>
  );
}

export default function InfoContent({ slug }: { slug?: string }) {
  if (!slug) return <Index />;
  const page = getContentPage(slug);
  if (!page) return null;
  return page.status === 'stub' ? <Stub page={page} /> : <Single page={page} />;
}
