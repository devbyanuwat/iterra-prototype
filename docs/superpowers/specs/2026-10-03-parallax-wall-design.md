# Parallax image wall — design

Date: 2026-10-03 · Branch: `preview-parallax-wall` (from `preview-initial` @ `0fabf4d`) · Approved in chat by anuwat.
Experimental branch: if the owner prefers the pinned version, `preview-initial` stays untouched.

## Goal

Replace the three pinned home sections under the hero with a scroll-driven, multi-speed parallax layout
inspired by the owner's reference clip (layers moving up at different speeds). The hero video is not touched.
Keep the existing motion stack: Lenis `lerp 0.08` on `gsap.ticker` + ScrollTrigger `scrub` inside
`gsap.matchMedia`, reduced motion respected everywhere.

## Home order

Hero → **ImageWall** → **StoryRows** → **FeaturedGrid** → Stats → CatalogTeaser → LatestPosts → ContactCta

No section pins any more. `ScrollGallery`, `PinnedStory`, `HorizontalGallery` and the i18n key
`home.featuredHint` (th + en) are deleted on this branch.

## 1. ImageWall (replaces ScrollGallery)

- `bg-ink text-paper`, header reuses `t.home.galleryKicker` / `t.home.galleryTitle`.
- Items: `galleryFor(useScope())` — 6 / 9 / 12 images for `?scope=kitchen|wardrobe|all` (default kitchen).
- Columns: 3 at `md+`, 2 below. Item `i` goes to column `i % cols`. Images keep their real aspect
  (`width`/`height` from `GalleryItem`, `h-auto w-full`), so columns stagger naturally.
- Caption under each image (`t`-independent: `item.caption[lang]`); image `alt=""` because the caption is adjacent.
- Flooring stills (375 px sources) are capped at `max-w-[375px]` and centered in their cell — never stretched.
- Parallax (desktop only, `(prefers-reduced-motion: no-preference) and (min-width: 768px)`):
  each column gets `gsap.fromTo(col, { y: +d }, { y: -d, ease: 'none', scrollTrigger: { trigger: section,
  start: 'top bottom', end: 'bottom top', scrub: true } })` with column speeds left slow / middle fast /
  right medium. Symmetric travel keeps columns aligned at mid-scroll; the section adds bottom padding
  ≥ the largest travel so the fast column never overlaps the next section.
- Mobile (< 768 px) and reduced motion: static grid, no transforms.

## 2. StoryRows (replaces PinnedStory)

- `bg-paper text-ink`. Kicker `t.home.storyKicker` + three rows from `t.home.storySlides`, keyed by index.
- Each row: `ParallaxImage` (existing component; placeholder labels as today) + text block with `Reveal`.
  Rows alternate image left / right at `md+` (12-col grid), stack image → text on mobile.

## 3. FeaturedGrid (replaces HorizontalGallery)

- Header `t.home.featuredKicker` / `t.home.featuredTitle` + `t.common.viewAll` link to `/products/`.
- `featuredProducts` (4) rendered with the existing `ProductCard`, grid 2 cols mobile / 4 cols `md+`,
  each wrapped in `Reveal` with a small stagger.

## Verification (every task)

`tsc` (ignoring stale `.next/types`), `npm run build`, then in a **visible** Chrome:
1200 px and 768 px and 375 px, TH ↔ EN, `?scope=kitchen|wardrobe|all`, reduced motion simulated
(matchMedia rewrite + strip `no-preference` CSS rules), zero `.pin-spacer` on home, no horizontal scroll,
zero console errors, screenshot.

## Out of scope

Hero, Nav, other pages, `main`, `preview-initial`, new dependencies, deploy.
