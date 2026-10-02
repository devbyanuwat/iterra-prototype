# Kitchen-only Media Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kitchen-only ITERRA showroom with a video hero, a previewable/downloadable Kohler Kitchens catalog, a pinned scroll gallery of catalog photography, and an editorial products page.

**Architecture:** Static-export Next.js 16 app (`output: 'export'`). Media is produced once by `scripts/build-media.sh` from source files in `~/Downloads` into `public/media/`. Motion reuses the existing stack: Lenis (`SmoothScroll.tsx`) on `gsap.ticker` + ScrollTrigger inside `gsap.matchMedia`, always gated on `(prefers-reduced-motion: no-preference)`.

**Tech Stack:** Next.js 16.3 (Turbopack, static export), React 19, GSAP 3 + ScrollTrigger, Lenis 1, Tailwind 3. Media tools already installed: `ffmpeg`, `pdftoppm`, `pdfimages`, `cwebp`, `qpdf`, Python 3 + Pillow.

**Spec:** `docs/superpowers/specs/2026-10-03-kitchen-media-rebuild-design.md`

## Global Constraints

- Branch `preview-initial`. One commit per task, only after its verification passes. Never touch `main`.
- No new npm dependencies. No new system tools.
- Source media is never committed. Only outputs under `public/media/`.
- Theme tokens only: `paper` `#faf9f7`, `ink` `#1c1917`, `warm-100..500`, `tracking-widest2`. No raw hex in components.
- Every GSAP effect lives inside `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; desktop-only motion adds `and (min-width: 768px)`. Cleanup is `return () => mm.revert()`.
- List keys must never be translated strings (see the `PinnedStory.tsx` header comment — GSAP inline styles are lost on remount).
- Bilingual copy: every new string goes in `lib/i18n.ts` under both `th` and `en`.
- Static export: read URL params in `useEffect` via `window.location.search` (same as `ProductsContent.tsx`), not `useSearchParams`.
- Verification per task: `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/' | grep -c error` prints `0`; `npm run build` succeeds; browser check at 1280 px and 375 px, TH↔EN switch, zero console errors.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

Source paths used by the media script:

```
VIDEO_SRC="$HOME/Downloads/All VDO /Serier B - NaturaLux.m4v"
PDF_SRC="$HOME/Downloads/KOHLER KITCHENS 2026 (Kitchens & Wardrobes Thailand by DP Ceramic).pdf"
STILLS_SRC="$HOME/Downloads/drive-download-20261002T172632Z-1-001"
```

---

### Task 1: Remove Bath

**Files:**
- Modify: `lib/products.ts` (drop 5 bath products, `Category` = `'kitchen'`)
- Modify: `lib/posts.ts` (drop post `bathroom-into-spa`)
- Modify: `lib/i18n.ts`, `lib/site.ts`
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/products/page.tsx`, `app/about/page.tsx`, `app/contact/page.tsx`, `app/articles/page.tsx`, `app/products/[slug]/page.tsx`
- Modify: `components/ProductsContent.tsx`, `components/ContactContent.tsx`, `components/home/HomeContent.tsx`

**Interfaces:**
- Produces: `type Category = 'kitchen'`; `products` has 7 kitchen items; `HomeContent` no longer renders `CategoryBand` (Task 3 puts the catalog teaser in that slot).

- [ ] **Step 1: Record the failing check**

Run: `grep -rniE 'bath|สุขภัณฑ์|ห้องน้ำ|ฝักบัว|shower|toilet|basin' app components lib | wc -l`
Expected: a number > 0 (currently ~40).

- [ ] **Step 2: Data**

`lib/products.ts`: change line 7 to `export type Category = 'kitchen';` and delete the five objects with `category: 'bath'` (`smart-toilet-one`, `rain-shower-cloud`, `basin-stone-oval`, `faucet-basin-minimal`, `bathtub-freestand-arc`).

`lib/posts.ts`: delete the object with `slug: 'bathroom-into-spa'`.

- [ ] **Step 3: Copy (`lib/i18n.ts`, `lib/site.ts`)**

`lib/site.ts`:
```ts
export const SITE_TAGLINE_TH = 'อุปกรณ์และชุดครัวพรีเมียม';
export const SITE_TAGLINE_EN = 'Premium Kitchens';
```

`lib/i18n.ts` — TH:
```ts
category: { all: 'ทั้งหมด', kitchen: 'ครัว' } as Record<string, string>,
heroKicker: 'PREMIUM KITCHEN DEALER',
heroSub: 'คัดสรรชุดครัวและอุปกรณ์ครัวจากแบรนด์ชั้นนำระดับโลก สำหรับบ้านที่ไม่ประนีประนอมเรื่องดีไซน์',
```
Delete `catTitle`, `catSub`, `catKitchen`, `catKitchenDesc`, `catBath`, `catBathDesc` (TH and EN).
Story slide 1 body: `'กว่า 25 ปีที่เราคัดสรรชุดครัวและอุปกรณ์ครัวด้วยเกณฑ์เดียว — ต้องเป็นชิ้นที่เราอยากใช้ในบ้านของเราเอง'`
Story slide 2 body: `'ทุกก๊อกเปิดได้ ทุกเตาเปิดไฟได้ ทุกลิ้นชักเปิดปิดให้ฟังเสียง เพราะของพรีเมียมต้องพิสูจน์ได้ด้วยการสัมผัส'`
`products.sub`: `'ชุดครัวและอุปกรณ์ครัวคัดสรร 7 รายการ — ทุกชิ้นสัมผัสจริงได้ที่โชว์รูม'`
`footer.blurb`: `'ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม คัดสรรจากแบรนด์ชั้นนำระดับโลก'`

EN:
```ts
category: { all: 'All', kitchen: 'Kitchen' } as Record<string, string>,
heroKicker: 'PREMIUM KITCHEN DEALER',
heroSub: 'A curated selection of kitchens and kitchen equipment from the world’s finest brands — for homes that never compromise on design.',
```
Story slide 1 body: `'For over 25 years we have curated kitchen pieces with a single criterion — would we want this in our own home?'`
Story slide 2 body: `'Every faucet runs, every hob fires up, every drawer glides. Premium quality should be proven by touch.'`
`products.sub`: `'Seven curated kitchen pieces — every one on display at our showroom.'`
`footer.blurb`: `'Premium kitchen dealer, curated from the world’s finest brands.'`

- [ ] **Step 4: Metadata and JSON-LD**

- `app/layout.tsx` description: `'ITERRA ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม คัดสรรซิงก์ ก๊อก เตา เครื่องใช้บิลท์อิน และชุดครัวสั่งตัดจากแบรนด์ชั้นนำระดับโลก พร้อมโชว์รูมให้สัมผัสจริงในกรุงเทพฯ'`; OG description `'คัดสรรชุดครัวและอุปกรณ์ครัวจากแบรนด์ชั้นนำระดับโลก'`; JSON-LD description `'ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม'`.
- `app/page.tsx`: title `` `ITERRA — ${SITE_TAGLINE_TH} | ${SITE_TAGLINE_EN}` `` (import from `@/lib/site`); description `'คัดสรรซิงก์ ก๊อกครัว เตาแม่เหล็กไฟฟ้า และชุดครัวบิลท์อินพรีเมียมจากแบรนด์ชั้นนำระดับโลก สัมผัสจริงได้ที่โชว์รูม ITERRA กรุงเทพฯ'`.
- `app/products/page.tsx`: title `'สินค้าทั้งหมด — ชุดครัวและอุปกรณ์ครัวพรีเมียม'`; description `'ชมสินค้าคัดสรรทั้ง 7 รายการของ ITERRA — ซิงก์สเตนเลส ก๊อกครัว เตาแม่เหล็กไฟฟ้า เตาอบ เครื่องล้างจาน และชุดครัวบิลท์อิน'`.
- `app/about/page.tsx`: description → `'…ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม…'`; section 3 body `'เราจัดโชว์รูมเป็นห้องครัวขนาดเท่าของจริง…'` (drop `และห้องน้ำ`).
- `app/contact/page.tsx`: `…โชว์รูมชุดครัวและอุปกรณ์ครัวพรีเมียมในกรุงเทพฯ…`.
- `app/articles/page.tsx`: `'รวมบทความไอเดียครัวจากทีม ITERRA — …'`.
- `app/products/[slug]/page.tsx` line 37: `category: 'Kitchen Equipment',`.

- [ ] **Step 5: Components**

`components/ProductsContent.tsx`: delete the filter (single category). Remove `useEffect`, `useState`, the `filters` row and the `Filter` type; render `products` directly. Header comment becomes `// หน้าสินค้ารวม: grid สินค้าครัว + 3D tilt` (Task 5 replaces this layout).

`components/ContactContent.tsx`: delete the `interest` state, the `useEffect` line that sniffs `bath|basin|toilet|shower`, and the `<select>` block with its label (one category = nothing to choose). Keep the `useEffect` cleanup for `timer`.

`components/home/HomeContent.tsx`: delete `CategoryBand` and its usage; remove the now-unused `ParallaxImage` import only if nothing else uses it (`LatestPosts` still does — keep it). Update the header comment: `// หน้าแรก: hero → horizontal gallery → pinned story → สถิติ → บทความล่าสุด → CTA`.

- [ ] **Step 6: Verify**

Run: `grep -rniE 'bath|สุขภัณฑ์|ห้องน้ำ|ฝักบัว|shower|toilet|basin' app components lib | wc -l` → `0`
Run: tsc check from Global Constraints → `0`; `npm run build` → success, and `out/products/` contains 7 product folders: `ls out/products | wc -l` → `8` (7 + index.html).
Browser: `/`, `/products/`, `/contact/`, `/articles/` render; TH↔EN; no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A app components lib
git commit -m "feat: make the showroom kitchen-only"
```

---

### Task 2: Video hero

**Files:**
- Create: `scripts/build-media.sh` (hero section only in this task; Tasks 3–4 append)
- Create: `public/media/hero/hero.mp4`, `hero.webm`, `hero.jpg`
- Modify: `components/Hero.tsx`

**Interfaces:**
- Produces: `scripts/build-media.sh <hero|catalog|gallery|all>`; `/media/hero/hero.{mp4,webm,jpg}`.

- [ ] **Step 1: Media script (hero)**

```bash
#!/usr/bin/env bash
# สร้างไฟล์สื่อสำหรับเว็บจากต้นฉบับใน ~/Downloads (ต้นฉบับไม่เข้า git)
# ใช้: scripts/build-media.sh hero|catalog|gallery|all
set -euo pipefail
cd "$(dirname "$0")/.."

VIDEO_SRC="$HOME/Downloads/All VDO /Serier B - NaturaLux.m4v"
PDF_SRC="$HOME/Downloads/KOHLER KITCHENS 2026 (Kitchens & Wardrobes Thailand by DP Ceramic).pdf"
STILLS_SRC="$HOME/Downloads/drive-download-20261002T172632Z-1-001"

# ช่วงครัวล้วน (เขียง ลิ้นชักหม้อ ลิ้นชักขนมปัง) — ไม่มีโลโก้/ซับจีน
HERO_START=42
HERO_LEN=15

hero() {
  local out=public/media/hero
  mkdir -p "$out"
  ffmpeg -v error -y -ss "$HERO_START" -t "$HERO_LEN" -i "$VIDEO_SRC" -an \
    -vf "scale=1920:-2,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
    -movflags +faststart "$out/hero.mp4"
  ffmpeg -v error -y -ss "$HERO_START" -t "$HERO_LEN" -i "$VIDEO_SRC" -an \
    -vf "scale=1920:-2,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 "$out/hero.webm"
  ffmpeg -v error -y -ss "$HERO_START" -i "$VIDEO_SRC" -frames:v 1 \
    -vf "scale=1920:-2,format=yuvj420p" -q:v 4 "$out/hero.jpg"
  ls -la "$out"
}

case "${1:-all}" in
  hero) hero ;;
  all) hero ;;
  *) echo "usage: $0 hero|catalog|gallery|all" >&2; exit 1 ;;
esac
```

Run: `chmod +x scripts/build-media.sh && scripts/build-media.sh hero`
Expected: `hero.mp4` and `hero.webm` each ≤ 5 MB. If one is larger, raise its CRF by 2 and rerun.

- [ ] **Step 2: Hero component**

In `components/Hero.tsx`:
1. Replace layer 1's `<Placeholder fill dark label="ภาพครัว HERO 16:9" />` with:
```tsx
<video
  ref={video}
  className="absolute inset-0 h-full w-full object-cover"
  poster="/media/hero/hero.jpg"
  muted
  loop
  playsInline
  preload="metadata"
  aria-hidden
>
  <source src="/media/hero/hero.webm" type="video/webm" />
  <source src="/media/hero/hero.mp4" type="video/mp4" />
</video>
```
2. Delete layer 2 (the floating `ภาพสินค้า HERO 4:5` placeholder) — the video carries the hero now. Remove the `Placeholder` import.
3. Add `const video = useRef<HTMLVideoElement>(null);` and, inside the existing `useEffect` before `return`, play only with motion allowed and only while on screen:
```ts
const v = video.current;
let io: IntersectionObserver | undefined;
mm.add('(prefers-reduced-motion: no-preference)', () => {
  if (!v) return;
  io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()));
  io.observe(v);
  return () => { io?.disconnect(); v.pause(); };
});
```
4. Header comment: `// Hero: วิดีโอครัวเล่นวน (ไม่มีเสียง) เป็นพื้นหลัง + parallax/scale ตาม scroll` and `// reduced-motion: แสดง poster นิ่ง ไม่เล่นวิดีโอ · เลื่อนพ้นจอแล้วหยุดเล่น`.

- [ ] **Step 3: Verify**

tsc → `0`; build OK. Browser: on `/`, `document.querySelector('video').paused === false` at the top and `true` after scrolling two screens down, then `false` again back at the top. Reduced motion cannot be emulated in the pane — confirm by code review that `play()` is only reachable inside the `(prefers-reduced-motion: no-preference)` branch and the element has no `autoPlay` attribute, so the poster stays. Text over video readable (gradient overlay kept). Screenshot at 1280 and 375.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-media.sh public/media/hero components/Hero.tsx
git commit -m "feat: play a kitchen film behind the hero"
```

---

### Task 3: Catalog page

**Files:**
- Modify: `scripts/build-media.sh` (add `catalog`)
- Create: `public/media/catalog/p01.webp…p49.webp`, `t01.webp…t49.webp`, `kohler-kitchens-2026.pdf`
- Create: `lib/catalog.ts`, `components/CatalogViewer.tsx`, `components/CatalogTeaser.tsx`, `app/catalog/page.tsx`
- Modify: `components/Nav.tsx`, `components/home/HomeContent.tsx`, `lib/i18n.ts`, `app/sitemap.ts`

**Interfaces:**
- Produces: `CATALOG = { pages: 49, pdf: '/media/catalog/kohler-kitchens-2026.pdf', pdfSizeMB: number, page(n): string, thumb(n): string }` from `lib/catalog.ts`; `<CatalogViewer />`; `<CatalogTeaser />`; i18n block `catalog`.

- [ ] **Step 1: Media script (catalog)**

Add to `scripts/build-media.sh`:
```bash
catalog() {
  local out=public/media/catalog tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  pdftoppm -r 150 -jpeg -jpegopt quality=82 "$PDF_SRC" "$tmp/p"
  local i=0
  for f in "$tmp"/p-*.jpg; do
    i=$((i+1)); n=$(printf '%02d' "$i")
    cwebp -quiet -q 78 -resize 1600 0 "$f" -o "$out/p$n.webp"
    cwebp -quiet -q 70 -resize 360 0 "$f" -o "$out/t$n.webp"
  done
  # PDF สำหรับดาวน์โหลด: ประกอบจากภาพหน้า 150dpi (ไม่มี Ghostscript — ข้อความเลือกไม่ได้)
  python3 - "$tmp" "$out/kohler-kitchens-2026.pdf" <<'PY'
import sys, glob
from PIL import Image
pages = [Image.open(f).convert('RGB') for f in sorted(glob.glob(sys.argv[1] + '/p-*.jpg'))]
pages[0].save(sys.argv[2], save_all=True, append_images=pages[1:], resolution=150, quality=80)
PY
  rm -rf "$tmp"
  du -sh "$out" "$out/kohler-kitchens-2026.pdf"
}
```
and `catalog) catalog ;;`, `all) hero; catalog ;;` in the `case`.

Run: `scripts/build-media.sh catalog`
Expected: 49 `p*.webp`, 49 `t*.webp`, PDF 10–25 MB. If the PDF exceeds 25 MB, drop render to `-r 120` and rerun.

- [ ] **Step 2: `lib/catalog.ts`**

```ts
// แคตตาล็อก KOHLER Kitchens 2026 — ไฟล์สร้างโดย scripts/build-media.sh catalog
const pad = (n: number) => String(n).padStart(2, '0');

export const CATALOG = {
  pages: 49,
  pdf: '/media/catalog/kohler-kitchens-2026.pdf',
  pdfSizeMB: 0, // ใส่ขนาดจริงจาก `du -m` หลังรัน script
  page: (n: number) => `/media/catalog/p${pad(n)}.webp`,
  thumb: (n: number) => `/media/catalog/t${pad(n)}.webp`,
};
```
Set `pdfSizeMB` to the integer from `du -m public/media/catalog/kohler-kitchens-2026.pdf`.

- [ ] **Step 3: i18n**

Add to `nav`: TH `catalog: 'แคตตาล็อก'`, EN `catalog: 'Catalog'`. Add top-level `catalog` block:
```ts
// th
catalog: {
  kicker: 'KOHLER KITCHENS 2026',
  title: 'แคตตาล็อกครัวและตู้เสื้อผ้า',
  sub: 'เปิดดูทุกหน้าได้ที่นี่ หรือดาวน์โหลดเก็บไว้อ่านทีหลัง',
  download: 'ดาวน์โหลด PDF',
  open: 'เปิดดูแคตตาล็อก',
  page: 'หน้า',
  of: 'จาก',
  close: 'ปิด',
  prev: 'หน้าก่อน',
  next: 'หน้าถัดไป',
},
// en
catalog: {
  kicker: 'KOHLER KITCHENS 2026',
  title: 'Kitchens & Wardrobes Catalog',
  sub: 'Browse every page here, or download it to read later.',
  download: 'Download PDF',
  open: 'Browse the catalog',
  page: 'Page',
  of: 'of',
  close: 'Close',
  prev: 'Previous page',
  next: 'Next page',
},
```
Add `{ href: '/catalog/', key: 'catalog' }` to `LINKS` in `components/Nav.tsx` between products and articles.

- [ ] **Step 4: `components/CatalogViewer.tsx`**

```tsx
'use client';

// แคตตาล็อก: grid ภาพย่อทุกหน้า → กดแล้วเปิดดูเต็มจอ
// ปุ่มก่อน/ถัดไป · คีย์ ← → Esc · ปัดซ้าย/ขวาบนมือถือ · ล็อก scroll ของ Lenis ระหว่างเปิด

import { useCallback, useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogViewer() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(null); // เลขหน้า 1..49
  const go = useCallback(
    (d: number) => setOpen((n) => (n === null ? n : Math.min(CATALOG.pages, Math.max(1, n + d)))),
    [],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, go]);

  const touchX = useRef(0);
  const pages = Array.from({ length: CATALOG.pages }, (_, i) => i + 1);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {pages.map((n) => (
          <Reveal key={n} delay={(n % 5) * 0.05} y={20}>
            <button type="button" onClick={() => setOpen(n)} className="group block w-full text-left">
              <div className="overflow-hidden bg-warm-100">
                <img
                  src={CATALOG.thumb(n)}
                  alt={`${t.catalog.page} ${n}`}
                  loading="lazy"
                  className="aspect-[1.414/1] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest2 text-warm-500">
                {String(n).padStart(2, '0')}
              </p>
            </button>
          </Reveal>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${t.catalog.page} ${open} ${t.catalog.of} ${CATALOG.pages}`}
          data-lenis-prevent
          className="fixed inset-0 z-[70] flex flex-col bg-ink/95 text-paper"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between px-6 py-5 text-[11px] uppercase tracking-widest2">
            <span>
              {t.catalog.page} {open} {t.catalog.of} {CATALOG.pages}
            </span>
            <div className="flex items-center gap-6">
              <a href={CATALOG.pdf} download className="underline-offset-8 hover:underline">
                {t.catalog.download}
              </a>
              <button type="button" onClick={() => setOpen(null)} aria-label={t.catalog.close} className="text-2xl font-extralight">
                ×
              </button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-6 md:px-20">
            <img
              key={open}
              src={CATALOG.page(open)}
              alt={`${t.catalog.page} ${open}`}
              className="max-h-full max-w-full object-contain shadow-2xl shadow-black/50"
            />
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={open === 1}
              aria-label={t.catalog.prev}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 px-4 py-6 text-3xl font-extralight disabled:opacity-20 md:block"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={open === CATALOG.pages}
              aria-label={t.catalog.next}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 px-4 py-6 text-3xl font-extralight disabled:opacity-20 md:block"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```
Note: Lenis keeps scrolling while `overflow: hidden` is set on `<html>` only if it was constructed with default options; `data-lenis-prevent` on the dialog stops wheel events reaching it. Verify in Step 7 that the page behind does not move while the viewer is open.

- [ ] **Step 5: `app/catalog/page.tsx` + page content**

```tsx
import type { Metadata } from 'next';
import CatalogContent from '@/components/CatalogContent';

export const metadata: Metadata = {
  title: 'แคตตาล็อก KOHLER Kitchens 2026',
  description: 'เปิดดูและดาวน์โหลดแคตตาล็อกครัวและตู้เสื้อผ้า KOHLER Kitchens 2026 ฉบับเต็ม 49 หน้า',
  alternates: { canonical: '/catalog/' },
};

export default function CatalogPage() {
  return <CatalogContent />;
}
```
Create `components/CatalogContent.tsx`:
```tsx
'use client';

// หน้าแคตตาล็อก: หัวเรื่อง + ปุ่มดาวน์โหลด + grid ทุกหน้า

import Reveal from './Reveal';
import CatalogViewer from './CatalogViewer';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogContent() {
  const { t } = useLang();
  return (
    <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.catalog.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        </div>
        <a
          href={CATALOG.pdf}
          download
          className="inline-block shrink-0 border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
        >
          {t.catalog.download} · {CATALOG.pdfSizeMB} MB
        </a>
      </Reveal>
      <CatalogViewer />
    </section>
  );
}
```
Add `'/catalog/'` to `staticPages` in `app/sitemap.ts`.

- [ ] **Step 6: Home teaser `components/CatalogTeaser.tsx`**

```tsx
'use client';

// หน้าแรก: แถบชวนเปิดแคตตาล็อก — ปกเลื่อน parallax เล็กน้อย + ปุ่มเปิดดู/ดาวน์โหลด

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';

export default function CatalogTeaser() {
  const { t } = useLang();
  return (
    <section className="grid items-center gap-12 px-6 py-24 md:grid-cols-[1.3fr_1fr] md:px-[8vw] md:py-32">
      <Reveal>
        <Link href="/catalog/" className="group block overflow-hidden">
          <img
            src={CATALOG.page(1)}
            alt={t.catalog.title}
            loading="lazy"
            className="aspect-[1.414/1] w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
          />
        </Link>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.catalog.title}</h2>
        <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/catalog/"
            className="inline-block border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
          >
            {t.catalog.open}
          </Link>
          <a
            href={CATALOG.pdf}
            download
            className="inline-block px-2 py-3.5 text-[11px] uppercase tracking-widest2 text-warm-500 underline-offset-8 hover:text-ink hover:underline"
          >
            {t.catalog.download}
          </a>
        </div>
      </Reveal>
    </section>
  );
}
```
In `HomeContent`, render `<CatalogTeaser />` after `<Stats />`.

- [ ] **Step 7: Verify**

tsc → `0`; build OK; `ls out/catalog/index.html`. Browser `/catalog/`: 49 thumbnails; open page 1, → to page 2, Esc closes; background does not scroll while open; Download link returns 200 (`read_network_requests` after `fetch(CATALOG.pdf, {method:'HEAD'})`). Mobile 375: swipe left/right changes page (simulate via JS `TouchEvent`). TH↔EN labels switch. Home teaser shows cover and links work.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-media.sh public/media/catalog lib/catalog.ts lib/i18n.ts components/CatalogViewer.tsx components/CatalogContent.tsx components/CatalogTeaser.tsx components/Nav.tsx components/home/HomeContent.tsx app/catalog app/sitemap.ts
git commit -m "feat: add the Kohler Kitchens catalog with page viewer and PDF download"
```

---

### Task 4: Scroll gallery + scope switch

**Files:**
- Modify: `scripts/build-media.sh` (add `gallery`)
- Create: `public/media/gallery/*.webp`
- Create: `lib/gallery.ts`, `lib/scope.ts`, `components/ScrollGallery.tsx`
- Modify: `components/home/HomeContent.tsx`, `lib/i18n.ts`

**Interfaces:**
- Produces: `type Scope = 'kitchen' | 'wardrobe' | 'all'`; `useScope(): Scope` (reads `?scope=`, default `'kitchen'`); `GALLERY: GalleryItem[]` with `{ src: string; group: 'kitchen' | 'wardrobe' | 'flooring'; caption: { th: string; en: string } }`; `galleryFor(scope: Scope): GalleryItem[]`.

- [ ] **Step 1: Media script (gallery)**

Picked from `pdfimages -list` (page-index → name). Add:
```bash
gallery() {
  local out=public/media/gallery tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  pdfimages -png -p "$PDF_SRC" "$tmp/i"
  # page-index:name — เลือกจาก contact sheet (ภาพเต็ม ไม่มี mask ดำ)
  local picks=(
    049-143:k-dining 021-063:k-timber 024-070:k-dusk 027-077:k-night 031-088:k-blue 041-117:k-stone
    043-122:w-amber 047-133:w-glass 016-049:w-suite
  )
  local src w
  for p in "${picks[@]}"; do
    src="$tmp/i-${p%%:*}.png"
    # ย่อเฉพาะภาพที่กว้างเกิน 2400 — ห้ามขยายภาพ 1490px ขึ้น
    w=$(python3 -c "from PIL import Image; print(min(2400, Image.open('$src').width))")
    cwebp -quiet -q 80 -resize "$w" 0 "$src" -o "$out/${p##*:}.webp"
  done
  for n in 13 14 15; do cwebp -quiet -q 85 "$STILLS_SRC/$n.png" -o "$out/f-$n.webp"; done
  rm -rf "$tmp"
  ls -la "$out"
}
```
Add `gallery) gallery ;;` and `all) hero; catalog; gallery ;;` to the `case`.

Run: `scripts/build-media.sh gallery` → 9 large `.webp` + 3 `f-*.webp`; total < 6 MB.

- [ ] **Step 2: `lib/scope.ts`**

```ts
'use client';

// ตัวสลับขอบเขตเนื้อหาไว้เทียบ 3 แบบ: ?scope=kitchen | wardrobe | all (ค่าเริ่ม kitchen)
// static export อ่าน query ใน useEffect เหมือน ProductsContent

import { useEffect, useState } from 'react';

export type Scope = 'kitchen' | 'wardrobe' | 'all';
const SCOPES: Scope[] = ['kitchen', 'wardrobe', 'all'];

export function useScope(): Scope {
  const [scope, setScope] = useState<Scope>('kitchen');
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('scope') as Scope | null;
    if (s && SCOPES.includes(s)) setScope(s);
  }, []);
  return scope;
}
```

- [ ] **Step 3: `lib/gallery.ts`**

```ts
import type { Scope } from './scope';

export type GalleryItem = {
  src: string;
  group: 'kitchen' | 'wardrobe' | 'flooring';
  caption: { th: string; en: string };
};

const g = (name: string) => `/media/gallery/${name}.webp`;

export const GALLERY: GalleryItem[] = [
  { src: g('k-dining'), group: 'kitchen', caption: { th: 'ครัวเปิดต่อโต๊ะอาหาร', en: 'Open kitchen, dining island' } },
  { src: g('k-timber'), group: 'kitchen', caption: { th: 'ไม้โทนเข้มกับแสงธรรมชาติ', en: 'Dark timber, daylight' } },
  { src: g('k-dusk'), group: 'kitchen', caption: { th: 'ไอส์แลนด์ขาวยามเย็น', en: 'White island at dusk' } },
  { src: g('k-night'), group: 'kitchen', caption: { th: 'ครัววิวเมืองยามค่ำ', en: 'City view after dark' } },
  { src: g('k-blue'), group: 'kitchen', caption: { th: 'ชั้นเปิดโทนฟ้า', en: 'Open shelving in blue' } },
  { src: g('k-stone'), group: 'kitchen', caption: { th: 'หินและไม้', en: 'Stone and wood' } },
  { src: g('w-amber'), group: 'wardrobe', caption: { th: 'ตู้เสื้อผ้าไฟอำพัน', en: 'Amber-lit wardrobe' } },
  { src: g('w-glass'), group: 'wardrobe', caption: { th: 'ตู้บานกระจก', en: 'Glass-front wardrobe' } },
  { src: g('w-suite'), group: 'wardrobe', caption: { th: 'ห้องนอนและตู้บิลท์อิน', en: 'Bedroom with built-ins' } },
  { src: g('f-13'), group: 'flooring', caption: { th: 'WATERSHIELD ห้องแต่งตัว', en: 'WATERSHIELD dressing room' } },
  { src: g('f-14'), group: 'flooring', caption: { th: 'WATERSHIELD ห้องนอน', en: 'WATERSHIELD bedroom' } },
  { src: g('f-15'), group: 'flooring', caption: { th: 'WATERSHIELD ห้องนั่งเล่น', en: 'WATERSHIELD living room' } },
];

const GROUPS: Record<Scope, GalleryItem['group'][]> = {
  kitchen: ['kitchen'],
  wardrobe: ['kitchen', 'wardrobe'],
  all: ['kitchen', 'wardrobe', 'flooring'],
};

export const galleryFor = (scope: Scope) => GALLERY.filter((i) => GROUPS[scope].includes(i.group));
```

- [ ] **Step 4: i18n**

```ts
// th, under home
galleryKicker: 'KOHLER KITCHENS',
galleryTitle: 'พื้นที่ที่ออกแบบมาเพื่อชีวิตจริง',
// en, under home
galleryKicker: 'KOHLER KITCHENS',
galleryTitle: 'Spaces designed for real life',
```

- [ ] **Step 5: `components/ScrollGallery.tsx`**

Desktop: section pinned for `(n - 1) * 100%` of scroll. All frames stack in one 100vh box; frame `i>0` starts `clipPath: inset(100% 0 0 0)` and its image at `scale 1.15`; each step reveals the next frame (clip to `inset(0)`) while its image settles to `scale 1`, the previous image drifts to `scale 1.06` and its caption fades up and out. `scrub: 1` on top of Lenis gives the ultrasmooth feel. Flooring frames (375 px sources) render inside a centered 40vw card on the `ink` background instead of full-bleed.
Mobile / reduced motion: no pin; frames stack vertically with `Reveal`.

```tsx
'use client';

// แกลเลอรีภาพจากแคตตาล็อก: pin แล้วเผยภาพทีละภาพด้วย clip-path + scale 1.15 → 1 (scrub บน Lenis)
// มือถือ / reduced-motion: เรียงภาพลงมาธรรมดา ไม่ pin
// key ใช้ src (ไม่ใช่ข้อความแปล) — ดู PinnedStory เรื่อง GSAP inline style หายตอน remount
// refreshPriority 1: section นี้อยู่บนสุดในบรรดา pin ของหน้าแรก ต้องวัดก่อน pin ด้านล่าง

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { useScope } from '@/lib/scope';
import { galleryFor, type GalleryItem } from '@/lib/gallery';

function Frame({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  const small = item.group === 'flooring';
  return (
    <div data-frame className="absolute inset-0 overflow-hidden bg-ink">
      {small ? (
        <div className="flex h-full items-center justify-center">
          <img data-img src={item.src} alt={item.caption[lang]} className="w-[40vw] max-w-md shadow-2xl shadow-black/50" />
        </div>
      ) : (
        <img data-img src={item.src} alt={item.caption[lang]} className="h-full w-full object-cover will-change-transform" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden />
      <p data-cap className="absolute bottom-12 left-[8vw] text-sm font-light tracking-wide text-paper/85">
        {item.caption[lang]}
      </p>
    </div>
  );
}

export default function ScrollGallery() {
  const root = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();
  const scope = useScope();
  const items = galleryFor(scope);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const frames = gsap.utils.toArray<HTMLElement>('[data-frame]', el);
      const imgs = frames.map((f) => f.querySelector<HTMLElement>('[data-img]')!);
      const caps = frames.map((f) => f.querySelector<HTMLElement>('[data-cap]')!);

      gsap.set(frames.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(imgs.slice(1), { scale: 1.15 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${(frames.length - 1) * window.innerHeight}`,
          pin: true,
          scrub: 1,
          refreshPriority: 1,
          invalidateOnRefresh: true,
        },
      });
      for (let i = 1; i < frames.length; i++) {
        tl.to(frames[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i - 1)
          .to(imgs[i], { scale: 1, duration: 1 }, i - 1)
          .to(imgs[i - 1], { scale: 1.06, duration: 1 }, i - 1)
          .to(caps[i - 1], { opacity: 0, y: -30, duration: 0.5 }, i - 1)
          .fromTo(caps[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, i - 0.5);
      }
    });
    return () => mm.revert();
  }, [items.length]);

  return (
    <section className="bg-ink text-paper">
      <div className="px-6 pb-12 pt-24 md:px-[8vw] md:pt-32">
        <Reveal>
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-paper/50">{t.home.galleryKicker}</p>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.galleryTitle}</h2>
        </Reveal>
      </div>
      {/* เดสก์ท็อป: pinned */}
      <div ref={root} className="relative hidden h-screen md:block">
        {items.map((item) => (
          <Frame key={item.src} item={item} lang={lang} />
        ))}
      </div>
      {/* มือถือ: เรียงลงมา */}
      <div className="space-y-6 px-6 pb-20 md:hidden">
        {items.map((item) => (
          <Reveal key={item.src}>
            <img src={item.src} alt={item.caption[lang]} loading="lazy" className="w-full" />
            <p className="mt-3 text-[12px] font-light text-paper/70">{item.caption[lang]}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```
Desktop note: `hidden md:block` is fine — the matchMedia branch only runs at ≥768 px where the pinned box is displayed.

- [ ] **Step 6: Mount**

`HomeContent`: `<Hero />` → `<ScrollGallery />` → `<HorizontalGallery …/>` → `<PinnedStory />` → `<Stats />` → `<CatalogTeaser />` → `<LatestPosts />` → `<ContactCta />`.

- [ ] **Step 7: Verify**

tsc → `0`; build OK. Browser 1280: scroll through the gallery — at each step exactly one frame is fully revealed, no frame stacks after TH↔EN switch, HorizontalGallery and PinnedStory below still pin at the right place (their `ScrollTrigger.getAll()` `start` values increase monotonically and match section offsets). `?scope=kitchen` → 6 frames, `?scope=wardrobe` → 9, `?scope=all` → 12 (count `[data-frame]`). 375 px: stacked, no pin. Screenshots of one mid-reveal and one settled frame.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-media.sh public/media/gallery lib/gallery.ts lib/scope.ts lib/i18n.ts components/ScrollGallery.tsx components/home/HomeContent.tsx
git commit -m "feat: add a pinned scroll gallery of catalog photography with a scope switch"
```

---

### Task 5: Editorial products layout

**Files:**
- Modify: `components/ProductsContent.tsx`
- Modify: `lib/i18n.ts` (`products.featured` label)

**Interfaces:**
- Consumes: `products`, `ParallaxImage`, `Reveal`, `ProductCard` (unchanged).

- [ ] **Step 1: Layout**

Replace the grid with:
1. Header (kicker/title/sub, unchanged copy).
2. **Featured row** — first `featured` product, full width: `ParallaxImage ratio="21/9"` with the name, desc and "→" link over a bottom gradient.
3. **Alternating rows** — remaining products; each row is a 12-col grid, image spans 7 cols (`ParallaxImage ratio="4/5"`, `speed` ±7 alternating), text spans 4 cols with 1-col gap, sides swap every row (`md:order-2` on the image for odd rows). Text: category kicker, name (`text-3xl font-extralight`), desc, price, "→" link to detail.
4. Mobile: rows collapse to image-then-text, no order swap.

```tsx
'use client';

// หน้าสินค้ารวมแบบ editorial: สินค้าเด่นเต็มความกว้าง → แถวภาพ/ข้อความสลับซ้าย–ขวา
// ภาพ parallax เลื่อนสวนทิศทีละแถว + reveal (เดสก์ท็อป) · มือถือเรียงภาพแล้วข้อความ

import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import { useLang } from './LangProvider';
import { products } from '@/lib/products';

export default function ProductsContent() {
  const { lang, t } = useLang();
  const [lead, ...rest] = [...products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

  return (
    <>
      <section className="px-6 pb-12 pt-36 md:px-[8vw] md:pb-16 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.products.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.products.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 md:px-[8vw]">
        <Reveal>
          <Link href={`/products/${lead.slug}/`} className="group relative block">
            <ParallaxImage label={lead.images[0]} ratio="21/9" speed={-6} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-6 text-paper md:p-12">
              <p className="mb-2 text-[10px] uppercase tracking-widest2 text-paper/70">{t.products.featured}</p>
              <h2 className="text-2xl font-extralight tracking-wide md:text-4xl">{lead.name[lang]}</h2>
              <p className="mt-3 hidden max-w-xl text-sm font-light leading-relaxed text-paper/80 md:block">{lead.desc[lang]}</p>
            </div>
          </Link>
        </Reveal>
      </section>

      <section className="space-y-24 px-6 py-24 md:space-y-36 md:px-[8vw] md:py-36">
        {rest.map((p, i) => (
          <div key={p.slug} className="grid items-center gap-8 md:grid-cols-12 md:gap-0">
            <Reveal className={`md:col-span-7 ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}>
              <Link href={`/products/${p.slug}/`} className="block">
                <ParallaxImage label={p.images[0]} ratio="4/5" speed={i % 2 ? 7 : -7} />
              </Link>
            </Reveal>
            <Reveal delay={0.12} className={`md:col-span-4 ${i % 2 ? 'md:order-1 md:col-start-1' : 'md:col-start-9'}`}>
              <p className="text-[10px] uppercase tracking-widest2 text-warm-500">{t.common.category[p.category]}</p>
              <h2 className="mt-3 text-3xl font-extralight leading-snug tracking-wide">{p.name[lang]}</h2>
              <p className="mt-5 text-sm font-light leading-loose text-stone-600">{p.desc[lang]}</p>
              <p className="mt-5 text-sm font-light">{p.price[lang]}</p>
              <Link
                href={`/products/${p.slug}/`}
                className="mt-8 inline-block text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
              >
                {t.common.readMore} →
              </Link>
            </Reveal>
          </div>
        ))}
      </section>
    </>
  );
}
```
i18n: TH `products.featured: 'สินค้าเด่น'`, EN `products.featured: 'Featured'`.
Note `ParallaxImage` only takes ratios `'16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4'` — `21/9` and `4/5` are valid.

- [ ] **Step 2: Verify**

tsc → `0`; build OK. Browser `/products/` at 1280: featured band full width, rows alternate sides, parallax moves on scroll; 375: stacked. All 7 product links open their detail page. TH↔EN.

- [ ] **Step 3: Commit**

```bash
git add components/ProductsContent.tsx lib/i18n.ts
git commit -m "feat: give the products page an editorial layout"
```
