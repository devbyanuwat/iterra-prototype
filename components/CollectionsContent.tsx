'use client';

// /collections — หน้ารวมคอลเลกชัน สร้างจากการ์ดจริงบนหน้า /Collections ของต้นทาง
//
// ── เรื่องที่ต้องไม่กลบ ────────────────────────────────────────────────────
// ต้นทางมีการ์ด 16 ใบ และทุกใบลิงก์ไปหน้าตระกูลสินค้าของตัวเอง — ซึ่งตอบ 404
// ทั้ง 14 หน้า (ยืนยันด้วยเบราว์เซอร์จริง ไม่ใช่แค่ curl โดนบล็อก) ทางเลือกที่
// ไม่ซื่อสองทางคือ (ก) สร้างหน้าตระกูลปลอมขึ้นมาเอง (ข) ตัดการ์ดที่ลิงก์ตายทิ้ง
// ทั้งสองทางทำให้ "100% ของเว็บต้นทาง" ที่ลูกค้าขอกลายเป็นเรื่องไม่จริง
//
// ที่ทำแทน: การ์ดทุกใบยังอยู่ครบพร้อมภาพและคำโปรยของมัน ใบไหนที่หน้าเดิมตายแล้ว
// ก็เขียนไว้เป็นประโยคปกติในการ์ดนั้น ไม่ใช่กล่อง error สีแดง และถ้าแคตตาล็อกของ
// เรามีของจากคอลเลกชันนั้นจริง การ์ดจะพาไปที่ของจริงแทน — ซึ่งมีประโยชน์กว่าลิงก์
// ที่ต้นทางพังไปแล้ว การจับคู่ใช้ค่า "คอลเลกชัน" ในสเปกสินค้า (7 ใน 16 ใบมีของ)

import Link from '@/components/Link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';
import type { CollectionCard, CollectionFamily } from '@/lib/collections.generated';

export type CollectionEntry = {
  card: CollectionCard;
  /** หน้าเดิมของต้นทาง ถ้ามีบันทึกไว้ — ทุกใบตอนนี้ status: 'gone' */
  family: CollectionFamily | null;
  /** สินค้าในแคตตาล็อกของเราที่อยู่คอลเลกชันนี้ */
  products: { slug: string; name: { th: string; en: string }; image: string }[];
};

const CARD_SLOT = 620;

function CardImage({ id, alt }: { id: string; alt: string }) {
  const image = lifestyleImages.find((i) => i.id === id);
  if (!image) return null;
  return (
    <div
      className="overflow-hidden border border-line-6 bg-surface"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
      <img
        src={lifestyleSrc(image, CARD_SLOT, 2)}
        alt={alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}

export default function CollectionsContent({ entries }: { entries: CollectionEntry[] }) {
  const { lang, t } = useLang();

  return (
    <>
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal className="max-w-4xl">
          <p className="mb-4 micro">{t.collections.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.collections.title}</h1>
          <p className="mt-6 max-w-2xl text-body text-dim">{t.collections.lead}</p>
          <p className="mt-3 micro">{t.collections.sub(entries.length)}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <ul className="grid gap-x-10 gap-y-20 md:grid-cols-2">
          {entries.map(({ card, family, products }, i) => {
            // ต้นทางแปะภาพเดิมซ้ำในการ์ดเดียวกันสองใบ (aleutian-02, zaa99845-rgb)
            // ปล่อยผ่านคือได้ภาพเดียวกันวางเรียงกันเองในตะแกรงล่าง และ React
            // ก็ได้ key ซ้ำจนเตือนว่าลูกอาจถูกซ้ำหรือหายไป — ตัดซ้ำที่นี่
            // ไม่ใช่ไปแก้ข้อมูล เพราะ collections.generated.ts ถูกเขียนทับทุกครั้ง
            // ที่ scrape ใหม่ ของที่แก้ลงไปจะหายเงียบ
            const images = [...new Set(card.images)];
            const lead = images[0];
            const rest = images.slice(1, 3);
            return (
              <li key={card.name}>
                <Reveal delay={(i % 2) * 0.1} y={26}>
                  <article className="group">
                    {lead ? <CardImage id={lead} alt={card.name} /> : null}
                    {rest.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {rest.map((id) => (
                          <CardImage key={id} id={id} alt={card.name} />
                        ))}
                      </div>
                    )}

                    <h2 className="mt-6 font-display text-card font-normal text-ink">{card.name}</h2>
                    <p className="mt-2 text-body-sm text-dim">{card.blurb[lang]}</p>

                    {products.length > 0 ? (
                      <>
                        <p className="mt-5 micro">{t.collections.inCatalogue(products.length)}</p>
                        <ul className="mt-3 flex flex-col gap-2">
                          {products.slice(0, 4).map((p) => (
                            <li key={p.slug}>
                              <Link
                                href={`/products/${p.slug}/`}
                                className="text-body-sm text-ink underline-offset-4 hover:underline"
                              >
                                {p.name[lang]}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-5 text-body-sm text-dim">{t.collections.noProducts}</p>
                    )}

                    {/* ลิงก์เดิมของต้นทางตายแล้ว — เขียนเป็นประโยคในการ์ด ไม่ใช่ปุ่มที่กดไปเจอ 404 */}
                    {family?.status === 'gone' && (
                      <p className="mt-5 border-t border-line-6 pt-4 text-body-sm text-dim">
                        {t.collections.noPage}
                        <span className="mt-1 block">
                          {t.collections.sourceLabel}:{' '}
                          <span className="break-all">kohler.co.th{family.path}</span>
                        </span>
                      </p>
                    )}
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mt-20 max-w-2xl border-t border-line-6 pt-8">
          <p className="text-body-sm leading-relaxed text-dim">{t.collections.noPageLong}</p>
        </Reveal>
      </section>
    </>
  );
}
