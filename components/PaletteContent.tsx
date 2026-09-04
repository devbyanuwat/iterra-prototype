'use client';

// /palette และ /palette/[slug] — จานสีและผิวเคลือบที่เก็บมาจาก /colorpalette
//
// ทำไมหน้านี้ผูกกับ /finish/[code] ให้เห็นชัด ๆ:
// ทั้งเว็บนี้นำทางด้วย "เฉด" และชื่อเฉดทั้งสิบเอ็ดมาจากจานสีชุดนี้ หน้าอ้างอิงกับ
// หน้าเฉดจึงพูดถึงของสิ่งเดียวกันคนละด้าน — ด้านหนึ่งคือ "สีนี้คืออะไร"
// อีกด้านคือ "เรามีอะไรในสีนี้บ้าง" แถบล่างของทุกหน้าจึงเป็นสิบเอ็ดเฉดที่สต็อกจริง
// พร้อมจำนวนจาก finishIndex และลิงก์เข้า /finish/[code] ส่วนแผงสีใบไหนที่ตรงกับ
// เฉดที่เราสต็อก ก็มีลิงก์ของตัวเองในการ์ดนั้นเลย
//
// การจับคู่ "แผงสีอ้างอิง ↔ เฉดที่สต็อก" ใช้รหัสก่อน แล้วค่อยใช้ชื่ออังกฤษ
// เพราะรหัสของจานสีกับรหัสในแคตตาล็อกไม่ใช่ชุดเดียวกันเสมอ — Vibrant® Brushed
// Bronze เป็น 2BZ ในจานสีแต่เป็น BV ในแคตตาล็อก ถ้าจับด้วยรหัสอย่างเดียวจะพลาด
// คู่ที่เป็นสีเดียวกันจริง ๆ ส่วนสีที่ไม่มีในแคตตาล็อกจะไม่ถูกทำให้เป็นลิงก์
// (59 แผง จับคู่ได้ 16 — ที่เหลือคือจานสีระดับโลกของ KOHLER ที่เราไม่ได้สต็อก)

import Link from '@/components/Link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { finishIndex } from './finish-index';
import { getTile, tileSrc } from '@/lib/tiles.generated';
import type { PaletteGroup } from '@/lib/editorial';

const SWATCH_SLOT = 320;
const CHILD_SLOT = 420;

/** ชื่ออังกฤษของเฉดที่สต็อก → รหัสในแคตตาล็อก (ใช้เป็นทางสำรองเมื่อรหัสไม่ตรง) */
const stockedByName = new Map(
  finishIndex.map((f) => [f.name.en.toLowerCase().replace(/[®™]/g, '').replace(/\s+/g, ' ').trim(), f.code]),
);
const stockedByCode = new Map(finishIndex.map((f) => [f.code, f]));

function stockedFor(code: string, titleEn: string) {
  const direct = stockedByCode.get(code);
  if (direct) return direct;
  const byName = stockedByName.get(titleEn.toLowerCase().replace(/[®™]/g, '').replace(/\s+/g, ' ').trim());
  return byName ? stockedByCode.get(byName) : undefined;
}

/**
 * ภาพหัวการ์ดของหน้าดัชนี — กรอบ 4/3 เท่ากันทุกใบ
 *
 * ต่างจาก Swatch ที่ยึดสัดส่วนจริงของชิปสี: ภาพหัวการ์ดของเจ็ดหมวดมาจากคนละแหล่ง
 * และสัดส่วนไม่เท่ากันเลย (มีทั้ง 4:3, 2:1 และแนวตั้ง) กริดจึงดูเป็นของหลุด ๆ
 * ถ้าปล่อยตามไฟล์ ครอปด้วย object-cover ในกรอบเดียวกันแทน และยังไม่ให้ยืดเกิน
 * ขนาดไฟล์จริงอยู่ดี
 */
function CardImage({ id, alt }: { id: string | null; alt: string }) {
  const tile = id ? getTile(id) : undefined;
  if (!tile) return null;
  return (
    <div
      className="aspect-[4/3] w-full overflow-hidden border border-line-6 bg-surface"
      style={{ maxWidth: tile.maxWidth }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
      <img
        src={tileSrc(tile, CHILD_SLOT, 2)}
        alt={alt}
        width={tile.width}
        height={tile.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}

function Swatch({ id, alt, slot }: { id: string | null; alt: string; slot: number }) {
  const tile = id ? getTile(id) : undefined;
  if (!tile) {
    // ไม่มีไฟล์จริง = ไม่วาดกรอบเปล่า ปล่อยให้การ์ดเป็นข้อความล้วนไปเลย
    return null;
  }
  return (
    // maxWidth = ความกว้างจริงของไฟล์: ชิปสีของต้นทางบางใบกว้างแค่ ~200px
    // ถ้าปล่อยให้ยืดเต็มการ์ด 380px มันจะถูกขยาย ซึ่งวัดได้ 13 ใบในหน้าเดียว
    // กล่องจึงหยุดที่ขนาดไฟล์ แล้วปล่อยที่ว่างรอบ ๆ แทนการยืดภาพ
    <div
      className="overflow-hidden border border-line-6 bg-surface"
      style={{ aspectRatio: `${tile.width} / ${tile.height}`, maxWidth: tile.maxWidth }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
      <img
        src={tileSrc(tile, slot, 2)}
        alt={alt}
        width={tile.width}
        height={tile.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/** แถบปิดท้ายทุกหน้า: สิบเอ็ดเฉดที่สต็อกจริง พาไป /finish/[code] */
function StockedFinishes() {
  const { lang, t } = useLang();
  return (
    <section data-dark-beat className="px-6 py-24 md:px-[8vw] md:py-28">
      <Reveal className="mb-12 max-w-3xl">
        <h2 className="font-display text-section font-normal">{t.palette.stockedTitle}</h2>
        <p className="mt-4 text-body text-dim">{t.palette.stockedSub}</p>
      </Reveal>
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {finishIndex.map((f) => (
          <li key={f.code}>
            <Link href={`/finish/${encodeURIComponent(f.code)}/`} className="focus-inset group block">
              <div className="overflow-hidden border border-line-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์วัสดุ local */}
                <img
                  src={f.material}
                  alt={f.name[lang]}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-body-sm">{f.name[lang]}</p>
              <p className="text-body-sm text-dim">{t.finish.pieces(f.count)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PaletteIndex({ groups }: { groups: PaletteGroup[] }) {
  const { lang, t } = useLang();
  const index = groups.find((g) => g.slug === 'index');
  const children = groups.filter((g) => g.slug !== 'index');
  const totalFinishes = children.reduce((n, g) => n + g.finishes.length, 0);

  return (
    <>
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal className="max-w-4xl">
          <p className="mb-4 micro">{t.palette.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.palette.title}</h1>
          <p className="mt-6 max-w-2xl text-body text-dim">
            {t.palette.sub(children.length, totalFinishes)}
          </p>
          <p className="mt-3 max-w-2xl text-body-sm text-dim">{t.palette.sourceNote}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 md:px-[8vw] md:pb-28" aria-label={t.palette.groupsLabel}>
        <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((group, i) => {
            // การ์ดของหน้าดัชนีต้นทางถือภาพและคำโปรยไว้ จับคู่กับหน้าลูกด้วยชื่อไฟล์
            // ในลิงก์เดิม (bathroom-colors.html → bathroom-colors)
            const card = index?.children.find((c) => c.href.includes(`${group.slug}.html`));
            return (
              <li key={group.slug}>
                <Reveal delay={(i % 3) * 0.08} y={24}>
                  <Link href={`/palette/${group.slug}/`} className="group block">
                    <CardImage
                      id={card?.image ?? group.finishes.find((f) => f.image)?.image ?? null}
                      alt={card?.heading[lang] ?? group.title[lang]}
                    />
                    <h2 className="mt-5 font-display text-card font-normal text-ink">
                      {card?.heading[lang] || group.title[lang]}
                    </h2>
                    {card?.blurb[lang] ? (
                      <p className="mt-2 text-body-sm text-dim">{card.blurb[lang]}</p>
                    ) : null}
                    <p className="mt-2 micro">{t.palette.finishesIn(group.finishes.length)}</p>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </section>

      <StockedFinishes />
    </>
  );
}

export function PaletteGroupContent({ group }: { group: PaletteGroup }) {
  const { lang, t } = useLang();

  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <Reveal className="max-w-4xl">
          <p className="mb-4 micro">{t.palette.kicker}</p>
          <h1 className="font-display text-section font-normal text-ink">{group.title[lang]}</h1>
          <p className="mt-5 text-body text-dim">{t.palette.finishesIn(group.finishes.length)}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 md:px-[8vw] md:pb-28">
        <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {group.finishes.map((finish, i) => {
            const stocked = stockedFor(finish.code, finish.title.en);
            return (
              <li key={`${finish.code}-${finish.title.en}-${i}`}>
                <Reveal delay={(i % 3) * 0.06} y={20}>
                  <Swatch id={finish.image} alt={finish.title[lang]} slot={SWATCH_SLOT} />
                  <h2 className="mt-5 font-display text-card font-normal text-ink">
                    {finish.title[lang]}
                  </h2>
                  {finish.description[lang] ? (
                    <p className="mt-3 text-body-sm leading-relaxed text-dim">
                      {finish.description[lang]}
                    </p>
                  ) : null}
                  {stocked ? (
                    <Link
                      href={`/finish/${encodeURIComponent(stocked.code)}/`}
                      className="mt-4 inline-block underline-offset-8 hover:underline"
                    >
                      <span className="micro !text-ink">
                        {t.palette.seeFinish} · {t.palette.inStock(stocked.count)} →
                      </span>
                    </Link>
                  ) : (
                    // ไม่ทำเป็นลิงก์ตายและไม่เงียบ — บอกไปตรง ๆ ว่าเป็นสีอ้างอิง
                    <p className="mt-4 micro">{t.palette.notStocked}</p>
                  )}
                </Reveal>
              </li>
            );
          })}
        </ul>

        <Reveal className="mt-16">
          <Link href="/palette/" className="micro underline-offset-8 hover:underline">
            ← {t.palette.backToIndex}
          </Link>
        </Reveal>
      </section>

      <StockedFinishes />
    </>
  );
}
