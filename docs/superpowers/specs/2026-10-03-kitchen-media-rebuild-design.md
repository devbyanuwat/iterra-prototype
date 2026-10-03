# Kitchen-only media rebuild — design

Date: 2026-10-03 · Branch: `preview-initial` (from `3e4fe9c`, the first main commit) · Approved in chat by anuwat.

## Goal

Turn the placeholder prototype into a kitchen-only showroom built on real Kohler Kitchens media,
keeping the existing ultrasmooth motion (Lenis `lerp 0.08` on `gsap.ticker` + ScrollTrigger + `gsap.matchMedia`,
reduced-motion respected everywhere).

## Source assets (outside the repo — never committed)

| Asset | Path | Notes |
|---|---|---|
| Videos | `~/Downloads/All VDO /` | Hero uses `Serier B - NaturaLux.m4v` (1080p, 194 s, 56 MB, no subtitles) |
| Catalog | `~/Downloads/KOHLER KITCHENS 2026 (Kitchens & Wardrobes Thailand by DP Ceramic).pdf` | 49 pages, 89.7 MB, ~70 embedded images ≥1200 px |
| Stills | `~/Downloads/drive-download-20261002T172632Z-1-001/1..15.png` | All 375×281. 1 = Kohler Kitchens logo, 12 = dp logo, 13–15 = dp WATERSHIELD flooring/living |

`scripts/build-media.sh` turns these into web assets under `public/media/`. Re-runnable; outputs are committed, sources are not.

## Scope switch

One build, three content scopes for comparison, chosen by `?scope=` (default `kitchen`):

- `kitchen` — kitchen imagery only
- `wardrobe` — kitchen + wardrobe imagery from the catalog
- `all` — adds the dp WATERSHIELD stills (375 px, shown small, never full-bleed)

The scope only changes which images the scroll gallery shows. Products, copy and catalog are the same in every scope.
The catalog is always the full book.

## Work units (one commit each, in order)

### 1. Remove Bath
- `lib/products.ts`: drop the 5 `bath` products; `Category` becomes kitchen-only.
- Copy: `lib/i18n.ts`, `lib/site.ts`, `lib/posts.ts`, page metadata, JSON-LD — kitchen wording only.
- Home `CategoryBand` and products filter lose the Bath entry.
- Reference: `a371d49` on main did the same cut.
- Done when `grep -rniE 'bath|สุขภัณฑ์|ห้องน้ำ' app components lib` returns nothing and every page renders.

### 2. Video hero
- Cut ~15 s of kitchen shots from NaturaLux → `hero.mp4` (H.264) + `hero.webm` (VP9), 1080p, ≤ 5 MB each, no audio; `hero.jpg` poster.
- `Hero.tsx` layer 1: `<video muted loop playsInline autoPlay preload="metadata" poster>` replaces the placeholder. Parallax depth + scroll scale unchanged.
- Pause when off-screen (IntersectionObserver). Reduced motion: poster only, no autoplay.

### 3. Catalog
- `public/media/catalog/p01..p49.webp` (≈1600 px long edge) + `t01..t49.webp` thumbnails.
- Download PDF rebuilt from 150 dpi page renders (no Ghostscript on this machine): target 15–20 MB. Text is not selectable — accepted.
- New `/catalog` page: intro + thumbnail grid → full-screen viewer (prev/next buttons, ←/→/Esc keys, swipe, page counter), Download button.
- Nav link + a home teaser section linking to `/catalog`.

### 4. Scroll gallery
- Extract high-res photos with `pdfimages`, pick and tag each as `kitchen` or `wardrobe`, encode to WebP (≤ 2400 px).
- New home section, desktop: pinned; each image reveals by clip-path + scale 1.15 → 1 with caption parallax, `scrub` on Lenis. Mobile: plain stacked reveals, no pin.
- Pinned ScrollTriggers get explicit `refreshPriority` so pins below measure correctly.

### 5. Products layout
- `/products`: editorial layout — one featured product full width, then alternating image/text rows with parallax + reveal. No category filter (single category).
- Home `HorizontalGallery` stays.

## Verification (every unit)
`tsc` (ignoring stale `.next/types`), `next build`, then in the browser: desktop + mobile width, TH and EN switch, reduced motion, zero console errors, screenshot.

## Out of scope
`main`, deploy, new tools/dependencies, Plane cards (repo has no Plane project).
