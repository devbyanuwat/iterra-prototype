# Parallax Image Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three pinned home sections under the hero with a multi-speed parallax image wall, story rows and a featured-vs-rest product block.

**Architecture:** One new client component `components/ImageWall.tsx` (columns translated by GSAP ScrollTrigger `scrub`, no pin). Story rows and the featured block are small local functions in `components/home/HomeContent.tsx`, built from existing `ParallaxImage`, `Reveal`, `ProductCard` and `Placeholder`. The three old pinned components and their eyebrow i18n keys are deleted.

**Tech Stack:** Next.js 16.3 static export (Turbopack), React 19, Tailwind 3, GSAP 3.15 ScrollTrigger + Lenis.

**Spec:** `docs/superpowers/specs/2026-10-03-parallax-wall-design.md` (revised with the owner's taste-skill)

## Global Constraints

- Branch `preview-parallax-wall`. Never touch `main` or `preview-initial`. Implementers commit only; the controller pushes.
- No new dependencies. Next 16 differs from training data: if you touch a Next API, read `node_modules/next/dist/docs/` first (this plan uses none beyond `next/link`).
- Every GSAP effect lives in `gsap.matchMedia()` under `'(prefers-reduced-motion: no-preference) and (min-width: 768px)'` and is cleaned up with `mm.revert()`.
- Every animation carries a one-line code comment stating its reason (taste-skill: motion must be motivated).
- React list keys are never translated strings (use index, `slug` or `src`).
- `lib/i18n.ts`: `th` and `en` must keep identical keys (`Dict = (typeof dict)['th']`).
- Theme tokens only: `paper`, `ink`, `warm-*`.
- New sections: no eyebrow (small `uppercase tracking` label above a headline), no section-number labels, no `—` or `–` in any rendered string, single column below 768 px.
- Hero, Nav, CatalogTeaser, LatestPosts, ContactCta and every other page stay untouched.
- Implementers do not open a browser and do not dispatch subagents; the controller runs the browser checks.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verify with `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` (stale `.next/types` errors are ignored) and `npm run build`.

---

### Task 1: ImageWall replaces ScrollGallery

**Files:**
- Create: `components/ImageWall.tsx`
- Modify: `components/home/HomeContent.tsx` (header comment, one import, one JSX line)
- Modify: `lib/i18n.ts` (delete `home.galleryKicker` in `th` and `en`)
- Delete: `components/ScrollGallery.tsx`

**Interfaces:**
- Consumes: `useScope(): Scope` from `lib/scope.ts`; `galleryFor(scope): GalleryItem[]` and `GalleryItem { src, w, h, group, caption{th,en} }` from `lib/gallery.ts`; `Reveal` (`components/Reveal.tsx`); `useLang()` returns `{ lang, t }`.
- Produces: `export default function ImageWall()` (no props).

- [ ] **Step 1: Create `components/ImageWall.tsx`**

```tsx
'use client';

// หน้าแรก: ผนังภาพจากแคตตาล็อก แต่ละคอลัมน์เลื่อนด้วยความเร็วไม่เท่ากันตาม scroll (ไม่มี pin)
// เดสก์ท็อป 3 คอลัมน์: ซ้ายช้า กลางเร็ว ขวากลาง · มือถือ 1 คอลัมน์ภาพนิ่ง · reduced-motion = grid นิ่ง
// ?scope= กำหนดจำนวนภาพ (6 / 9 / 12) ผ่าน useScope

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { useScope } from '@/lib/scope';
import { galleryFor, type GalleryItem } from '@/lib/gallery';

// ระยะเลื่อนต่อคอลัมน์ (px ต่อความสูงจอ 1000px) เดินจาก +d ไป -d จึงตรงกันพอดีตอนกลาง section
const TRAVEL = [60, 180, 110];

// แจกภาพวนเข้าแต่ละคอลัมน์: ภาพที่ i ไปคอลัมน์ i % n
const split = (items: GalleryItem[], n: number) =>
  Array.from({ length: n }, (_, c) => items.filter((_, i) => i % n === c));

function Tile({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  // ภาพ flooring ต้นฉบับ 375px ห้ามขยายเกินขนาดจริง
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
      // เหตุผล: ความลึก คอลัมน์ที่เลื่อนเร็วกว่าดูใกล้กว่า เหมือนคลิปอ้างอิงที่เจ้าของส่งมา
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
    // ?scope= เปลี่ยนจำนวนภาพหลัง mount ความสูง section จึงเปลี่ยน ต้อง refresh ให้ trigger ด้านล่างนับตำแหน่งใหม่
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [items.length]);

  return (
    // overflow-hidden: คอลัมน์ที่เลื่อนเกินขอบจะไม่ทับ section ถัดไป
    <section ref={root} className="overflow-hidden bg-ink text-paper">
      <div className="px-6 pb-12 pt-24 md:px-[8vw] md:pb-16 md:pt-32">
        <Reveal>
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
      {/* มือถือ: คอลัมน์เดียว ภาพนิ่ง */}
      <div className="space-y-8 px-6 pb-20 md:hidden">
        {items.map((item) => (
          <Tile key={item.src} item={item} lang={lang} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Swap it into `components/home/HomeContent.tsx`**

Header comment line:
`// หน้าแรก: hero → scroll gallery → horizontal gallery → pinned story → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA`
becomes
`// หน้าแรก: hero → ผนังภาพ parallax → horizontal gallery → pinned story → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA`

Import: `import ScrollGallery from '@/components/ScrollGallery';` becomes `import ImageWall from '@/components/ImageWall';`

Body: `<ScrollGallery />` becomes `<ImageWall />`

- [ ] **Step 3: Delete the unused i18n key in `lib/i18n.ts`**

Delete both occurrences (one in `th`, one in `en`) of this exact line:
```ts
      galleryKicker: 'KOHLER KITCHENS',
```

- [ ] **Step 4: Delete the old component**

Run: `git rm components/ScrollGallery.tsx`

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` and expect no output.
Run: `npm run build` and expect success.
Run: `grep -rn 'ScrollGallery\|galleryKicker' app components lib` and expect no output.
Run: `grep -n '—\|–' components/ImageWall.tsx` and expect no output.

- [ ] **Step 6: Commit**

```bash
git add components/ImageWall.tsx components/home/HomeContent.tsx lib/i18n.ts
git commit -m "feat: replace the pinned gallery with a multi-speed parallax image wall

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7 (controller): browser check.** Visible Chrome, home at 1200 / 768 / 375:
  - `?scope=kitchen|wardrobe|all` gives 6 / 9 / 12 tiles in the visible variant.
  - Columns are aligned at mid-section (y about 0) and the middle column moves most.
  - Flooring tiles are at most 375 px wide.
  - One column at 375.
  - `.pin-spacer` count = 2 (the two pinned sections below still exist).
  - No horizontal scroll, TH↔EN captions switch.
  - Reduced motion simulated: no column transforms.
  - Console clean.

---

### Task 2: Story rows and featured block replace the last two pinned sections

**Files:**
- Modify: `components/home/HomeContent.tsx` (header comment, imports, add `STORY_IMAGES`, `StoryText()`, `StoryRows()`, `FeaturedProducts()`, `HomeContent()` body)
- Modify: `lib/i18n.ts` (delete `home.storyKicker`, `home.featuredKicker`, `home.featuredHint` in `th` and `en`; rewrite two story bodies in each language)
- Delete: `components/PinnedStory.tsx`, `components/HorizontalGallery.tsx`

**Interfaces:**
- Consumes: `ImageWall` (Task 1); `ParallaxImage({ label, ratio, speed?, dark?, className? })`; `Reveal({ children, className?, delay?, y? })`; `ProductCard({ product })`; `Placeholder({ label, ratio? })`; `featuredProducts: Product[]` (4 items); `t.home.storySlides[{ title, body }]`, `t.home.featuredTitle`, `t.common.viewAll`.
- Produces: nothing new outside the file.

- [ ] **Step 1: Imports and header in `components/home/HomeContent.tsx`**

Header comment becomes:
`// หน้าแรก: hero → ผนังภาพ parallax → เรื่องราว → สินค้าเด่น → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA (ไม่มี section ไหน pin)`

Delete these two imports:
```tsx
import PinnedStory from '@/components/PinnedStory';
import HorizontalGallery from '@/components/HorizontalGallery';
```
Add after `import ParallaxImage from '@/components/ParallaxImage';`:
```tsx
import ProductCard from '@/components/ProductCard';
import Placeholder from '@/components/Placeholder';
```

- [ ] **Step 2: Add the new sections above `function Stats()`**

```tsx
// ภาพประกอบเรื่องราวยังเป็น placeholder (ลำดับตรงกับ t.home.storySlides)
const STORY_IMAGES = ['เรื่องราว ภาพ 01 (โชว์รูม)', 'เรื่องราว ภาพ 02 (สัมผัสจริง)', 'เรื่องราว ภาพ 03 (ทีมติดตั้ง)'];

function StoryText({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h2 className="mb-4 text-2xl font-extralight tracking-wide md:text-3xl">{title}</h2>
      <p className="text-sm font-light leading-relaxed text-warm-500">{body}</p>
    </>
  );
}

// เรื่องราว: 2 แถวแรกภาพสลับซ้าย-ขวา แถวที่ 3 ภาพเต็มความกว้างแล้วข้อความใต้ภาพ (ไม่ zigzag เกิน 2 แถว)
// ภาพ parallax ในกรอบ + ข้อความ reveal (เหตุผล: ภาพเลื่อนช้ากว่ากรอบให้ความลึกเหมือนผนังภาพด้านบน)
function StoryRows() {
  const { t } = useLang();
  const slides = t.home.storySlides;
  const last = slides[slides.length - 1];
  return (
    <section className="space-y-24 px-6 py-24 md:space-y-40 md:px-[8vw] md:py-40">
      {slides.slice(0, -1).map((s, i) => (
        <div key={i} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
          <ParallaxImage
            label={STORY_IMAGES[i]}
            ratio="3/2"
            className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}
          />
          <Reveal className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
            <StoryText title={s.title} body={s.body} />
          </Reveal>
        </div>
      ))}
      <div>
        <ParallaxImage label={STORY_IMAGES[slides.length - 1]} ratio="21/9" />
        <Reveal className="mt-8 max-w-[65ch]">
          <StoryText title={last.title} body={last.body} />
        </Reveal>
      </div>
    </section>
  );
}

// สินค้าเด่น: สินค้าหลักใบใหญ่ + อีก 3 ชิ้นเป็นรายการ (ไม่ซ้ำแบบการ์ดเท่ากันของบทความ)
// reveal ใบหลักก่อนแล้วรายการทีละแถว (เหตุผล: ลำดับความสำคัญ สินค้าหลักมาก่อน)
function FeaturedProducts() {
  const { lang, t } = useLang();
  const [lead, ...rest] = featuredProducts;
  return (
    <section className="border-t border-warm-200 px-6 py-24 md:px-[8vw] md:py-32">
      <Reveal className="mb-14 flex items-end justify-between gap-6">
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.featuredTitle}</h2>
        <Link
          href="/products/"
          className="shrink-0 text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
        >
          {t.common.viewAll} →
        </Link>
      </Reveal>
      <div className="grid gap-12 md:grid-cols-12 md:gap-16">
        <Reveal className="md:col-span-7">
          <ProductCard product={lead} />
        </Reveal>
        <ul className="divide-y divide-warm-200 md:col-span-5 md:self-center">
          {rest.map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={i * 0.1} y={20}>
                <Link href={`/products/${p.slug}/`} className="group flex items-center gap-5 py-6">
                  <div className="w-24 shrink-0 overflow-hidden md:w-28">
                    <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                      <Placeholder label={p.images[0]} ratio="1/1" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-light tracking-wide">{p.name[lang]}</h3>
                    <p className="mt-1 text-[12px] font-light text-warm-500">{p.price[lang]}</p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
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
      <FeaturedProducts />
      <Stats />
      <CatalogTeaser />
      <LatestPosts />
      <ContactCta />
    </>
  );
}
```

- [ ] **Step 4: i18n in `lib/i18n.ts`**

Delete both occurrences (th and en) of each of these exact lines:
```ts
      featuredKicker: 'FEATURED COLLECTION',
```
```ts
      storyKicker: 'OUR STORY',
```
Delete these two exact lines (one per language):
```ts
      featuredHint: 'เลื่อนลงเพื่อชมสินค้า — แนวนอน',
```
```ts
      featuredHint: 'Keep scrolling — the gallery moves sideways',
```
Rewrite these four story bodies (old → new, exact):
- `'กว่า 25 ปีที่เราคัดสรรชุดครัวและอุปกรณ์ครัวด้วยเกณฑ์เดียว — ต้องเป็นชิ้นที่เราอยากใช้ในบ้านของเราเอง'` → `'กว่า 25 ปีที่เราคัดสรรชุดครัวและอุปกรณ์ครัวด้วยเกณฑ์เดียว คือต้องเป็นชิ้นที่เราอยากใช้ในบ้านของเราเอง'`
- `'ทีมช่างของเราเองดูแลตั้งแต่วัดหน้างาน ติดตั้ง จนถึงบริการหลังการขาย — รับประกันชิ้นงานสูงสุด 10 ปี'` → `'ทีมช่างของเราเองดูแลตั้งแต่วัดหน้างาน ติดตั้ง จนถึงบริการหลังการขาย พร้อมรับประกันชิ้นงานสูงสุด 10 ปี'`
- `'For over 25 years we have curated kitchen pieces with a single criterion — would we want this in our own home?'` → `'For over 25 years we have curated kitchen pieces with a single criterion: would we want this in our own home?'`
- `'Our own team handles survey, installation and after-sales care — with warranties of up to 10 years.'` → `'Our own team handles survey, installation and after-sales care, with warranties of up to 10 years.'`

- [ ] **Step 5: Delete the old components**

Run: `git rm components/PinnedStory.tsx components/HorizontalGallery.tsx`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^.next/types'` and expect no output.
Run: `npm run build` and expect success.
Run: `grep -rn 'PinnedStory\|HorizontalGallery\|featuredHint\|featuredKicker\|storyKicker' app components lib` and expect no output.
Run: `node -e "const s=require('fs').readFileSync('lib/i18n.ts','utf8');const m=s.match(/storySlides: \[[\s\S]*?\]/g);console.log(m.some(x=>/[—–]/.test(x)))"` and expect `false`.

- [ ] **Step 7: Commit**

```bash
git add components/home/HomeContent.tsx lib/i18n.ts
git commit -m "feat: replace the pinned story and product rail with parallax rows and a featured block

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8 (controller): browser check.** Visible Chrome, home at 1200 / 768 / 375:
  - `.pin-spacer` count = 0.
  - Story rows 1-2 alternate image left/right at md+; row 3 is a full-width 21:9 image with text below; mobile stacks image then text.
  - Story images move inside their frames at md+.
  - Featured: lead card left (7 cols) + 3-row list right (5 cols) at md+; mobile shows the lead then the list; every row links to its product.
  - "View all →" goes to `/products/`.
  - Taste checks on the three new sections: no `—`/`–` in rendered text, no eyebrow above headlines.
  - TH↔EN keeps the layout.
  - Reduced motion simulated: everything static and visible.
  - No horizontal scroll, console clean, screenshot.
