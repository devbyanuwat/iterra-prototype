'use client';

// หน้าแรกใต้กำแพงผิวเคลือบ (สเปก 2026-09-01 §3.3)
//
// กำแพงยังเป็นจอแรกและยังเป็นตัวนำทางหลัก — ทุกอย่างในไฟล์นี้อยู่ "ใต้" มัน
// ลำดับตาม §3.3 ข้อ 2–6:
//   2. ชิ้นเด่นจากเฉดที่มีของเยอะสุด
//   3. เลือกตามห้อง ครัว/ห้องน้ำ พร้อมจำนวนจริง
//   4. เรื่องของเรา + ตัวเลข   (ดึงกลับจากของเดิม: PinnedStory + Stats)
//   5. บทความ 3 ชิ้น            (ดึงกลับจากของเดิม: LatestPosts)
//   6. โชว์รูม/ติดต่อ
//
// ปัญหาที่ทำให้ต้องรื้อ: หน้าแรกเดิมมีจอเดียวและ 11 รูป ลูกค้าอ่านว่า "ว่าง"
// เกณฑ์ที่ต้องผ่านคือ ≥ 3.5 จอ · ≥ 30 รูป · ≥ 6 heading (AC ข้อ 2)
// รูปทั้งหมดที่นี่เป็นของจริงจาก scraper หรือไฟล์วัสดุต่อเฉด ไม่มีกรอบเปล่า
// เพราะกรอบเปล่านับเป็นความว่างเปล่าแบบเดียวกับที่ลูกค้าบ่น
//
// Hero กับ HorizontalGallery ของหน้าแรกเดิมไม่ได้ถูกเรียกจากที่นี่แล้ว:
// hero ถูกกำแพงแทนที่ไปตั้งแต่ 9bc26e7 และ §3.3 สั่งกริด ไม่ใช่แถบเลื่อนแนวนอน

import Link from 'next/link';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import PinnedStory from '@/components/PinnedStory';
import ParallaxImage from '@/components/ParallaxImage';
import { useLang } from '@/components/LangProvider';
import { contrastRatio, finishIndex, finishOf } from '@/components/finish-index';
import { products, type Finish, type Product } from '@/lib/products';
import { posts } from '@/lib/posts';
import { CONTACT } from '@/lib/site';

// ── ที่มาของข้อมูลทุกบล็อก คำนวณครั้งเดียวตอนโหลดโมดูล ───────────────────
//
// ทั้งหมดเป็นฟังก์ชันบริสุทธิ์บนข้อมูลคงที่ ไม่มีอะไรขึ้นกับภาษาหรือ state
// จึงไม่มีเหตุผลให้คิดใหม่ทุกครั้งที่ผู้ใช้กดสลับ TH/EN

/** สามเฉดที่มีของเยอะสุด — finishIndex เรียง count มาก→น้อยมาแล้ว */
const TOP_FINISHES = finishIndex.slice(0, 3);

const FEATURED_COUNT = 8;

type FeaturedPick = { product: Product; finish: Finish; finishName: { th: string; en: string } };

/**
 * ชิ้นเด่น 8 ชิ้นจากสามเฉดที่มีของเยอะสุด
 *
 * เก็บแบบสลับเฉดไปเรื่อย ๆ ไม่ใช่ตักจากเฉดแรกจนครบ — ถ้าตักเรียง ทั้งแถวจะเป็น
 * โครม (CP มี 74 ชิ้น เยอะพอจะกินทั้งกริดคนเดียว) แล้วบล็อกนี้ก็ไม่ได้พูดเรื่อง
 * "เลือกตามผิวเคลือบ" อีกต่อไป
 *
 * `finishOf` ไม่ใช่ `finishes[0]`: การ์ดต้องโชว์สินค้าในเฉดที่มันถูกเลือกมา
 * ตรวจได้ที่ `img src` เหมือน AC ของหน้าเฉด
 */
const FEATURED: FeaturedPick[] = (() => {
  const out: FeaturedPick[] = [];
  const seen = new Set<string>();
  const queues = TOP_FINISHES.map((entry) => ({
    entry,
    // featured ก่อน แล้วค่อยตามลำดับแคตตาล็อก — sort เสถียรใน V8 ลำดับที่เหลือคงเดิม
    list: [...entry.products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured)),
    i: 0,
  }));

  while (out.length < FEATURED_COUNT) {
    let progressed = false;
    for (const q of queues) {
      if (out.length >= FEATURED_COUNT) break;
      while (q.i < q.list.length && seen.has(q.list[q.i].slug)) q.i++;
      if (q.i >= q.list.length) continue;
      const product = q.list[q.i++];
      const finish = finishOf(product, q.entry.code);
      // เข้าไม่ได้ในทางปฏิบัติ — entry.products มาจากเฉดนี้อยู่แล้ว
      if (!finish) continue;
      seen.add(product.slug);
      out.push({ product, finish, finishName: q.entry.name });
      progressed = true;
    }
    // ของหมดก่อนครบ 8 — กัน while วนไม่รู้จบถ้าแคตตาล็อกหดลง
    if (!progressed) break;
  }
  return out;
})();

// ไม่มีตัวรวมจำนวนสามเฉด — สินค้าชิ้นเดียวอยู่ได้หลายเฉด ผลบวกจึงนับซ้ำ
// ป้ายกำกับจึงบอกจำนวนแยกรายเฉดแทน ดู topFinishSub ใน lib/i18n.ts

/** ครัว/ห้องน้ำ พร้อมภาพนำ 1 + ภาพย่อย 3 จากสินค้าจริงในหมวดนั้น */
function room(category: 'kitchen' | 'bath') {
  const list = products.filter((p) => p.category === category);
  const withImage = list.filter((p) => p.finishes[0]?.image);
  return { count: list.length, lead: withImage[0], thumbs: withImage.slice(1, 4) };
}

const ROOMS = { kitchen: room('kitchen'), bath: room('bath') };

/**
 * ปกบทความ = ไฟล์ "ผิววัสดุ" ต่อเฉด ไม่ใช่ภาพสินค้า
 *
 * โพสต์ยังไม่มีภาพปกจริง (posts[].cover เป็นแค่ป้ายชื่อ) เอาภาพสินค้ามาใส่จะอ่าน
 * เป็น "บทความเกี่ยวกับสินค้าชิ้นนี้" ซึ่งไม่จริง — พื้นผิวเป็นของกลาง พูดภาษา
 * เดียวกับกำแพงหน้าแรก และยังเป็นรูปจริงไม่ใช่กรอบเปล่า
 *
 * เลือกจาก "เฉดที่ต่างจากพื้นมากที่สุด" ไม่ใช่สามตัวแรกของ finishIndex — สามตัวแรก
 * เรียงตามจำนวนของ ซึ่งได้ CP กับ `0` มาก่อน ทั้งคู่เป็นวัสดุเกือบขาว พอครอปลง
 * กรอบ 16:9 บนพื้นสว่างแล้วอ่านเป็นสี่เหลี่ยมว่าง ๆ (เห็นชัดในภาพตรวจรอบแรก)
 * ซึ่งเป็นความว่างเปล่าแบบเดียวกับที่ลูกค้าบ่นตั้งแต่แรก
 */
const COVER_FINISHES = [...finishIndex].sort(
  (a, b) => contrastRatio(b.accent, '#E5E5E5') - contrastRatio(a.accent, '#E5E5E5'),
);

const LATEST = posts.slice(0, 3).map((post, i) => ({
  post,
  cover: COVER_FINISHES[i % COVER_FINISHES.length],
}));

/** ภาพเรื่องราวสามสไลด์ — หยิบจากชิ้นเด่นที่เลือกไว้แล้ว ไม่ต้องมีชุดภาพแยก */
const STORY_IMAGES = FEATURED.slice(0, 3).map((f) => f.finish.image);

// ── บล็อกต่าง ๆ ───────────────────────────────────────────────────────────

/** §3.3 ข้อ 2 — ชิ้นเด่นจากเฉดที่มีของเยอะสุด */
function TopFinishGrid() {
  const { lang, t } = useLang();
  const names = TOP_FINISHES.map((f) => `${f.name[lang]} ${f.count}`).join(' · ');

  return (
    <section className="bg-base px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="micro mb-3">{t.home.topFinishKicker}</p>
        <h2 className="font-display text-section font-normal text-ink">{t.home.topFinishTitle}</h2>
        <p className="mt-4 text-body text-dim">{t.home.topFinishSub(names)}</p>
      </Reveal>

      <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map(({ product, finish, finishName }, i) => (
          <li key={`${product.slug}-${finish.code}`}>
            <Reveal delay={(i % 4) * 0.08} y={24}>
              <Link href={`/products/${product.slug}/`} className="group block">
                <div className="overflow-hidden border border-line-6 bg-surface">
                  <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
                    <img
                      src={finish.image}
                      srcSet={
                        finish.image700 !== finish.image
                          ? `${finish.image700} 700w, ${finish.image} 1400w`
                          : undefined
                      }
                      sizes={
                        finish.image700 !== finish.image
                          ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                          : undefined
                      }
                      alt={product.name[lang]}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/5] w-full object-contain"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="micro">{t.common.category[product.category]}</p>
                    <h3 className="mt-1.5 text-body font-normal text-ink">{product.name[lang]}</h3>
                  </div>
                  {/* จุดสีคือเฉดที่การ์ดนี้เรนเดอร์อยู่จริง ชื่อกำกับอยู่ข้างล่างเสมอ
                      ไม่ปล่อยให้สีเป็นข้อมูลชิ้นเดียว */}
                  <span
                    aria-hidden
                    className="mt-1 block h-4 w-4 shrink-0 rounded-full ring-1 ring-line-12"
                    style={{ background: finish.accent }}
                  />
                </div>
                <p className="mt-1 text-body-sm text-dim">
                  {t.common.finish} {finishName[lang]}
                </p>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal className="mt-14">
        <Link
          href="/products/"
          className="inline-block border border-line-12 px-9 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          <span className="micro !text-current">{t.common.viewAll} →</span>
        </Link>
      </Reveal>
    </section>
  );
}

/** §3.3 ข้อ 3 — เลือกตามห้อง พร้อมจำนวนจริงจากแคตตาล็อก */
function RoomSplit() {
  const { lang, t } = useLang();
  const rooms = [
    {
      key: 'kitchen' as const,
      title: t.home.catKitchen,
      desc: t.home.catKitchenDesc,
      ...ROOMS.kitchen,
    },
    { key: 'bath' as const, title: t.home.catBath, desc: t.home.catBathDesc, ...ROOMS.bath },
  ];

  return (
    <section className="border-t border-line-6 bg-base px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="micro mb-3">CATEGORIES</p>
        <h2 className="font-display text-section font-normal text-ink">{t.home.catTitle}</h2>
        <p className="mt-4 text-body text-dim">{t.home.catSub}</p>
      </Reveal>

      <div className="grid gap-12 md:grid-cols-2">
        {rooms.map((r, i) => (
          <Reveal key={r.key} delay={i * 0.12}>
            <Link href={`/products/?cat=${r.key}`} className="group block">
              <ParallaxImage
                src={r.lead?.finishes[0]?.image}
                alt={r.lead ? r.lead.name[lang] : ''}
                ratio="3/2"
                speed={i % 2 ? 7 : -7}
                sizes="(max-width: 768px) 100vw, 45vw"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-card font-normal text-ink">{r.title}</h3>
                <span className="micro whitespace-nowrap transition-transform duration-300 group-hover:translate-x-1.5">
                  {t.home.catCount(r.count)} →
                </span>
              </div>
              <p className="mt-2 text-body-sm text-dim">{r.desc}</p>

              {/* ภาพย่อยสามใบ: ทำให้บล็อกนี้เป็น "หมวดที่มีของ" ไม่ใช่ป้ายหมวดเปล่า */}
              <div className="mt-5 grid grid-cols-3 gap-3" aria-hidden>
                {r.thumbs.map((p) => (
                  <div key={p.slug} className="overflow-hidden border border-line-6 bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
                    <img
                      src={p.finishes[0]?.image700 ?? p.finishes[0]?.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** §3.3 ข้อ 4 (ครึ่งหลัง) — แถวตัวเลข ดึงกลับจากหน้าแรกเดิม */
function Stats() {
  const { t } = useLang();
  return (
    <section className="border-y border-line-6 bg-base px-6 py-20 md:px-[8vw] md:py-24">
      <Reveal className="mb-12">
        <h2 className="font-display text-card font-normal text-ink">{t.home.statsTitle}</h2>
      </Reveal>
      <dl className="grid grid-cols-2 gap-10 md:grid-cols-4">
        {t.home.stats.map((s, i) => (
          // <dt> ต้องมาก่อน <dd> ใน DOM (axe: dlitem) เดิมสลับกันอยู่จึงตก
          // definition-list ทุกครั้งที่รัน Lighthouse — พลิกกลับด้วย
          // flex-col-reverse ตัวเลขจึงยังอยู่บนป้ายเหมือนเดิม
          // และ dt/dd ต้องเป็นลูกตรงของ div ที่เป็นลูกตรงของ <dl> — Reveal
          // เรนเดอร์ div ตัวนั้นเอง ไม่มี div ซ้อนคั่นอีกชั้น
          <Reveal
            key={s.label}
            delay={i * 0.1}
            y={20}
            className="flex flex-col-reverse text-center"
          >
            <dt className="micro mt-3">{s.label}</dt>
            {/* ตัวเลขใหญ่ 48–60px แต่ยังเป็นน้ำหนัก 400 ไม่ใช่ 200 — สเปก §3.2
                ยกเว้นน้ำหนักบางไว้ให้ตัวประดับล้วนอย่าง ModelNumber เท่านั้น */}
            <dd className="font-display text-5xl font-normal text-ink md:text-6xl">
              <CountUp to={s.value} suffix={s.suffix} />
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/** §3.3 ข้อ 5 — บทความ 3 ชิ้น ดึงกลับจากหน้าแรกเดิม */
function LatestPosts() {
  const { lang, t } = useLang();
  return (
    <section className="bg-base px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between gap-6">
        <div>
          <p className="micro mb-3">{t.home.articlesKicker}</p>
          <h2 className="font-display text-section font-normal text-ink">{t.home.articlesTitle}</h2>
        </div>
        <Link
          href="/articles/"
          className="micro hidden whitespace-nowrap underline-offset-8 hover:underline md:block"
        >
          {t.common.viewAll}
        </Link>
      </Reveal>

      <div className="grid gap-10 md:grid-cols-3">
        {LATEST.map(({ post, cover }, i) => (
          <Reveal key={post.slug} delay={i * 0.12}>
            <Link href={`/articles/${post.slug}/`} className="group block">
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                  <ParallaxImage
                    src={cover.material}
                    alt={cover.name[lang]}
                    ratio="16/9"
                    speed={i % 2 ? 5 : -5}
                    sizes="(max-width: 768px) 100vw, 30vw"
                  />
                </div>
              </div>
              <p className="micro mt-5">
                {post.tag} ·{' '}
                {new Date(post.date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <h3 className="mt-2 text-card font-normal text-ink">{post.title[lang]}</h3>
              <p className="mt-3 text-body-sm leading-relaxed text-dim">{post.excerpt[lang]}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** §3.3 ข้อ 6 — โชว์รูม/ติดต่อ ปิดท้ายด้วยจานสีทั้งสิบเอ็ดเฉด */
function ShowroomBlock() {
  const { lang, t } = useLang();
  return (
    <section className="border-t border-line-6 bg-base">
      {/* แถบวัสดุ: ไม่ใช่ลิงก์ ตั้งใจ — ตัวนำทางด้วยเฉดคือกำแพงด้านบน
          แถบนี้ทำหน้าที่ปิดวง ย้ำว่าทั้งสิบเอ็ดเฉดมีของจริง */}
      <div className="px-6 py-20 md:px-[8vw] md:py-24">
        <Reveal className="mb-10 max-w-2xl">
          <p className="micro mb-3">{t.home.paletteKicker}</p>
          <h2 className="font-display text-section font-normal text-ink">{t.home.paletteTitle}</h2>
          <p className="mt-4 text-body text-dim">{t.home.paletteSub}</p>
        </Reveal>
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {finishIndex.map((f) => (
            <li key={f.code}>
              <div className="overflow-hidden border border-line-6 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์วัสดุ local */}
                <img
                  src={f.material}
                  alt={f.name[lang]}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </div>
              <p className="mt-2 text-body-sm text-ink">{f.name[lang]}</p>
              <p className="text-body-sm text-dim">{t.finish.pieces(f.count)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-12 border-t border-line-6 px-6 py-24 md:grid-cols-2 md:px-[8vw] md:py-28">
        <Reveal>
          <p className="micro mb-3">{t.home.showroomKicker}</p>
          <h2 className="max-w-xl font-display text-section font-normal text-ink">
            {t.home.ctaTitle}
          </h2>
          <p className="mt-4 max-w-md text-body text-dim">{t.home.ctaSub}</p>
          <Link
            href="/contact/"
            className="mt-10 inline-block border border-line-12 px-10 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">{t.home.ctaBtn}</span>
          </Link>
        </Reveal>

        <Reveal delay={0.12}>
          <dl className="space-y-7">
            <div>
              <dt className="micro mb-2">{t.home.showroomAddressLabel}</dt>
              <dd className="max-w-xs text-body text-ink">
                {lang === 'th' ? CONTACT.address_th : CONTACT.address_en}
              </dd>
            </div>
            <div>
              <dt className="micro mb-2">{t.home.showroomHoursLabel}</dt>
              <dd className="text-body text-ink">{t.home.showroomHours}</dd>
            </div>
            <div>
              <dt className="micro mb-2">{t.home.showroomPhoneLabel}</dt>
              <dd className="text-body text-ink">
                <a href={`tel:${CONTACT.phone}`} className="underline-offset-4 hover:underline">
                  {CONTACT.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="micro mb-2">E-MAIL</dt>
              <dd className="text-body text-ink">
                <a href={`mailto:${CONTACT.email}`} className="underline-offset-4 hover:underline">
                  {CONTACT.email}
                </a>
              </dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

export default function HomeContent() {
  return (
    <>
      <TopFinishGrid />
      <RoomSplit />
      <PinnedStory images={STORY_IMAGES} />
      <Stats />
      <LatestPosts />
      <ShowroomBlock />
    </>
  );
}
