'use client';

// เนื้อหาหน้า /finish/[code] (spec finish-first §4.2)
//
// สี่ข้อบังคับของ §4.2 และที่อยู่ของแต่ละข้อในไฟล์นี้:
//   1. เฉพาะสินค้าที่มีเฉดนั้น และเรนเดอร์ "ในเฉดนั้น"  → GRID / FinishProductCard
//   2. --accent = accent ของเฉดนั้น ทั้งหน้า            → useAccent()
//   3. ครัว/ห้องน้ำ เป็นฟิลเตอร์รอง ไม่ใช่ nav หลัก      → CategoryFilter ในหน้า
//   4. สลับเฉดจากแถบขอบจอ กริด crossfade ไม่โหลดหน้าใหม่ → switchTo()

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from '@/components/Link';
import gsap from 'gsap';
import FinishProductCard from './FinishProductCard';
import FinishRail from './FinishRail';
import { useLang } from './LangProvider';
import { finishIndex, finishOf, getFinishEntry } from './finish-index';
import { roomFor } from './home/rooms';
import { langPath, splitLangPath } from '@/lib/i18n';
import { lifestyleSrc } from '@/lib/lifestyle';
import type { Category, Finish, Product } from '@/lib/products';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// 420ms ตามสเปก §5 แบ่งครึ่ง: จางออก 210 + จางเข้า 210
const FADE_S = 0.21;
const ACCENT_S = 0.42;

type GridItem = { product: Product; finish: Finish };

/**
 * สินค้าของแต่ละเฉด พร้อม Finish ของเฉดนั้นติดมาด้วย
 *
 * `finishOf(product, code)` ไม่ใช่ `product.finishes[0]` — นี่คือทั้งหมดของ §4.2
 * ถ้าใช้ finishes[0] หน้าเฉดดำจะเต็มไปด้วยรูปโครม แล้วหน้านี้ก็ไม่ต่างจากหน้ารวม
 *
 * สร้างครั้งเดียวตอนโหลดโมดูล: เป็นข้อมูลคงที่ ไม่ขึ้นกับภาษาหรือ state และการสลับ
 * เฉดต้องได้กริดใหม่ทันทีในเฟรมเดียวกับที่ crossfade จบ ไม่ใช่มานั่งคำนวณตอนนั้น
 */
const GRID: ReadonlyMap<string, GridItem[]> = new Map(
  finishIndex.map((entry) => [
    entry.code,
    entry.products.flatMap((product) => {
      const finish = finishOf(product, entry.code);
      // เข้าไม่ถึงในทางปฏิบัติ — entry.products ถูกสร้างจากเฉดนี้อยู่แล้ว
      // แต่ filter ทิ้งดีกว่าปล่อย non-null assertion ที่จะพังเงียบถ้าข้อมูลเปลี่ยน
      return finish ? [{ product, finish }] : [];
    }),
  ]),
);

type Filter = 'all' | Category;

/**
 * tween --accent บน <html> ไปหาสีของเฉดที่เลือก
 *
 * ไม่ได้ใช้ FinishProvider ทั้งที่ตรรกะคล้ายกัน เพราะ FinishProvider รับ `Finish[]`
 * ของ "สินค้าหนึ่งชิ้น" หน้านี้ไม่มีสินค้าชิ้นไหนเป็นเจ้าของสี — สีเป็นของทั้งหน้า
 * การยัด FinishEntry ให้กลายเป็น Finish ปลอม ๆ เพื่อให้เข้า type ได้จะเป็นการโกหก
 * รูปทรงข้อมูล จึงเขียนตัวสั้น ๆ ที่นี่แทน พฤติกรรมยังเหมือนกัน:
 * interpolate จริงทีละเฟรม · reduced-motion เซ็ตทันที · คืนค่าเดิมตอน unmount
 *
 * ค่าตั้งต้นมาจาก <style> ที่ page.tsx ฝังไว้ใน HTML แล้ว หน้าจึงไม่กระพริบเป็นสีทอง
 * ก่อน hydrate — inline style ที่เขียนตรงนี้ชนะกฎใน <style> เสมอ
 */
function useAccent(hex: string) {
  const painted = useRef<string | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const el = document.documentElement;
    const previous = el.style.getPropertyValue('--accent');
    return () => {
      tween.current?.kill();
      tween.current = null;
      if (previous) el.style.setProperty('--accent', previous);
      else el.style.removeProperty('--accent');
    };
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    const from = painted.current;
    tween.current?.kill();

    const settle = () => {
      painted.current = hex;
      el.style.setProperty('--accent', hex);
    };

    if (!from || from === hex || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle();
      return;
    }

    const mix = gsap.utils.interpolate(from, hex);
    const p = { v: 0 };
    tween.current = gsap.to(p, {
      v: 1,
      duration: ACCENT_S,
      ease: 'power2.inOut',
      onUpdate: () => {
        const c = mix(p.v);
        painted.current = c;
        el.style.setProperty('--accent', c);
      },
      onComplete: settle,
    });

    return () => {
      tween.current?.kill();
      tween.current = null;
    };
  }, [hex]);
}

export default function FinishContent({ code }: { code: string }) {
  const { lang, t } = useLang();
  const [active, setActive] = useState(code);
  const [filter, setFilter] = useState<Filter>('all');

  const gridRef = useRef<HTMLDivElement>(null);
  // true ระหว่างที่ crossfade กำลังทำงาน — กันกดรัวจนสองคิวชนกัน
  // และเป็นตัวบอก layout effect ว่าต้องจางกลับเข้าไหม
  const fading = useRef(false);

  const entry = getFinishEntry(active) ?? finishIndex[0];
  useAccent(entry.accent);

  const items = GRID.get(entry.code) ?? [];
  const kitchenCount = items.filter((i) => i.product.category === 'kitchen').length;
  const counts: Record<Filter, number> = {
    all: items.length,
    kitchen: kitchenCount,
    bath: items.length - kitchenCount,
  };
  const shown = filter === 'all' ? items : items.filter((i) => i.product.category === filter);

  // ── สลับเฉดโดยไม่โหลดหน้าใหม่ (AC 5) ──────────────────────────────────
  //
  // ไม่ใช้ router.push: Next จะ remount ทั้งหน้า กริดเก่าหายไปก่อนกริดใหม่มา
  // จึงไม่มีทาง crossfade ได้ตามสเปก §4.2 — ใช้ state ในที่เดิมแล้วซิงก์ URL
  // ด้วย history API แทน ปุ่ม back/forward จึงยังทำงานและลิงก์ตรงยังเข้าได้
  // (หน้าทั้ง 11 มีอยู่จริงใน static export ลิงก์ที่แชร์ออกไปจึงไม่พึ่ง JS)
  const applySwitch = useCallback((next: string) => {
    const el = gridRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(next);
      return;
    }
    fading.current = true;
    gsap.to(el, {
      opacity: 0,
      duration: FADE_S,
      ease: 'power2.in',
      onComplete: () => setActive(next),
    });
  }, []);

  const switchTo = useCallback(
    (next: string) => {
      if (next === active || fading.current) return;
      // langPath: URL ที่เขียนกลับต้องอยู่ในต้นไม้เดียวกับหน้าที่ผู้อ่านยืนอยู่
      // ไม่งั้นการสลับเฉดในหน้าไทยจะเขียน URL อังกฤษทับ แล้วปุ่ม refresh หรือ
      // ลิงก์ที่ก๊อปไปจะพาไปอีกภาษาหนึ่งโดยที่หน้าจอไม่ได้เปลี่ยนอะไรเลย
      window.history.pushState(
        { finish: next },
        '',
        langPath(lang, `/finish/${encodeURIComponent(next)}/`),
      );
      applySwitch(next);
    },
    [active, applySwitch, lang],
  );

  // จางกลับเข้าหลัง React วาดกริดใหม่แล้ว
  // ต้องเป็น layout effect ไม่ใช่ requestAnimationFrame หลัง setState —
  // React batch การอัปเดต เฟรมถัดไปอาจยังเป็น DOM เดิม แล้วกริดจะค้างที่ opacity 0
  useIsoLayoutEffect(() => {
    const el = gridRef.current;
    if (!el || !fading.current) return;
    gsap.fromTo(
      el,
      { opacity: 0 },
      {
        opacity: 1,
        duration: FADE_S,
        ease: 'power2.out',
        onComplete: () => {
          fading.current = false;
        },
      },
    );
  }, [active]);

  // ปุ่ม back/forward: อ่านรหัสเฉดกลับจาก URL
  useEffect(() => {
    const onPop = () => {
      // ตัดคำนำหน้าภาษาออกก่อนนับตำแหน่ง — ใน /th/finish/CP/ ส่วนที่ [1] ชี้ไป
      // คือ 'finish' ไม่ใช่รหัสเฉด ปุ่ม back ในต้นไม้ไทยจึงจะเงียบไปเฉย ๆ
      const raw = splitLangPath(window.location.pathname).path.split('/').filter(Boolean)[1];
      if (!raw) return;
      const next = decodeURIComponent(raw);
      // ไม่เช็คด้วย truthiness — '0' คือ White ซึ่งเป็นเฉดที่ใหญ่อันดับสอง
      if (getFinishEntry(next)) applySwitch(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applySwitch]);

  // เปลี่ยนเฉดแล้วยังอยู่หมวดเดิมโดยตั้งใจ ("ขอดูครัวในทุกเฉด" เป็นคำถามที่สมเหตุสมผล)
  // ถ้าเฉดใหม่ไม่มีของในหมวดนั้น ปุ่มฟิลเตอร์บอกจำนวน 0 ให้เห็นก่อนกด และมี empty state รับ
  // แถวกรองห้องเหลือเฉพาะห้องที่มีของจริงในเฉดนี้ และหายไปทั้งแถวถ้าเหลือห้องเดียว
  // (เว็บแสดงเฉพาะห้องครัวแล้ว — lib/scope.ts) ปุ่มที่กดแล้วผลไม่เปลี่ยนคือ UI
  // ที่อ้างว่ามีตัวเลือกทั้งที่ไม่มี
  const rooms = (['kitchen', 'bath'] as const).filter((c) => items.some((i) => i.product.category === c));
  const filters: Filter[] = rooms.length > 1 ? ['all', ...rooms] : [];

  // ── หน้าเฉดเปิดด้วยห้องจริง ไม่ใช่พาดหัวลอย ๆ เหนือกริด (task A2) ─────────
  // เลือกจากแฮชของรหัสเฉด จึงคงที่ต่อเฉดหนึ่ง ๆ และเปลี่ยนตามเฉดที่สลับอยู่
  // ไม่ได้อ้างว่าห้องในภาพใช้เฉดนี้ — คลังภาพไม่มีข้อมูลนั้น สิ่งที่แถบนี้ทำคือ
  // เปิดหน้าด้วยห้อง แล้วค่อยตามด้วยของที่อยู่ในห้องได้
  //
  // เลือก space ตามหมวดที่เฉดนี้มีของเยอะกว่า — เฉดที่ของเกือบทั้งหมดเป็นห้องน้ำ
  // ไม่ควรเปิดหน้าด้วยภาพครัว
  const room = roomFor(entry.code, {
    minWidth: 1440,
    minAspect: 1.4,
    // ขอ 'kitchen' เมื่อของส่วนใหญ่ในเฉดนี้เป็นของครัว — ซึ่งตอนนี้เป็นทุกเฉด
    // เพราะเว็บเหลือเฉพาะห้องครัว ปล่อยเงื่อนไขไว้ ไม่ได้ตรึงเป็น 'kitchen':
    // มันจะถูกต้องเองอีกครั้งถ้าพลิก KITCHEN_ONLY กลับ
    space: kitchenCount * 2 > items.length ? 'kitchen' : 'bath',
  });

  return (
    <>
      {room && (
        <section className="relative isolate min-h-[46svh] overflow-clip bg-ink md:min-h-[62svh]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
          <img
            src={lifestyleSrc(room, 1440, 1)}
            alt={room.alt[lang]}
            width={room.width}
            height={room.height}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(8,9,10,0.86) 0%, rgba(8,9,10,0.55) 44%, rgba(8,9,10,0.12) 80%, rgba(8,9,10,0.04) 100%)',
            }}
          />
          <div className="relative z-10 flex min-h-[46svh] flex-col justify-end px-6 pb-10 pt-36 md:min-h-[62svh] md:px-[8vw] md:pb-14 md:pt-44">
            <p className="micro !text-white/80">{t.finish.kicker}</p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(34px,5vw,68px)] font-semibold leading-thai text-white">
              {t.finish.title(entry.name[lang])}
            </h1>
            <p className="mt-4 max-w-xl text-body text-white/85">{t.finish.sub(entry.count)}</p>
            {/* ตัวอย่างวัสดุจริงของเฉดนี้ วางคู่กับห้อง — เส้น accent เดิมบอกสีได้
                อย่างเดียว แถบวัสดุบอก "ผิว" ซึ่งเป็นสิ่งที่หน้านี้ขาย */}
            <span
              aria-hidden
              className="mt-7 block h-10 w-40 border border-white/30 bg-accent bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.material})` }}
            />
          </div>
        </section>
      )}

      <section className="px-6 pb-12 pt-14 md:px-[8vw] md:pb-16">

        {/* ครัว/ห้องน้ำ เป็นฟิลเตอร์ "ในหน้า" ไม่ใช่แกนหลัก (§4.2) จึงอยู่ใต้พาดหัว
            ของเฉด ไม่ได้อยู่บน nav และไม่ได้อยู่เหนือชื่อเฉด */}
        <div
          className="mt-10 flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t.products.filterLabel}
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`border px-5 py-2 text-label uppercase transition-colors duration-300 ${
                filter === f
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line-12 text-dim hover:border-ink hover:text-ink'
              }`}
            >
              {t.common.category[f]} {counts[f]}
            </button>
          ))}
        </div>
      </section>

      {/* pb ใหญ่บนมือถือ: แถบเฉดลอยทับขอบล่างอยู่ ถ้าไม่เผื่อ การ์ดใบท้ายจะถูกบัง */}
      <section className="px-6 pb-40 md:px-[8vw] md:pb-28 md:pr-[7rem]">
        {shown.length === 0 ? (
          <p className="py-20 text-center text-body text-dim">{t.finish.empty}</p>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
          >
            {shown.map(({ product, finish }, i) => (
              <FinishProductCard
                // key ผูกกับเฉดด้วย ไม่ใช่แค่ slug — สลับเฉดแล้ว React ต้องสร้าง
                // <img> ใหม่ ไม่ใช่แก้ src ของตัวเดิม ไม่งั้นจะเห็นรูปเก่าค้าง
                // อยู่หนึ่งจังหวะระหว่างที่รูปใหม่ยังโหลดไม่เสร็จ
                key={`${finish.code}-${product.slug}`}
                product={product}
                finish={finish}
                priority={i < 3}
              />
            ))}
          </div>
        )}

        {/* ── ก้าวถัดไปของหน้านี้: ของชุดเดิม ในที่ว่าง (task B2 ข้อ 2) ──────
            วางไว้ท้ายกริดโดยตั้งใจ ไม่ใช่บนหัวหน้า — คนที่เพิ่งเลื่อนผ่านของทั้ง
            เฉดมาแล้วคือคนที่คำถาม "แล้วมันอยู่ด้วยกันหน้าตาเป็นยังไง" เกิดขึ้นจริง
            ปลายทางเป็นสนามของ "เฉดนี้" ไม่ใช่สนามรวม จึงเป็นของชุดเดียวกับกริด
            ข้างบนเป๊ะ ๆ (ดู app/gallery/finish-planes.ts) */}
        <Link
          href={`/gallery/${encodeURIComponent(entry.code)}/`}
          className="group mt-16 flex flex-wrap items-center justify-between gap-6 border border-line-12 px-8 py-10 transition-colors duration-300 hover:border-accent md:px-12"
        >
          <div>
            <p className="micro">{t.gallery.kicker}</p>
            <h2 className="mt-2 text-card font-normal text-ink">{t.gallery.title}</h2>
            <p className="mt-2 text-body-sm text-dim">
              {t.finish.pieces(entry.count)} · {entry.name[lang]}
            </p>
          </div>
          {/* ไม่ใช่ !text-accent: --accent ของหน้านี้เป็นสีของเฉด ซึ่งเฉดโครเมี่ยม
              (#CDCED3) และเฉดขาวบนพื้น #E5E5E5 อ่านไม่ออก — สีของ accent อยู่ที่
              ขอบกล่องตอน hover ซึ่งเป็นของประดับ ไม่ใช่ตัวหนังสือ */}
          <span className="micro flex items-center gap-4 !text-ink">
            {t.common.explore}
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </Link>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/" className="micro underline-offset-8 hover:underline">
            ← {t.finish.backToWall}
          </Link>
          <Link href="/products/" className="micro underline-offset-8 hover:underline">
            {t.common.viewAll}
          </Link>
        </div>
      </section>

      <FinishRail entries={finishIndex} activeCode={entry.code} onSelect={switchTo} />
    </>
  );
}
