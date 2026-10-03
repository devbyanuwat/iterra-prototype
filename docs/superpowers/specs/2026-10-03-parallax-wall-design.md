# Parallax image wall — design

Date: 2026-10-03 · Branch: `preview-parallax-wall` (from `preview-initial` @ `0fabf4d`) · Approved in chat by anuwat.
Experimental branch: if the owner prefers the pinned version, `preview-initial` stays untouched.
Revised the same day with the owner's `taste-skill` (`~/.claude/skills/taste-skill`), approved in chat.

## Goal

Replace the three pinned home sections under the hero with a scroll-driven, multi-speed parallax layout
inspired by the owner's reference clip (layers moving up at different speeds). The hero video is not touched.
Keep the existing motion stack: Lenis `lerp 0.08` on `gsap.ticker` + ScrollTrigger `scrub` inside
`gsap.matchMedia`, reduced motion respected everywhere.

## Design read and dials (taste-skill)

Reading this as: redesign-preserve of a premium kitchen dealer home page for Thai homeowners and architects,
with an editorial premium-consumer language, leaning toward the existing Tailwind 3 + GSAP ScrollTrigger + Lenis
stack and the site's own tokens.

`DESIGN_VARIANCE 7` · `MOTION_INTENSITY 8` · `VISUAL_DENSITY 3`.
Redesign-preserve: brand tokens (`paper`, `ink`, `warm-*`), Inter + Noto Sans Thai and `font-light` stay.

Rules applied to the new sections:
- Every animation states its reason in one code comment; nothing animates "for show".
- No eyebrow (small uppercase label above a headline) in the three new sections.
- No section-number labels, no em-dash (`—`) or en-dash separators in any string these sections render.
- Max 2 consecutive image/text zigzag rows.
- No two sections share a layout family (the posts section is already an equal-card grid).
- Asymmetric layouts collapse to a single column below 768 px.

## Home order

Hero → **ImageWall** → **StoryRows** → **FeaturedProducts** → Stats → CatalogTeaser → LatestPosts → ContactCta

No section pins any more. `ScrollGallery`, `PinnedStory`, `HorizontalGallery` and the i18n keys
`home.galleryKicker`, `home.storyKicker`, `home.featuredKicker`, `home.featuredHint` (th + en) are deleted.

## 1. ImageWall (replaces ScrollGallery)

- `bg-ink text-paper`, header is the `t.home.galleryTitle` h2 only.
- Items: `galleryFor(useScope())`: 6 / 9 / 12 images for `?scope=kitchen|wardrobe|all` (default kitchen).
- `md+`: 3 columns, item `i` goes to column `i % 3`. Images keep their real aspect
  (`width`/`height` from `GalleryItem`, `h-auto w-full`), so columns stagger naturally.
- Below 768 px: one column, images in order.
- Caption under each image (`item.caption[lang]`); image `alt=""` because the caption is adjacent.
- Flooring stills (375 px sources) are capped at `max-w-[375px]` and centered: never stretched.
- Parallax (only motion in this section; reason: depth, the layered look of the reference clip), desktop only,
  `(prefers-reduced-motion: no-preference) and (min-width: 768px)`:
  each column gets `gsap.fromTo(col, { y: +d }, { y: -d, ease: 'none', scrollTrigger: { trigger: section,
  start: 'top bottom', end: 'bottom top', scrub: true } })` with column speeds left slow / middle fast /
  right medium. Symmetric travel keeps columns aligned at mid-scroll. The section is `overflow-hidden`
  so a moving column can never overlap the next section; bottom padding gives it room.
- Mobile and reduced motion: static, no transforms.

## 2. StoryRows (replaces PinnedStory)

- `bg-paper text-ink`, three items from `t.home.storySlides`, keyed by index, no kicker labels.
- Items 1 and 2: `ParallaxImage` (existing; placeholder labels as today) + text block with `Reveal`,
  alternating image left / right at `md+`.
- Item 3: full-width `ParallaxImage` at 21:9 with the text block stacked below (`max-w-[65ch]`),
  breaking the zigzag after two rows.
- Mobile: image then text for every item.
- Copy: rewrite the two story bodies that use `—` (th + en) with a comma, colon or plain wording.
- Story images remain labeled placeholders: the catalog has no showroom or install-team photos.

## 3. FeaturedProducts (replaces HorizontalGallery)

- Header: `t.home.featuredTitle` h2 + `t.common.viewAll →` link to `/products/`, no eyebrow.
- Featured-vs-rest: first of `featuredProducts` as a large `ProductCard` (`md:col-span-7`), the other three as a
  list on the right (`md:col-span-5`): small square placeholder thumbnail, name, price, link to the product.
- Mobile: lead card, then the list.
- Motion: `Reveal` on the lead and on each list row (reason: hierarchy, lead first).

## Verification (every task)

`tsc` (ignoring stale `.next/types`), `npm run build`, then in a **visible** Chrome:
1200 px and 768 px and 375 px, TH ↔ EN, `?scope=kitchen|wardrobe|all`, reduced motion simulated
(matchMedia rewrite + strip `no-preference` CSS rules), zero `.pin-spacer` on home, no horizontal scroll,
zero console errors, screenshot. Taste-skill checks on the new sections: no `—`/`–` in their rendered text,
no eyebrow above their headlines, one column below 768 px.

## Deferred (taste-skill findings outside this scope, owner decides later)

- Hero: "เลื่อนเพื่อชม" scroll cue, `h-screen` instead of `100dvh`, EN `heroSub` contains `—`.
- Eyebrows on CatalogTeaser and LatestPosts sit next to each other; page total stays over 1 per 3 sections.
- LatestPosts is a 3 equal-card grid.
- Other `—`: EN `ctaSub`, `products.sub`, contact `toast`.
- No dark mode on the site.
- Dark/light section alternation (wall dark, story light, CTA dark) is the site's existing pattern, kept.

## Out of scope

Hero, Nav, CatalogTeaser, LatestPosts, ContactCta, other pages, `main`, `preview-initial`, new dependencies, deploy.
