# Real Kohler kitchen products and photos — design

Date: 2026-10-03 · Branch: `preview-kohler-products` (from `preview-parallax-wall` @ `4bad79e`) · Approved in chat by anuwat
("ทำได้หมดเลย ยกเว้น pr"): no PR, the branches stay side by side for comparison.

## Goal

Replace the 7 mock products with the 10 kitchen products Kohler Thailand actually lists (6 faucets, 4 sinks),
with their own photos cut out of the white background. Products Kohler TH does not sell (hob, hood, oven,
dishwasher, built-in kitchen set) are removed. Every remaining image slot except the contact map gets a real
kitchen photo from the KOHLER Kitchens 2026 catalog PDF already used for the gallery.

## Source facts (kohler.co.th, read 2026-10-03)

- Kitchen = `/browse/kitchen/Categories/kitchen-faucets` (6) + `kitchen-sinks` (4). Nothing else.
- Product data: `__NEXT_DATA__.props.pageProps.pdpData` on `/product-details/<slug>?sku=<sku>` (th) and
  `/en/product-details/...` (en).
- **Colour / material:** every SKU has exactly one variant (`variantList.sku_ss` length 1). Faucets are Polished
  Chrome only (`-CP`), stainless sinks have no colour (`NA`), the Indio cast-iron sink is White (`-0`). The site
  shows no swatch selector. So: no colour or material switcher in the UI; finish and material are spec rows.
- Prices: the site shows none (buttons are find-a-store / enquire). Keep "สอบถามราคา / Price on request".
  `Color.GST.Details_ss` carries list prices for 3 SKUs (13963T 19,970 · 99480T 6,700 · 30946T 5,850 THB);
  not shown, owner decides later.
- Images: scene7 CDN. Elate 13963T has 4 images; its images 2-4 are 679 px lifestyle photos letterboxed on
  white. Every other SKU has 1 packshot on white. `fmt=png-alpha` and the `_product` layer are not transparent,
  so the cut-out is done locally.

## Products

Slug = Kohler's slug. Category is now `'faucet' | 'sink'` (was `'kitchen'`); `t.common.category` gets
`faucet` / `sink` labels. Featured (4, lead first): Elate 13963T, Indio, Taut 21366T, Toccata 3645X.
Exact names, descriptions and spec rows live in the plan (Task 2).

| slug | category | images | scenes |
|---|---|---|---|
| elate-13963t-c4 | faucet | 1 | 3 (Elate lifestyle 2-4) |
| kumin-99480t-4 | faucet | 1 | 0 |
| elate-15609x-4 | faucet | 1 | 0 |
| taut-21370t-4cd | faucet | 1 | 0 |
| kumin-30946t-4 | faucet | 1 | 0 |
| taut-21366t-4 | faucet | 1 | 0 |
| toccata-3644x-2kd | sink | 1 | 0 |
| indio-3885x-2sd | sink | 1 | 0 |
| toccata-3645x-2kd | sink | 1 | 0 |
| marcato-3676x-2kd | sink | 1 | 0 |

"Only what exists": a product detail gallery shows its own images and nothing else (most show one image).

## Media pipeline (`scripts/build-media.sh`, sources stay out of git)

- `products`: curl each scene7 asset as PNG at native size or 1600 px, whichever is smaller (per-asset query in
  the script) → `scripts/cutout.swift` (macOS Vision `VNGenerateForegroundInstanceMaskRequest`, cropped to the
  product) → `cwebp -q 85 -alpha_q 90`, long edge ≤ 1200 → `public/media/products/<slug>-1.webp`.
  Elate lifestyle 2-4: trim the white letterbox (`magick -fuzz 3% -trim`), no cut-out →
  `public/media/products/elate-13963t-c4-scene-{2,3,4}.webp`.
- `scenes`: `pdfimages` from the catalog PDF, 23 hand-picked kitchen photos (no people, no collages, none already
  in the gallery) → `cwebp -q 80`, width ≤ 1800 → `public/media/scenes/<slot>.webp`.
- Known ceiling: Vision fills small enclosed holes (sink tap holes, drain holes) with the old white. Invisible on
  the light product surface; product cut-outs are therefore shown on `bg-warm-100`, and only the clean Elate
  faucet sits on the dark products-page lead.

## Scene slots

| slot | PDF image | used by |
|---|---|---|
| story-1 / story-2 / story-3 | 022-066 / 022-065 / 020-061 | home StoryRows (3/2, 3/2, 21/9) |
| about-hero, about-1..4 | 001-000, 023-068, 028-078, 021-064, 025-073 | about page (21/9, then 4/5 ×4) |
| showroom-kitchen-at-home (+ -1, -2) | 035-099, 023-067, 025-072 | post cover 16/9, inline 3/2 ×2 |
| matte-black-kitchen | 041-115, 007-030, 042-118 | same |
| induction-vs-gas | 036-101, 032-090, 019-055 | same |
| small-condo-kitchen | 015-048, 032-091, 030-084 | same |
| stainless-sink-guide | 020-059, 036-100, 027-076 | same |

Scene images are decorative next to their headline (`alt=""`), like the ImageWall.

## Components

- `Placeholder` gains `src?: string` and `fit?: 'cover' | 'contain'` (default `cover`). With `src` it renders an
  `<img alt={label} loading="lazy" decoding="async">` in the same ratio box: `object-cover`, or `object-contain`
  with `p-[10%]` on `bg-warm-100` (`bg-ink` when `dark`). Without `src` it stays the labeled placeholder.
- `ParallaxImage` passes `src` and `fit` through. No other prop or motion change.
- Product type: `images: string[]` (cut-outs, `contain`) + `scenes?: string[]` (lifestyle, `cover`).
  ProductCard, the home featured list, the products page and the detail gallery use them; alt is the product name.
- Post type: `cover` becomes a path, new `inline: [string, string]` replaces the label strings the article page
  built from the cover.

## Kitchen-only home wall (added in chat, approved)

- The ImageWall keeps only its 6 kitchen photos. The 3 wardrobe and 3 WATERSHIELD flooring photos, their files, the
  `group` field and the `?scope=kitchen|wardrobe|all` switch (`lib/scope.ts`) are deleted: with one group left there
  is nothing to switch.
- Wall heading "พื้นที่ที่ออกแบบมาเพื่อชีวิตจริง / Spaces designed for real life" (doubled "ที่ที่", and "space" is
  wider than kitchens) becomes **"ครัวที่ออกแบบมาให้ใช้ทุกวัน / Kitchens made for everyday cooking"** (owner's pick).
- The catalog page and PDF stay exactly as they are (owner: "แคตตาล็อกคงไว้แบบเดิม").

## Verification (every task)

`tsc` (ignoring stale `.next/types`), `npm run build`, `npm run check:overflow` (all pages × 375/768/1024/1200 ×
motion/reduced), plus screenshots in visible Chrome of home (featured + story), `/products/`, one faucet and one
sink detail page, `/articles/` + one article, `/about/`, TH and EN. Zero 404s for media (the overflow gate fails on
console errors).

## Deferred (owner decides later)

- Copy that still names products the store no longer lists: story body "ทุกเตาเปิดไฟได้ / every hob fires up",
  the `induction-vs-gas` article, the condo article's built-in appliance tips.
- Showing Kohler's list prices.
- The products page now has 9 zigzag rows (was 6); taste-skill caps zigzag at 2, out of scope here.
- Elate lifestyle photos are 679 px wide: soft on 2× screens.
- Rights: product photos and model names belong to Kohler; fine for the prototype, production use needs the
  dealer agreement.

## Out of scope

Hero, Nav, ImageWall motion and kitchen photos, CatalogTeaser, the catalog page and PDF, contact map, `main`, `preview-initial`, `preview-parallax-wall`, new npm
dependencies, deploy, PR.
