'use client';

// เนื้อหาหน้า /finish/[code] (spec finish-first §4.2)
//
// สี่ข้อบังคับของ §4.2 และที่อยู่ของแต่ละข้อในไฟล์นี้:
//   1. เฉพาะสินค้าที่มีเฉดนั้น และเรนเดอร์ "ในเฉดนั้น"  → GRID / FinishProductCard
//   2. --accent = accent ของเฉดนั้น ทั้งหน้า            → useAccent()
//   3. ครัว/ห้องน้ำ เป็นฟิลเตอร์รอง ไม่ใช่ nav หลัก      → CategoryFilter ในหน้า
//   4. สลับเฉดจากแถบขอบจอ กริด crossfade ไม่โหลดหน้าใหม่ → switchTo()

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import FinishProductCard from './FinishProductCard';
import FinishRail from './FinishRail';
import { useLang } from './LangProvider';
import { finishIndex, finishOf, getFinishEntry } from './finish-index';
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
      window.history.pushState({ finish: next }, '', `/finish/${encodeURIComponent(next)}/`);
      applySwitch(next);
    },
    [active, applySwitch],
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
      const raw = window.location.pathname.split('/').filter(Boolean)[1];
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
  const filters: Filter[] = ['all', 'kitchen', 'bath'];

  return (
    <>
      <section className="px-6 pb-12 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <p className="micro mb-4">{t.finish.kicker}</p>
        <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">
          {t.finish.title(entry.name[lang])}
        </h1>
        <p className="mt-4 max-w-xl text-body text-dim">{t.finish.sub(entry.count)}</p>

        {/* เส้น kicker ใช้ --accent — ตัวชี้วัดสายตาว่าสีของหน้าเปลี่ยนตามเฉดจริง */}
        <span aria-hidden className="mt-8 block h-px w-24 bg-accent" />

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

        <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4">
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
