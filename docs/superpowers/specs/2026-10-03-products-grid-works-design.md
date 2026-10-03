# Product grid, demo finishes, works page and photo CTA — design

Date: 2026-10-03 · Branch: `preview-products-works` (from `preview-kohler-products` @ `b33f3e5`) · Approved in chat by
anuwat ("ทำได้", then "ทำได้" for the CTA as task 4). No PR; the branch stays next to the others for comparison.

## Goal

Four changes to the ITERRA prototype:

1. Product detail pages of faucets let the visitor pick a finish. KOHLER Thailand sells one finish per model, so the
   extra finishes are demo samples and are labeled as such.
2. `/products/` becomes an item list: breadcrumb, filter sidebar, count, sort and a card grid with finish dots. The
   featured lead and the zigzag rows are removed.
3. A new `/works/` page ("ผลงานการติดตั้ง") with grey frames waiting for photos, a nav item, a home strip.
4. The home contact CTA gets a kitchen photo background so it no longer blends into the footer (both were flat `bg-ink`).

## Design read (design-taste-frontend skill, owner asked for it)

Redesign in preserve mode: premium kitchen-dealer marketing site for design-conscious homeowners, editorial showroom
language, existing tokens (paper, ink, warm-100..500, stone) and GSAP motion. Dials match the existing site
(variance 6, motion 6, density 3). The owner's reference image (e-commerce list page) is the structural reference for
`/products/`; colours, type and sharp corners stay ITERRA's.

Rules taken from the skill for this work:

- No em-dash or en-dash in any new rendered string.
- No new eyebrow labels except one per page header. No numbered labels ("01"). At most one middle dot per line.
- Shape lock: frames, buttons and inputs are sharp-cornered; only finish dots are circles.
- Every button has a visible focus state and a pressed state (`active:scale-[0.98]`).
- Navigation stays on one line at 768 px and up.
- Motion must have a reason: the finish change cross-fades (state change); cards do not get per-card scroll reveals.
- Empty state for the filter result.

## Source facts (kohler.co.th, read 2026-10-03)

- Every SKU has one finish (`variantList.sku_ss` length 1, `Color.SKU.Details_ss` length 1) for all 10 products.
- Series = `ProductBrandName_s`: Elate, Kumin, Taut, Toccata, Indio, Marcato.
- `ProductMaterial_s`: Brass (Elate 13963T), stainless steel (Toccata ×2, Marcato), Cast Iron (Indio), empty for the
  other five faucets. `lib/products.ts` already carries a "วัสดุ: ทองเหลือง" spec row for four of those five (from
  Kohler's descriptions). Kumin 99480T has no material anywhere, so it has no material and is not matched by the
  material filter.

## 1. Demo finishes

`lib/finishes.ts` (new), marked MOCK:

| id | name th / en | real? | tint (CSS filter on the cut-out image) |
|---|---|---|---|
| chrome | โครเมียมขัดเงา / Polished Chrome | real | none |
| black | ดำด้าน / Matte Black | demo | `brightness(.38) contrast(1.15) saturate(0)` |
| brass | ทองเหลืองแปรง / Brushed Brass | demo | `sepia(1) saturate(1.7) hue-rotate(-8deg) brightness(.92)` |
| steel | สเตนเลสแปรง / Brushed Stainless | demo | `saturate(0) brightness(.82) contrast(.9)` |

Sinks get one real finish and no choice: stainless (`สเตนเลสสตีล / Stainless Steel`) or, for cast iron, white
(`ขาว / White`). `finishesFor(product)` returns the list. Tint values are a starting point; the controller tunes them
in the browser.

How the tint reaches the image: `Placeholder`'s `contain` image gets `[filter:var(--tint,none)]` plus a 500 ms
`transition-[filter]` (off under reduced motion). A wrapper sets `--tint` inline. `cover` images (lifestyle scenes)
are never tinted.

`components/FinishDots.tsx` (new): one circle per finish, `aria-pressed`, name as `aria-label` and `title`
(demo finishes add "(สีตัวอย่าง)"). Sizes: `md` 28 px dot in a 44 px button (detail), `sm` 16 px dot in a 32 px
button (card). A single finish renders a plain labeled dot, not a button. Swatch colours are real metal colours, not
theme tokens (documented exception).

Detail page (`ProductDetail`), faucets only: under the price, heading "สีผิว / Finish", the dots, the selected name
with "มีจำหน่าย / Available" or "สีตัวอย่าง / Sample finish", and the note "สีตัวอย่างใช้แสดงภาพเท่านั้น KOHLER
Thailand จำหน่ายรุ่นนี้เฉพาะโครเมียมขัดเงา". The spec table keeps the real colour.

## 2. `/products/` item list

Data: `Product` gains `series: string` and `material?: 'brass' | 'stainless' | 'castIron'`. `lib/products.ts` also
exports `FACETS`, `Picked` and `filterProducts(list, picked)`: inside a facet values are OR-ed, facets are AND-ed, an
empty facet does not filter. `scripts/check-filter.mjs` (`npm run check:filter`, Node type stripping) asserts that
logic against the real product list.

Page (`ProductsContent`, client state only, not in the URL):

- Breadcrumb "หน้าแรก / สินค้า", then the existing kicker, title and subtitle.
- Left, `lg` and up: sticky "กรองตาม" column with three checkbox groups (หมวด, ซีรีส์, วัสดุ), each option with its
  product count, and "ล้างตัวกรอง" when anything is picked. Below `lg`: the same groups inside a native `<details>`
  labeled "ตัวกรอง".
- Right: "พบ N รายการ" (`aria-live`), a native `<select>` sort (แนะนำ = featured first, ชื่อ, หมวด), then the grid:
  1 column, 2 from `sm`, 3 from `xl`.
- No match: "ไม่พบสินค้าตามตัวกรองที่เลือก" with a clear button.

Card (`ProductCard`, also used on the home page and in related products): image link (hidden from assistive tech as
a duplicate), category, name as the real link, finish dots, price text. Dots sit outside the links, so no nested
interactive elements. Picking a dot tints that card's image only; it does not carry to the detail page.

`t.products.featured` is removed (its only user was the old lead).

## 3. `/works/`

- `lib/works.ts` (new, MOCK): six sample works. Names are a job type plus a district ("คอนโดมิเนียม", "ย่านสุขุมวิท
  กรุงเทพฯ"), never a real project or client. Each has a year, an optional `image` and two product slugs.
- `app/works/page.tsx` (metadata) + `components/WorksContent.tsx`: page header, then a two-column staggered list
  (right column pushed down; one column on mobile). Each item: `ParallaxImage` with no `src` (grey labeled frame
  "รอภาพผลงาน") or the photo once `image` is set, a "type · year" line, the name, the district, and "สินค้าที่ใช้"
  linking to the product pages.
- Nav: "ผลงาน / Works" after "สินค้า" (desktop and mobile). Desktop gap becomes `gap-4` below `lg` so seven items fit
  on one line at 768 px in both languages; links get `whitespace-nowrap`.
- Home: a text strip after the stats (title, one line, "ดูผลงานทั้งหมด"), no grey frame on the home page.
- Footer link, sitemap entry, README rows for `lib/works.ts` and `lib/finishes.ts`.

## 4. Photo CTA on the home page

`ContactCta` keeps its copy and centered layout. Background: `/media/scenes/showroom-kitchen-at-home-2.webp` (wooden
table close-up, not a room shown elsewhere on the home page) under a flat `bg-ink/70` layer. Sub text goes from
`text-paper/60` to `text-paper/85`, the button border from `paper/50` to `paper/60`. Contrast is measured from
screenshot pixels, not computed from opacity. The footer is not touched.

## Verification (every task)

`npx tsc --noEmit` (ignoring stale `.next/types`), `npm run build`, `npm run check:overflow`, the U+0E4E scan, and
from task 2 on `npm run check:filter`. Controller browser checks at 1200, 768 and 375 px, TH and EN: detail page with
each finish, `/products/` unfiltered, filtered and empty, `/works/`, the nav on one line, the home CTA with measured
contrast.

## Out of scope

Compare, pagination, price filter, filters in the URL, carrying a card's finish to the detail page, finish choice for
sinks, per-work detail pages, real work photos, Hero, catalog page, ImageWall, spec table, Footer design, new npm
dependencies, deploy, PR, merge.
