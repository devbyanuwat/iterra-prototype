# Parallax Image Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three pinned home sections under the hero with a multi-speed parallax image wall, story rows and a featured-product grid.

**Architecture:** One new client component `components/ImageWall.tsx` (columns translated by GSAP ScrollTrigger `scrub`, no pin). Story rows and the featured grid are small local functions in `components/home/HomeContent.tsx`, built from existing `ParallaxImage`, `Reveal` and `ProductCard`. The three old pinned components are deleted.

**Tech Stack:** Next.js 16.3 static export (Turbopack), React 19, Tailwind 3, GSAP 3.15 ScrollTrigger + Lenis.

**Spec:** `docs/superpowers/specs/2026-10-03-parallax-wall-design.md`

## Global Constraints

- Branch `preview-parallax-wall`. Never touch `main` or `preview-initial`. Implementers commit only; the controller pushes.
- No new dependencies. Next 16 differs from training data — if you touch a Next API, read `node_modules/next/dist/docs/` first (this plan uses none beyond `next/link`).
- Every GSAP effect lives in `gsap.matchMedia()` under `'(prefers-reduced-motion: no-preference) and (min-width: 768px)'` and is cleaned up with `mm.revert()`.
- React list keys are never translated strings (use index, `slug` or `src`).
- `lib/i18n.ts`: `th` and `en` must keep identical keys (`Dict = (typeof dict)['th']`).
- Theme tokens only: `paper`, `ink`, `warm-*`; kicker pattern `text-[11px] uppercase tracking-widest2`.
- Hero, Nav and every other page stay untouched.
- Implementers do not open a browser and do not dispatch subagents; the controller runs the browser checks.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verify with `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` (stale `.next/types` errors are ignored) and `npm run build`.

---

### Task 1: ImageWall replaces ScrollGallery

**Files:**
- Create: `components/ImageWall.tsx`
- Modify: `components/home/HomeContent.tsx` (header comment, imports, `HomeContent()` body)
- Delete: `components/ScrollGallery.tsx`

**Interfaces:**
- Consumes: `useScope(): Scope` from `lib/scope.ts`; `galleryFor(scope): GalleryItem[]` and `GalleryItem { src, w, h, group, caption{th,en} }` from `lib/gallery.ts`; `Reveal` (`components/Reveal.tsx`); `useLang()` → `{ lang, t }`.
- Produces: `export default function ImageWall()` (no props).

- [ ] **Step 1: Create `components/ImageWall.tsx`**

```tsx
'use client';

// หน้าแรก: ผนังภาพจากแคตตาล็อก — แต่ละคอลัมน์เลื่อนด้วยความเร็วไม่เท่ากันตาม scroll (ไม่มี pin)
// เดสก์ท็อป 3 คอลัมน์: ซ้ายช้า · กลางเร็ว · ขวากลาง · มือถือ 2 คอลัมน์ภาพนิ่ง · reduced-motion = grid นิ่ง
// ?scope= กำหนดจำนวนภาพ (6 / 9 / 12) ผ่าน useScope

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { useScope } from '@/lib/scope';
import { galleryFor, type GalleryItem } from '@/lib/gallery';

// ระยะเลื่อนต่อคอลัมน์ (px ต่อความสูงจอ 1000px) — เดินจาก +d ไป −d จึงตรงกันพอดีตอนกลาง section
const TRAVEL = [60, 180, 110];

// แจกภาพวนเข้าแต่ละคอลัมน์: ภาพที่ i ไปคอลัมน์ i % n
const split = (items: GalleryItem[], n: number) =>
  Array.from({ length: n }, (_, c) => items.filter((_, i) => i % n === c));

function Tile({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  // ภาพ flooring ต้นฉบับ 375px — ห้ามขยายเกินขนาดจริง
  return (
    <figure className={item.group === 'flooring' ? 'mx-auto w-full max-w-[375px]' : undefined}>
      <img src={item.src} width={item.w} height={item.h} alt="" loading="lazy" className="h-auto w-full" />
      <figcaption className="mt-3 text-[12px] font-light text-paper/70">{item.caption[lang]}</figcaption>
    </figure>
  );
}

export default function ImageWall() {
  const root = useRef<HTMLElement>(null);
  const { lang, t } = useLang();
  const items = galleryFor(useScope());

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      gsap.utils.toArray<HTMLElement>('[data-col]', el).forEach((col, i) => {
        const d = () => (TRAVEL[i] * window.innerHeight) / 1000;
        gsap.fromTo(
          col,
          { y: d },
          {
            y: () => -d(),
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
          },
        );
      });
    });
    // ?scope= เปลี่ยนจำนวนภาพหลัง mount → ความสูง section เปลี่ยน ต้อง refresh ให้ trigger ด้านล่างนับตำแหน่งใหม่
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [items.length]);

  return (
    // overflow-hidden: คอลัมน์ที่เลื่อนเกินขอบจะไม่ทับ section ถัดไป
    <section ref={root} className="overflow-hidden bg-ink text-paper">
      <div className="px-6 pb-12 pt-24 md:px-[8vw] md:pt-32">
        <Reveal>
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-paper/50">{t.home.galleryKicker}</p>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.galleryTitle}</h2>
        </Reveal>
      </div>
      {/* เดสก์ท็อป: 3 คอลัมน์ parallax */}
      <div className="hidden grid-cols-3 items-start gap-8 px-[8vw] pb-40 md:grid">
        {split(items, 3).map((col, c) => (
          <div key={c} data-col className="space-y-8">
            {col.map((item) => (
              <Tile key={item.src} item={item} lang={lang} />
            ))}
          </div>
        ))}
      </div>
      {/* มือถือ: 2 คอลัมน์ภาพนิ่ง */}
      <div className="grid grid-cols-2 items-start gap-4 px-6 pb-20 md:hidden">
        {split(items, 2).map((col, c) => (
          <div key={c} className="space-y-6">
            {col.map((item) => (
              <Tile key={item.src} item={item} lang={lang} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Swap it into `components/home/HomeContent.tsx`**

Header comment line:
`// หน้าแรก: hero → scroll gallery → horizontal gallery → pinned story → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA`
→ `// หน้าแรก: hero → ผนังภาพ parallax → horizontal gallery → pinned story → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA`

Import: `import ScrollGallery from '@/components/ScrollGallery';` → `import ImageWall from '@/components/ImageWall';`

Body: `<ScrollGallery />` → `<ImageWall />`

- [ ] **Step 3: Delete the old component**

Run: `git rm components/ScrollGallery.tsx`

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` → no output.
Run: `npm run build` → succeeds.
Run: `grep -rn ScrollGallery app components lib` → no output.

- [ ] **Step 5: Commit**

```bash
git add components/ImageWall.tsx components/home/HomeContent.tsx
git commit -m "feat: replace the pinned gallery with a multi-speed parallax image wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6 (controller): browser check** — visible Chrome, home at 1200 / 768 / 375, `?scope=kitchen|wardrobe|all` → 6 / 9 / 12 tiles in the visible variant, columns at mid-section aligned (y≈0), middle column moves most, flooring tiles ≤ 375 px wide, `.pin-spacer` count = 2 (the two pinned sections still below), no horizontal scroll, TH↔EN captions switch, reduced motion simulated → no column transforms, console clean.

---

### Task 2: Story rows and featured grid replace the last two pinned sections

**Files:**
- Modify: `components/home/HomeContent.tsx` (header comment, imports, add `STORY_IMAGES`, `StoryRows()`, `FeaturedGrid()`, `HomeContent()` body)
- Modify: `lib/i18n.ts` (delete `home.featuredHint` in `th` and `en`)
- Delete: `components/PinnedStory.tsx`, `components/HorizontalGallery.tsx`

**Interfaces:**
- Consumes: `ImageWall` (Task 1); `ParallaxImage({ label, ratio, speed?, dark?, className? })`; `Reveal({ children, className?, delay?, y? })`; `ProductCard({ product })`; `featuredProducts: Product[]`; `t.home.storyKicker`, `t.home.storySlides[{title, body}]`, `t.home.featuredKicker`, `t.home.featuredTitle`, `t.common.viewAll`.
- Produces: nothing new outside the file.

- [ ] **Step 1: Imports and header in `components/home/HomeContent.tsx`**

Header comment → `// หน้าแรก: hero → ผนังภาพ parallax → เรื่องราว 3 แถว → สินค้าเด่น → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA (ไม่มี section ไหน pin)`

Delete these two imports:
```tsx
import PinnedStory from '@/components/PinnedStory';
import HorizontalGallery from '@/components/HorizontalGallery';
```
Add after `import ParallaxImage from '@/components/ParallaxImage';`:
```tsx
import ProductCard from '@/components/ProductCard';
```

- [ ] **Step 2: Add the two sections above `function Stats()`**

```tsx
// ภาพประกอบเรื่องราวยังเป็น placeholder (ลำดับตรงกับ t.home.storySlides)
const STORY_IMAGES = ['เรื่องราว ภาพ 01 (โชว์รูม)', 'เรื่องราว ภาพ 02 (สัมผัสจริง)', 'เรื่องราว ภาพ 03 (ทีมติดตั้ง)'];

// เรื่องราว 3 แถว: ภาพ parallax สลับซ้าย–ขวา + ข้อความ reveal · มือถือเรียงภาพแล้วข้อความ
function StoryRows() {
  const { t } = useLang();
  return (
    <section className="space-y-20 px-6 py-24 md:space-y-32 md:px-[8vw] md:py-32">
      {t.home.storySlides.map((s, i) => (
        <div key={i} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
          <ParallaxImage
            label={STORY_IMAGES[i]}
            ratio="3/2"
            className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}
          />
          <Reveal className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
            <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">
              {t.home.storyKicker} — 0{i + 1}
            </p>
            <h2 className="mb-4 text-2xl font-extralight tracking-wide md:text-3xl">{s.title}</h2>
            <p className="text-sm font-light leading-relaxed text-warm-500">{s.body}</p>
          </Reveal>
        </div>
      ))}
    </section>
  );
}

// สินค้าเด่น: grid 2 คอลัมน์ (มือถือ) / 4 คอลัมน์ (เดสก์ท็อป) · การ์ด reveal ทีละใบ
function FeaturedGrid() {
  const { t } = useLang();
  return (
    <section className="border-t border-warm-200 px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">{t.home.featuredKicker}</p>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.featuredTitle}</h2>
        </div>
        <Link
          href="/products/"
          className="shrink-0 text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
        >
          {t.common.viewAll} →
        </Link>
      </Reveal>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {featuredProducts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.1}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: New `HomeContent()` body**

```tsx
export default function HomeContent() {
  return (
    <>
      <Hero />
      <ImageWall />
      <StoryRows />
      <FeaturedGrid />
      <Stats />
      <CatalogTeaser />
      <LatestPosts />
      <ContactCta />
    </>
  );
}
```

- [ ] **Step 4: Remove the unused i18n key in `lib/i18n.ts`**

Delete exactly these two lines:
```ts
      featuredHint: 'เลื่อนลงเพื่อชมสินค้า — แนวนอน',
```
```ts
      featuredHint: 'Keep scrolling — the gallery moves sideways',
```

- [ ] **Step 5: Delete the old components**

Run: `git rm components/PinnedStory.tsx components/HorizontalGallery.tsx`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` → no output.
Run: `npm run build` → succeeds.
Run: `grep -rn 'PinnedStory\|HorizontalGallery\|featuredHint' app components lib` → no output.
Run: `grep -c 'featuredKicker' lib/i18n.ts` → `2`.

- [ ] **Step 7: Commit**

```bash
git add components/home/HomeContent.tsx lib/i18n.ts
git commit -m "feat: replace the pinned story and product rail with parallax rows and a grid

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8 (controller): browser check** — visible Chrome, home at 1200 / 768 / 375: `.pin-spacer` count = 0, story rows alternate image left/right at md+ and stack on mobile, story images move inside their frames at md+, 4 product cards (4 cols md+, 2 cols mobile), "View all →" goes to `/products/`, TH↔EN keeps layout (no remount flashes), reduced motion simulated → everything static and visible, no horizontal scroll, console clean, screenshot.
