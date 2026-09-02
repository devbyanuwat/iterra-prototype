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

import Link from '@/components/Link';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import PinnedStory from '@/components/PinnedStory';
import ParallaxImage from '@/components/ParallaxImage';
import { useLang } from '@/components/LangProvider';
import Foreign from '@/components/Foreign';
import { postTitle } from '@/lib/i18n';
import { finishIndex, finishOf } from '@/components/finish-index';
import FieldEntry from './FieldEntry';
import { roomById } from './rooms';
import { lifestyleSrc } from '@/lib/lifestyle.generated';
import { products, type Finish, type Product } from '@/lib/products';
import type { FieldPlane } from '@/components/depth-field';
import { posts } from '@/lib/posts';
import { CONTACT } from '@/lib/site';

// ── ที่มาของข้อมูลทุกบล็อก คำนวณครั้งเดียวตอนโหลดโมดูล ───────────────────
//
// ทั้งหมดเป็นฟังก์ชันบริสุทธิ์บนข้อมูลคงที่ ไม่มีอะไรขึ้นกับภาษาหรือ state
// จึงไม่มีเหตุผลให้คิดใหม่ทุกครั้งที่ผู้ใช้กดสลับ TH/EN

type Props = {
  /** ตัวอย่างระนาบให้บล็อกทางเข้าสนาม — คำนวณฝั่ง server ใน app/page.tsx */
  fieldPlanes: FieldPlane[];
  /** จำนวนระนาบที่ /gallery มีจริง ใช้ในคำโปรยของบล็อกนั้น */
  galleryTotal: number;
};

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
 * ภาพห้องจริงของบล็อกหมวดหมู่ (task A2)
 *
 * เดิมช่องนี้เป็นภาพสินค้าตัดพื้นขาวของสินค้าชิ้นแรกในหมวด — บล็อกที่มีหน้าที่
 * บอกว่า "ครัว" กับ "ห้องน้ำ" จึงไม่มีทั้งครัวและห้องน้ำอยู่ในนั้นเลย ทั้งที่คลัง
 * มีภาพห้องอยู่ 88 ใบ เลือกด้วยตาไม่ใช่ด้วยแฮช เพราะสองใบนี้เป็นหน้าตาของหมวด
 */
const ROOM_PHOTO = {
  kitchen: roomById('zab91996-rgb'),
  bath: roomById('zab29178-rgb'),
  /** ฉากหลังของบล็อกปิดหน้า — โชว์รูม/ติดต่อ */
  showroom: roomById('zac06644-rgb'),
};

/**
 * ปกบทความบนหน้าแรก = ภาพห้องของบทความนั้นเอง (task A2)
 *
 * เดิมเป็น "ไฟล์ผิววัสดุต่อเฉด" เพราะตอนนั้นบทความยังไม่มีภาพปกจริง ตอนนี้มีแล้ว:
 * lib/posts.ts เก็บ coverId ของแต่ละบทความไว้ตั้งแต่ task M และหน้า /articles ก็ใช้
 * ภาพเดียวกันนี้อยู่ — หน้าแรกจึงไม่มีเหตุผลจะโชว์แผ่นวัสดุแบนราบเป็นปกอีกต่อไป
 */
const LATEST = posts.slice(0, 3).map((post) => ({
  post,
  cover: roomById(post.coverId),
}));

/**
 * ภาพเรื่องราวสามสไลด์ — ห้องจริง ไม่ใช่สินค้าตัดพื้นขาว (task A2)
 *
 * เดิมหยิบภาพสินค้าสามชิ้นแรกจากกริดชิ้นเด่นมาใช้ซ้ำ ผลคือบล็อกที่ถูกตรึงเต็มจอ
 * สามจอติดกันแสดง "ก๊อกหนึ่งชิ้นบนพื้นว่าง" ซึ่งเป็นความว่างเปล่าที่ลูกค้าบ่นมาตลอด
 * — PinnedStory ครอปภาพด้วย object-cover อยู่แล้ว ภาพห้องจึงเต็มกรอบพอดี
 * ทั้งสามใบเป็นคนละใบกับที่บล็อกหมวดหมู่และบล็อกปิดหน้าใช้ ไม่ให้ซ้ำกันในหน้าเดียว
 */
const STORY_IMAGES = [
  roomById('zac02157-rgb'),
  roomById('zab95042-rgb'),
  roomById('zac00286-rgb'),
].map((image) => lifestyleSrc(image, 900, 2));

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

/**
 * §3.3 ข้อ 3 — เลือกตามห้อง (task A2 + A4)
 *
 * A2: ภาพนำของแต่ละหมวดเป็นภาพห้องจริง ไม่ใช่ก๊อกตัดพื้นขาวอีกต่อไป
 * A4: บล็อกนี้เป็นตัวหักจังหวะตัวแรก — เต็มความกว้างจอ ไม่มี px-[8vw] ไม่มี
 *     kicker/หัวข้อ/คำโปรยนำหน้า และตัวอักษรวางทับภาพแทนที่จะอยู่ใต้ภาพ
 *     ที่เหลือของหน้ายังเป็นกริดบนพื้นสว่างตามเดิม
 */
function RoomSplit() {
  const { lang, t } = useLang();
  const rooms = [
    {
      key: 'kitchen' as const,
      title: t.home.catKitchen,
      desc: t.home.catKitchenDesc,
      photo: ROOM_PHOTO.kitchen,
      ...ROOMS.kitchen,
    },
    {
      key: 'bath' as const,
      title: t.home.catBath,
      desc: t.home.catBathDesc,
      photo: ROOM_PHOTO.bath,
      ...ROOMS.bath,
    },
  ];

  return (
    <section aria-label={t.home.catTitle} className="grid grid-cols-1 md:grid-cols-2">
      {rooms.map((r) => (
        <Link
          key={r.key}
          href={`/products/?cat=${r.key}`}
          className="group relative isolate block min-h-[62svh] overflow-clip bg-ink md:min-h-[78svh]"
        >
          {/* ภาพเต็มแผง: ช่องกว้างครึ่งจอ (720px ที่ 1440) จึงขอ rendition ที่คลุม
              ระดับ retina ได้ — คลังหยุดที่ 1800px ซึ่งคลุม 720×2 พอดี */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
          <img
            src={lifestyleSrc(r.photo, 720, 2)}
            alt={r.photo.alt[lang]}
            width={r.photo.width}
            height={r.photo.height}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          {/* ม่านไล่เฉด: ตัวอักษรอยู่บนภาพถ่าย จึงต้องมีชั้นที่รับประกัน contrast
              ไล่จากล่างขึ้นบน ภาพยังต้องอ่านออกว่าเป็นห้องอะไร */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(8,9,10,0.86) 0%, rgba(8,9,10,0.55) 42%, rgba(8,9,10,0.12) 78%, rgba(8,9,10,0.04) 100%)',
            }}
          />

          <div className="relative z-10 flex h-full min-h-[62svh] flex-col justify-end p-8 md:min-h-[78svh] md:p-12">
            <p className="micro !text-white/80">{t.home.catCount(r.count)}</p>
            {/* ใหญ่กว่าหัวข้อ 32px ของบล็อกอื่นอย่างตั้งใจ — นี่คือจังหวะที่ต่าง */}
            <h2 className="mt-3 font-display text-[clamp(40px,6vw,76px)] font-normal leading-thai text-white">
              {r.title}
            </h2>
            <p className="mt-4 max-w-sm text-body text-white/85">{r.desc}</p>
            <span className="micro mt-7 !text-white transition-transform duration-300 group-hover:translate-x-2">
              {t.common.viewAll} →
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}

/**
 * §3.3 ข้อ 4 (ครึ่งหลัง) — แถวตัวเลข (task A4: จังหวะมืดที่หนึ่ง)
 *
 * บล็อกเดียวในหน้าที่จัดกลาง และเป็นหนึ่งในสองบล็อกที่อยู่บนพื้นมืด ตัวเลขใหญ่กว่า
 * หัวข้อของบล็อกอื่นเท่าตัว ทำหน้าที่เป็นเครื่องหมายวรรคตอนคั่นครึ่งหน้า ไม่ใช่
 * อีกหนึ่งกริดต่อจากกริดก่อนหน้า — พื้นมืดใช้ค่าชุดเดียวกับ depth field
 * (ดู [data-dark-beat] ใน app/globals.css)
 */
function Stats() {
  const { t } = useLang();
  return (
    <section data-dark-beat className="px-6 py-24 text-center md:px-[8vw] md:py-32">
      <Reveal className="mb-16">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(30px,3.4vw,46px)] font-normal leading-thai">
          {t.home.statsTitle}
        </h2>
      </Reveal>
      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-y-14 md:grid-cols-4">
        {t.home.stats.map((s, i) => (
          // <dt> ต้องมาก่อน <dd> ใน DOM (axe: dlitem) เดิมสลับกันอยู่จึงตก
          // definition-list ทุกครั้งที่รัน Lighthouse — พลิกกลับด้วย
          // flex-col-reverse ตัวเลขจึงยังอยู่บนป้ายเหมือนเดิม
          <Reveal
            key={s.label}
            delay={i * 0.1}
            y={20}
            className="flex flex-col-reverse px-3 text-center"
          >
            <dt className="micro mt-4">{s.label}</dt>
            {/* ใหญ่ขึ้นเพราะเป็นจังหวะ ไม่ใช่เพราะบาง — น้ำหนักยังเป็น 400 ตามสเปก §3.2 */}
            <dd className="font-display text-[clamp(52px,7vw,104px)] font-normal leading-none">
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
    // A4: บล็อกนี้แคบกว่าและจัดกลาง ไม่ใช่เต็มความกว้าง px-[8vw] เหมือนบล็อกอื่น
    // และกริดไม่ใช่สามช่องเท่ากัน — ชิ้นแรกกิน 7 ส่วนพร้อมภาพใหญ่ อีกสองชิ้นซ้อนกัน
    // อยู่ใน 5 ส่วนที่เหลือ ตรรกะคอลัมน์จึงต่างจากกริด 4 ช่องด้านบนจริง ๆ
    <section className="bg-base px-6 py-24 md:py-32">
      <Reveal className="mx-auto mb-14 flex max-w-6xl items-end justify-between gap-6">
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

      <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-12 md:grid-cols-12">
        {LATEST.map(({ post, cover }, i) => {
          // พาดหัวอังกฤษจาก postTitle() คำโปรยยังเป็นไทยตามต้นฉบับ จึงติดป้าย
          const head = postTitle(post, lang);
          return (
          <Reveal
            key={post.slug}
            delay={i * 0.12}
            className={i === 0 ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5'}
          >
            <Link href={`/articles/${post.slug}/`} className="group block">
              <div className="overflow-hidden">
                <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                  <ParallaxImage
                    src={lifestyleSrc(cover, i === 0 ? 700 : 460, 2)}
                    alt={cover.alt[lang]}
                    ratio={i === 0 ? '3/2' : '16/9'}
                    speed={i % 2 ? 5 : -5}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                  />
                </div>
              </div>
              {/* task E1 — post.tagEn มีอยู่ในข้อมูลตั้งแต่ต้น และ ArticlesContent
                  ก็เลือกตามภาษาอยู่แล้ว มีแต่การ์ดชุดนี้ที่อ่าน post.tag ตรง ๆ
                  หมวดหมู่จึงเป็นไทยค้างอยู่บนหน้าแรกฉบับอังกฤษ */}
              <p className="micro mt-5">
                {lang === 'en' ? post.tagEn : post.tag} ·{' '}
                {new Date(post.date).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <h3
                className={`mt-2 font-normal text-ink ${
                  i === 0 ? 'font-display text-[clamp(24px,2.6vw,36px)] leading-thai' : 'text-card'
                }`}
                lang={head.lang}
              >
                {head.text}
              </h3>
              <p className="mt-3 text-body-sm leading-relaxed text-dim">
                <Foreign>{post.excerpt[lang]}</Foreign>
              </p>
            </Link>
          </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/**
 * §3.3 ข้อ 6 — โชว์รูม/ติดต่อ + จานสีสิบเอ็ดเฉด (task A4: จังหวะมืดที่สอง)
 *
 * ปิดหน้าด้วยพื้นมืด ไม่ใช่กริดสว่างอีกอันต่อจากกริดบทความ วัสดุสิบเอ็ดแถบเรือง
 * ขึ้นบนพื้นมืดแทนที่จะจมหายไปกับพื้น #E5E5E5 แบบเดิม (เหตุผลเดียวกับที่ depth
 * field ต้องมืด) และครึ่ง CTA มีภาพห้องจริงเป็นฉากหลังแทนกล่องเปล่า
 */
function ShowroomBlock() {
  const { lang, t } = useLang();
  const room = ROOM_PHOTO.showroom;
  return (
    <section data-dark-beat className="border-t border-line-6">
      {/* แถบวัสดุ: ไม่ใช่ลิงก์ ตั้งใจ — ตัวนำทางด้วยเฉดคือกำแพงด้านบน
          แถบนี้ทำหน้าที่ปิดวง ย้ำว่าทั้งสิบเอ็ดเฉดมีของจริง */}
      <div className="px-6 py-20 md:px-[8vw] md:py-24">
        <Reveal className="mb-10 max-w-2xl">
          <p className="micro mb-3">{t.home.paletteKicker}</p>
          <h2 className="font-display text-section font-normal">{t.home.paletteTitle}</h2>
          <p className="mt-4 text-body text-dim">{t.home.paletteSub}</p>
        </Reveal>
        {/* เคยเป็นแถบวัสดุเฉย ๆ ไม่ใช่ลิงก์ เพราะตัวนำทางด้วยเฉดคือกำแพงบนหัวหน้า
            กำแพงย้ายไป /products แล้ว บล็อกนี้จึงรับหน้าที่นั้นแทน: แต่ละเฉดพาไป
            กริดสินค้าที่กรองเฉดนั้นไว้ จำนวนยังมาจาก finishIndex ตัวเดียวกับกำแพง */}
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {finishIndex.map((f) => (
            <li key={f.code}>
              <Link
                href={`/products/?finish=${encodeURIComponent(f.code)}`}
                className="focus-inset group block"
              >
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
      </div>

      <div className="relative isolate grid gap-12 border-t border-line-6 px-6 py-24 md:grid-cols-2 md:px-[8vw] md:py-32">
        {/* ภาพห้องจริงเป็นฉากหลังของบล็อกปิด — หรี่ไว้จนตัวอักษรยังนำสายตา
            0.18 ไม่ใช่ 0.28: วัดจากพิกเซลที่เรนเดอร์จริงแล้ว ป้าย .micro บนภาพที่
            หรี่ไว้ 0.28 ได้ 4.27:1 ซึ่งต่ำกว่าเกณฑ์ตัวรอง 4.5:1 — ค่าที่ประกาศ
            (#A8A8A4 บน #08090A = 8.35:1) เชื่อไม่ได้เมื่อมีภาพคั่นอยู่ตรงกลาง */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
        <img
          src={lifestyleSrc(room, 1440, 1)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.18]"
        />
        <Reveal>
          <p className="micro mb-3">{t.home.showroomKicker}</p>
          <h2 className="max-w-xl font-display text-[clamp(32px,4vw,58px)] font-normal leading-thai">
            {t.home.ctaTitle}
          </h2>
          <p className="mt-4 max-w-md text-body text-dim">{t.home.ctaSub}</p>
          <Link
            href="/contact/"
            className="mt-10 inline-block border border-line-12 px-10 py-4 transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">{t.home.ctaBtn}</span>
          </Link>
        </Reveal>

        <Reveal delay={0.12}>
          <dl className="space-y-7">
            <div>
              <dt className="micro mb-2">{t.home.showroomAddressLabel}</dt>
              <dd className="max-w-xs text-body">
                {lang === 'th' ? CONTACT.address_th : CONTACT.address_en}
              </dd>
            </div>
            <div>
              <dt className="micro mb-2">{t.home.showroomHoursLabel}</dt>
              <dd className="text-body">{t.home.showroomHours}</dd>
            </div>
            <div>
              <dt className="micro mb-2">{t.home.showroomPhoneLabel}</dt>
              <dd className="text-body">
                <a href={`tel:${CONTACT.phone}`} className="underline-offset-4 hover:underline">
                  {CONTACT.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="micro mb-2">E-MAIL</dt>
              <dd className="text-body">
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

export default function HomeContent({ fieldPlanes, galleryTotal }: Props) {
  return (
    <>
      <TopFinishGrid />
      {/* ทางเข้าสนามภาพวางต่อจากกริดชิ้นเด่นโดยตั้งใจ (task B2 ข้อ 2):
          กริดคือของแปดชิ้นเรียงกันบนพื้นสว่าง บล็อกถัดมาคือของทั้งชุดลอยอยู่ใน
          ที่ว่างมืด — เป็นก้าวต่อจากกันจริง ๆ ไม่ใช่ปุ่มที่แปะไว้เฉย ๆ */}
      <FieldEntry planes={fieldPlanes} total={galleryTotal} />
      <RoomSplit />
      <PinnedStory images={STORY_IMAGES} />
      <Stats />
      <LatestPosts />
      <ShowroomBlock />
    </>
  );
}
