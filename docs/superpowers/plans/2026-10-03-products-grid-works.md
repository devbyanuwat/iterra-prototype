# Product grid, demo finishes, works page and photo CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faucet detail pages preview sample finishes, `/products/` becomes a filterable item grid, a new `/works/` page lists installation works with grey frames, and the home contact CTA gets a kitchen photo background.

**Architecture:** All state is client-side `useState` in existing client components; no routing or data-fetching changes. Finish tint travels as a CSS variable (`--tint`) from a wrapper to the cut-out `<img>` inside `Placeholder`. Filter logic is a pure function in `lib/products.ts` with a Node self-check.

**Tech Stack:** Next.js 16.3 static export, React 19, Tailwind 3.4 (tokens: paper, ink, warm-100..500, stone), GSAP ScrollTrigger (existing `Reveal`, `ParallaxImage`, `TiltCard`), Node 22.

**Spec:** `docs/superpowers/specs/2026-10-03-products-grid-works-design.md`

## Global Constraints

- Repo `/Users/anuwatttttt/Documents/Dev/iterra/iterra-prototype`, branch `preview-products-works`. Do not switch branches, push, amend or use force flags.
- No new npm dependencies.
- Theme tokens only (paper, ink, warm-100..500, stone). The one exception: finish swatch colours in `lib/finishes.ts`.
- No em-dash (`—`) or en-dash (`–`) in any new rendered string.
- Copy every Thai string from this plan character for character (Edit `new_string` / Write content). Never retype Thai. After editing, this scan must print nothing:
  `perl -CSD -ne 'print "$ARGV:$.\n" if /\x{0E4E}/; close ARGV if eof' lib/*.ts components/*.tsx components/home/*.tsx app/*.tsx app/*/*.tsx app/*/*/*.tsx scripts/*.mjs README.md`
- Sharp corners everywhere; only finish dots are circles. Every new button has `focus-visible` and `active:` states.
- A dev server runs on http://localhost:4100. Leave it running. Do not start another.
- One commit per task, message given in the task, trailer exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never stage `.claude/`.
- If `npm run check:overflow` prints FAIL lines you cannot explain by your own change, stop and report; do not edit unrelated code to make it pass.

## Shared verification block (referred to as "run the gates")

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types' || true   # expect: no output
npm run build 2>&1 | tail -3                              # expect: route table tail, no error
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4100/   # expect: 200 (dev server survived the build)
npm run check:overflow 2>&1 | tail -3                     # expect: last line starts with ผ่าน
```

## File structure

| File | Responsibility | Task |
|---|---|---|
| `lib/finishes.ts` (new) | Finish list per product, MOCK demo finishes | 1 |
| `components/FinishDots.tsx` (new) | Finish dot buttons, two sizes | 1 |
| `components/Placeholder.tsx` | Cut-out image reads `--tint` | 1 |
| `components/ProductDetail.tsx` | Finish row on faucet pages | 1 |
| `lib/products.ts` | `series`, `material` (1); `FACETS`, `Picked`, `filterProducts` (2) | 1, 2 |
| `lib/i18n.ts` | Finish strings (1); list-page strings (2); works strings (3) | 1, 2, 3 |
| `scripts/check-filter.mjs` (new) | Self-check of the filter logic | 2 |
| `components/ProductsContent.tsx` | Item list page | 2 |
| `components/ProductCard.tsx` | Card with finish dots | 2 |
| `lib/works.ts` (new) | MOCK installation works | 3 |
| `app/works/page.tsx`, `components/WorksContent.tsx` (new) | Works page | 3 |
| `components/Nav.tsx`, `components/Footer.tsx`, `app/sitemap.ts` | Link to `/works/` | 3 |
| `components/home/HomeContent.tsx` | Works strip (3); photo CTA (4) | 3, 4 |
| `README.md` | MOCK rows and `check:filter` | 1, 2, 3 |

---

### Task 1: Demo finishes on faucet detail pages

**Files:**
- Create: `lib/finishes.ts`, `components/FinishDots.tsx`
- Modify: `lib/products.ts`, `lib/i18n.ts`, `components/Placeholder.tsx`, `components/ProductDetail.tsx`, `README.md`

**Interfaces:**
- Produces: `Product.series: string`, `Product.material?: Material` (`'brass' | 'stainless' | 'castIron'`); `type Finish = { id: string; name: { th: string; en: string }; swatch: string; tint: string; demo?: boolean }`; `finishesFor(product: Product): Finish[]` (first item is the real finish); `<FinishDots finishes value onChange size? className? />`; CSS variable `--tint` read by `Placeholder`'s `contain` image; i18n keys `t.products.finish`, `finishReal`, `finishDemo`, `finishNote`.

- [ ] **Step 1: Add `series` and `material` to the product type and data**

In `lib/products.ts` replace line 2:
```
// ทุกรหัสมีสี/วัสดุเดียว (ก๊อก = โครเมียมขัดเงา) เว็บ Kohler ไม่มีตัวเลือกสี จึงไม่มีตัวสลับสีในหน้าเว็บ
```
with:
```
// ทุกรหัสมีสี/วัสดุเดียว (ก๊อก = โครเมียมขัดเงา) เว็บ Kohler ไม่มีตัวเลือกสี · จุดสีในหน้าเว็บเป็นสีตัวอย่างเพื่อเดโม ดู lib/finishes.ts
```
Replace:
```ts
export type Category = 'faucet' | 'sink';
```
with:
```ts
export type Category = 'faucet' | 'sink';
export type Material = 'brass' | 'stainless' | 'castIron';
```
Replace:
```ts
  category: Category;
  name: { th: string; en: string };
```
with:
```ts
  category: Category;
  series: string; // ซีรีส์ของ Kohler (ProductBrandName)
  material?: Material; // ไม่มี = Kohler ไม่ระบุวัสดุ (Kumin 99480T)
  name: { th: string; en: string };
```
Then, for each product, insert lines directly after its `category:` line (match on the `slug:` + `category:` pair):

| slug | lines to insert after `category: '...'` |
|---|---|
| `elate-13963t-c4` | `    series: 'Elate',` and `    material: 'brass',` |
| `kumin-99480t-4` | `    series: 'Kumin',` (no material) |
| `elate-15609x-4` | `    series: 'Elate',` and `    material: 'brass',` |
| `taut-21370t-4cd` | `    series: 'Taut',` and `    material: 'brass',` |
| `kumin-30946t-4` | `    series: 'Kumin',` and `    material: 'brass',` |
| `taut-21366t-4` | `    series: 'Taut',` and `    material: 'brass',` |
| `toccata-3644x-2kd` | `    series: 'Toccata',` and `    material: 'stainless',` |
| `indio-3885x-2sd` | `    series: 'Indio',` and `    material: 'castIron',` |
| `toccata-3645x-2kd` | `    series: 'Toccata',` and `    material: 'stainless',` |
| `marcato-3676x-2kd` | `    series: 'Marcato',` and `    material: 'stainless',` |

Example result:
```ts
    slug: 'elate-13963t-c4',
    category: 'faucet',
    series: 'Elate',
    material: 'brass',
```

- [ ] **Step 2: Create `lib/finishes.ts`**

```ts
// ── MOCK เพื่อเดโม ──
// สีผิวสินค้าที่เลือกดูได้ในหน้า detail และการ์ดสินค้า
// KOHLER Thailand จำหน่ายสีเดียวต่อรุ่น (ก๊อก = โครเมียมขัดเงา) · สีที่ demo: true เป็นตัวอย่าง ไม่ใช่สินค้าที่มีขาย
// tint = ค่า CSS filter ที่ใส่กับภาพตัดพื้นหลัง (ตัวห่อกำหนด --tint แล้ว Placeholder อ่านไปใช้)
// swatch = สีของจุดสี ใช้สีโลหะจริง ไม่ใช่ theme token (ข้อยกเว้นเฉพาะจุดสี)

import type { Product } from './products';

export type Finish = {
  id: string;
  name: { th: string; en: string };
  swatch: string;
  tint: string; // '' = ไม่ปรับสี
  demo?: boolean;
};

const FAUCET: Finish[] = [
  {
    id: 'chrome',
    name: { th: 'โครเมียมขัดเงา', en: 'Polished Chrome' },
    swatch: 'linear-gradient(135deg, #f4f4f2, #b9bcc0 55%, #e6e7e8)',
    tint: '',
  },
  {
    id: 'black',
    name: { th: 'ดำด้าน', en: 'Matte Black' },
    swatch: '#2b2a29',
    tint: 'brightness(.38) contrast(1.15) saturate(0)',
    demo: true,
  },
  {
    id: 'brass',
    name: { th: 'ทองเหลืองแปรง', en: 'Brushed Brass' },
    swatch: 'linear-gradient(135deg, #d9bd84, #a8843f)',
    tint: 'sepia(1) saturate(1.7) hue-rotate(-8deg) brightness(.92)',
    demo: true,
  },
  {
    id: 'steel',
    name: { th: 'สเตนเลสแปรง', en: 'Brushed Stainless' },
    swatch: 'linear-gradient(135deg, #cfd0cc, #8f918d)',
    tint: 'saturate(0) brightness(.82) contrast(.9)',
    demo: true,
  },
];

const STAINLESS: Finish = {
  id: 'stainless',
  name: { th: 'สเตนเลสสตีล', en: 'Stainless Steel' },
  swatch: 'linear-gradient(135deg, #e3e4e1, #a9aba7)',
  tint: '',
};
const WHITE: Finish = { id: 'white', name: { th: 'ขาว', en: 'White' }, swatch: '#f7f6f3', tint: '' };

// ก๊อก = 4 สี (ตัวแรกคือของจริง) · ซิงก์ = สีจริงสีเดียว
export function finishesFor(product: Product): Finish[] {
  if (product.category === 'faucet') return FAUCET;
  return [product.material === 'castIron' ? WHITE : STAINLESS];
}
```

- [ ] **Step 3: Add the finish strings to `lib/i18n.ts`**

Replace (Thai block):
```ts
      related: 'สินค้าใกล้เคียง',
```
with:
```ts
      related: 'สินค้าใกล้เคียง',
      finish: 'สีผิว',
      finishReal: 'มีจำหน่าย',
      finishDemo: 'สีตัวอย่าง',
      finishNote: 'สีตัวอย่างใช้แสดงภาพเท่านั้น KOHLER Thailand จำหน่ายรุ่นนี้เฉพาะโครเมียมขัดเงา',
```
Replace (English block):
```ts
      related: 'Related pieces',
```
with:
```ts
      related: 'Related pieces',
      finish: 'Finish',
      finishReal: 'Available',
      finishDemo: 'Sample finish',
      finishNote: 'Sample finishes are for illustration only. KOHLER Thailand sells this model in Polished Chrome only.',
```

- [ ] **Step 4: Make the cut-out image read `--tint` in `components/Placeholder.tsx`**

After the header comment line `// (ParallaxImage ขยายภาพ 1.18 เท่าและเลื่อน ±7% ขอบน้อยกว่านี้สินค้าจะชนขอบกรอบ)` add:
```
// ภาพ contain อ่านค่า --tint จากตัวห่อ (สีตัวอย่างใน lib/finishes.ts) · ไม่กำหนด = ไม่ปรับสี
```
Replace:
```tsx
              ? 'absolute left-[18%] top-[18%] h-[64%] w-[64%] object-contain'
```
with:
```tsx
              ? 'absolute left-[18%] top-[18%] h-[64%] w-[64%] object-contain transition-[filter] duration-500 [filter:var(--tint,none)] motion-reduce:transition-none'
```

- [ ] **Step 5: Create `components/FinishDots.tsx`**

```tsx
'use client';

// จุดสีให้เลือกสีผิวสินค้า · md = หน้า detail (จุด 28px ในปุ่ม 44px) · sm = การ์ด (จุด 16px ในปุ่ม 32px)
// มีสีเดียว = จุดบอกสีเฉย ๆ ไม่ใช่ปุ่ม

import { useLang } from './LangProvider';
import type { Finish } from '@/lib/finishes';

type Props = {
  finishes: Finish[];
  value: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
};

export default function FinishDots({ finishes, value, onChange, size = 'md', className = '' }: Props) {
  const { lang, t } = useLang();
  const hit = size === 'md' ? 'h-11 w-11' : 'h-8 w-8';
  const dot = size === 'md' ? 'h-7 w-7' : 'h-4 w-4';
  const name = (f: Finish) => (f.demo ? `${f.name[lang]} (${t.products.finishDemo})` : f.name[lang]);
  const circle = (f: Finish, on: boolean) => (
    <span
      aria-hidden
      className={`block rounded-full border border-warm-300 ${dot} ${on ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
      style={{ background: f.swatch }}
    />
  );

  // ปุ่มกว้างกว่าตัวจุดข้างละ 8px → ดึงซ้าย 8px ให้ขอบจุดแรกตรงกับข้อความ
  if (finishes.length === 1) {
    const f = finishes[0];
    return (
      <div className={`-ml-2 flex ${className}`}>
        <span role="img" aria-label={name(f)} title={name(f)} className={`flex items-center justify-center ${hit}`}>
          {circle(f, false)}
        </span>
      </div>
    );
  }
  return (
    <div role="group" aria-label={t.products.finish} className={`-ml-2 flex ${className}`}>
      {finishes.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={f.id === value}
          aria-label={name(f)}
          title={name(f)}
          onClick={() => onChange(f.id)}
          className={`flex items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] ${hit}`}
        >
          {circle(f, f.id === value)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Add the finish row to `components/ProductDetail.tsx`**

Replace the import block lines:
```tsx
import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import ProductCard from './ProductCard';
import { useLang } from './LangProvider';
import { getProduct, relatedProducts } from '@/lib/products';
```
with:
```tsx
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import ProductCard from './ProductCard';
import FinishDots from './FinishDots';
import { useLang } from './LangProvider';
import { getProduct, relatedProducts } from '@/lib/products';
import { finishesFor } from '@/lib/finishes';
```
Replace:
```tsx
  const { lang, t } = useLang();
  const product = getProduct(slug);
  if (!product) return null;
  const related = relatedProducts(slug);
```
with (the hook must stay above the early return):
```tsx
  const { lang, t } = useLang();
  const [finishId, setFinishId] = useState<string | null>(null);
  const product = getProduct(slug);
  if (!product) return null;
  const related = relatedProducts(slug);
  const finishes = finishesFor(product);
  const finish = finishes.find((f) => f.id === finishId) ?? finishes[0];
```
Replace:
```tsx
          <div className="space-y-8">
```
with:
```tsx
          {/* --tint ปรับสีเฉพาะภาพตัดพื้นหลัง (contain) ภาพบรรยากาศ (cover) ไม่ถูกปรับ */}
          <div className="space-y-8" style={{ '--tint': finish.tint || 'none' } as CSSProperties}>
```
Replace:
```tsx
              <p className="mt-6 text-lg font-light">{product.price[lang]}</p>
```
with:
```tsx
              <p className="mt-6 text-lg font-light">{product.price[lang]}</p>

              {/* สีผิว: เฉพาะรุ่นที่มีให้เลือกมากกว่า 1 สี (ก๊อก) · สีที่ไม่ใช่ของจริงบอกว่าเป็นสีตัวอย่าง */}
              {finishes.length > 1 && (
                <div className="mt-8">
                  <h2 className="text-[11px] font-normal uppercase tracking-widest2 text-warm-500">{t.products.finish}</h2>
                  <FinishDots finishes={finishes} value={finish.id} onChange={setFinishId} className="mt-2" />
                  <p aria-live="polite" className="mt-2 text-sm font-light">
                    {finish.name[lang]}
                    <span className="ml-2 text-warm-500">{finish.demo ? t.products.finishDemo : t.products.finishReal}</span>
                  </p>
                  <p className="mt-2 max-w-md text-[12px] font-normal leading-relaxed text-warm-500">{t.products.finishNote}</p>
                </div>
              )}
```

- [ ] **Step 7: README row**

In `README.md` replace:
```
| `lib/posts.ts` | บทความ (ภาพปก + ภาพในเนื้อหา 2 ภาพ) |
```
with:
```
| `lib/finishes.ts` | สีผิวตัวอย่างเพื่อเดโม (`demo: true`) → เปลี่ยนเป็นสีที่มีจำหน่ายจริง หรือลบออก |
| `lib/posts.ts` | บทความ (ภาพปก + ภาพในเนื้อหา 2 ภาพ) |
```

- [ ] **Step 8: Verify**

Run the gates (shared block). Then:
```bash
curl -s http://localhost:4100/products/elate-13963t-c4/ | grep -c 'สีผิว'      # expect: 1
curl -s http://localhost:4100/products/toccata-3644x-2kd/ | grep -c 'สีผิว'   # expect: 0
curl -s http://localhost:4100/products/elate-13963t-c4/ | grep -o 'aria-label="ดำด้าน (สีตัวอย่าง)"' | head -1   # expect: the string
```
And the U+0E4E scan from Global Constraints (expect no output).

- [ ] **Step 9: Commit**

```bash
git add lib/finishes.ts lib/products.ts lib/i18n.ts components/FinishDots.tsx components/Placeholder.tsx components/ProductDetail.tsx README.md
git commit -F - <<'EOF'
feat: let faucet pages preview sample finishes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `/products/` item list with filters, sort and card dots

**Files:**
- Create: `scripts/check-filter.mjs`
- Modify: `package.json`, `lib/products.ts`, `lib/i18n.ts`, `components/ProductsContent.tsx` (rewrite), `components/ProductCard.tsx` (rewrite), `README.md`

**Interfaces:**
- Consumes (Task 1): `Product.series`, `Product.material`, `finishesFor(product): Finish[]`, `<FinishDots finishes value onChange size="sm" className />`, `--tint`.
- Produces: `type FacetKey = 'category' | 'series' | 'material'`; `type Picked = Record<FacetKey, string[]>`; `FACETS: FacetKey[]`; `filterProducts(list: Product[], picked: Picked): Product[]`; `npm run check:filter`; i18n `t.common.material`, `t.products.filterBy | filters | clear | found | sort | sortFeatured | sortName | sortCategory | facetCategory | facetSeries | facetMaterial | empty`. `t.products.featured` is removed.

- [ ] **Step 1: Write the failing check `scripts/check-filter.mjs`**

```js
// เช็กตรรกะตัวกรองหน้าสินค้ารวมกับข้อมูลสินค้าจริง: npm run check:filter
import assert from 'node:assert/strict';
import { products, filterProducts } from '../lib/products.ts';

const none = { category: [], series: [], material: [] };
const slugs = (picked) => filterProducts(products, { ...none, ...picked }).map((p) => p.slug);

// ไม่เลือกอะไร = ได้ทุกชิ้น
assert.equal(slugs({}).length, products.length);
// กลุ่มเดียว
assert.ok(slugs({ category: ['sink'] }).length > 0);
assert.ok(slugs({ category: ['sink'] }).every((s) => products.find((p) => p.slug === s).category === 'sink'));
// ในกลุ่มเดียวกัน = หรือ
const elateOrTaut = slugs({ series: ['Elate', 'Taut'] });
assert.ok(elateOrTaut.includes('elate-13963t-c4') && elateOrTaut.includes('taut-21366t-4'));
assert.ok(!elateOrTaut.includes('kumin-30946t-4'));
// ข้ามกลุ่ม = และ
assert.deepEqual(slugs({ category: ['sink'], material: ['castIron'] }), ['indio-3885x-2sd']);
assert.deepEqual(slugs({ category: ['faucet'], material: ['stainless'] }), []);
// สินค้าที่ไม่มีข้อมูลวัสดุไม่ผ่านตัวกรองวัสดุ
assert.ok(!slugs({ material: ['brass'] }).includes('kumin-99480t-4'));
assert.ok(slugs({ series: ['Kumin'] }).includes('kumin-99480t-4'));

console.log('ผ่าน: ตัวกรองสินค้า');
```
In `package.json` replace:
```json
    "check:overflow": "node scripts/check-overflow.mjs"
```
with:
```json
    "check:overflow": "node scripts/check-overflow.mjs",
    "check:filter": "node --no-warnings --experimental-strip-types scripts/check-filter.mjs"
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:filter; echo "exit=$?"`
Expected: a `SyntaxError` ending in `does not provide an export named 'filterProducts'` and `exit=1`.

- [ ] **Step 3: Add the filter logic to `lib/products.ts`**

Append at the end of the file:
```ts

// ── ตัวกรองหน้าสินค้ารวม ──
export type FacetKey = 'category' | 'series' | 'material';
export type Picked = Record<FacetKey, string[]>;
export const FACETS: FacetKey[] = ['category', 'series', 'material'];

// ในกลุ่มเดียวกัน = หรือ · ข้ามกลุ่ม = และ · กลุ่มที่ไม่ได้เลือก = ไม่กรอง · สินค้าที่ไม่มีค่าในกลุ่มที่เลือก = ไม่ผ่าน
export function filterProducts(list: Product[], picked: Picked): Product[] {
  return list.filter((p) => FACETS.every((k) => picked[k].length === 0 || picked[k].includes(p[k] ?? '')));
}
```
`lib/products.ts` must keep having no `import` lines (the check imports it straight into Node).

- [ ] **Step 4: Run it and watch it pass**

Run: `npm run check:filter; echo "exit=$?"`
Expected: `ผ่าน: ตัวกรองสินค้า` and `exit=0`.

- [ ] **Step 5: i18n strings**

In `lib/i18n.ts`, Thai block, replace:
```ts
      category: { all: 'ทั้งหมด', faucet: 'ก๊อกครัว', sink: 'ซิงก์ล้างจาน' } as Record<string, string>,
```
with:
```ts
      category: { all: 'ทั้งหมด', faucet: 'ก๊อกครัว', sink: 'ซิงก์ล้างจาน' } as Record<string, string>,
      material: { brass: 'ทองเหลือง', stainless: 'สเตนเลสสตีล', castIron: 'เหล็กหล่อ' } as Record<string, string>,
```
Replace:
```ts
      featured: 'สินค้าเด่น',
```
with:
```ts
      filterBy: 'กรองตาม',
      filters: 'ตัวกรอง',
      clear: 'ล้างตัวกรอง',
      found: 'พบ {n} รายการ',
      sort: 'เรียงตาม',
      sortFeatured: 'แนะนำ',
      sortName: 'ชื่อ ก-ฮ',
      sortCategory: 'หมวด',
      facetCategory: 'หมวด',
      facetSeries: 'ซีรีส์',
      facetMaterial: 'วัสดุ',
      empty: 'ไม่พบสินค้าตามตัวกรองที่เลือก',
```
English block, replace:
```ts
      category: { all: 'All', faucet: 'Kitchen faucet', sink: 'Kitchen sink' } as Record<string, string>,
```
with:
```ts
      category: { all: 'All', faucet: 'Kitchen faucet', sink: 'Kitchen sink' } as Record<string, string>,
      material: { brass: 'Brass', stainless: 'Stainless steel', castIron: 'Cast iron' } as Record<string, string>,
```
Replace:
```ts
      featured: 'Featured',
```
with:
```ts
      filterBy: 'Filter by',
      filters: 'Filters',
      clear: 'Clear filters',
      found: 'Products found: {n}',
      sort: 'Sort by',
      sortFeatured: 'Recommended',
      sortName: 'Name A-Z',
      sortCategory: 'Category',
      facetCategory: 'Category',
      facetSeries: 'Series',
      facetMaterial: 'Material',
      empty: 'No products match the selected filters',
```

- [ ] **Step 6: Rewrite `components/ProductCard.tsx`** (Read it first, then Write the whole file)

```tsx
'use client';

// การ์ดสินค้า (หน้าสินค้ารวม, สินค้าเด่นหน้าแรก, "สินค้าใกล้เคียง")
// ห่อด้วย TiltCard = 3D tilt ตามเมาส์ ±6deg + เงา soft ขยับตาม
// จุดสีอยู่นอกลิงก์ (ปุ่มซ้อนในลิงก์ไม่ได้) · กดแล้วปรับสีเฉพาะภาพของการ์ดนี้ ไม่ตามไปหน้า detail

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import TiltCard from './TiltCard';
import Placeholder from './Placeholder';
import FinishDots from './FinishDots';
import { useLang } from './LangProvider';
import { finishesFor } from '@/lib/finishes';
import type { Product } from '@/lib/products';

export default function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const finishes = finishesFor(product);
  const [finishId, setFinishId] = useState(finishes[0].id);
  const tint = finishes.find((f) => f.id === finishId)?.tint || 'none';
  const href = `/products/${product.slug}/`;
  return (
    <TiltCard>
      <div className="group bg-paper">
        {/* ลิงก์ภาพซ้ำกับลิงก์ชื่อสินค้า → ซ่อนจาก tab/screen reader */}
        <Link
          href={href}
          className="block overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
          style={{ '--tint': tint } as CSSProperties}
        >
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            <Placeholder src={product.images[0]} fit="contain" ratio="4/5" />
          </div>
        </Link>
        <div className="px-1 pb-2 pt-4">
          <p className="text-[10px] uppercase tracking-widest2 text-warm-500">
            {t.common.category[product.category]}
          </p>
          <h3 className="mt-1.5 text-base font-light tracking-wide">
            <Link href={href} className="underline-offset-4 hover:underline focus-visible:underline">
              {product.name[lang]}
            </Link>
          </h3>
          <FinishDots finishes={finishes} value={finishId} onChange={setFinishId} size="sm" className="mt-1" />
          <p className="text-[12px] text-warm-500">{product.price[lang]}</p>
        </div>
      </div>
    </TiltCard>
  );
}
```

- [ ] **Step 7: Rewrite `components/ProductsContent.tsx`** (Read it first, then Write the whole file)

```tsx
'use client';

// หน้าสินค้ารวมแบบรายการ: breadcrumb → หัวข้อ → ตัวกรองซ้าย (หมวด/ซีรีส์/วัสดุ) + ตารางการ์ดขวา พร้อมจำนวนที่พบและเรียงลำดับ
// ตัวกรองอยู่ใน state ของหน้า ไม่ผูก URL
// ponytail: ย้อนกลับจากหน้า detail แล้วตัวกรองรีเซ็ต · ผูก query string เมื่อต้องแชร์ลิงก์ที่กรองแล้ว

import { useState } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import ProductCard from './ProductCard';
import { useLang } from './LangProvider';
import { FACETS, filterProducts, products, type FacetKey, type Picked } from '@/lib/products';

type Sort = 'featured' | 'name' | 'category';
const NONE: Picked = { category: [], series: [], material: [] };

// ค่าที่มีในแต่ละกลุ่มพร้อมจำนวนสินค้า (นับจากสินค้าทั้งหมด ไม่เปลี่ยนตามตัวกรอง)
const OPTIONS = Object.fromEntries(
  FACETS.map((k) => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const v = p[k];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [k, Array.from(counts)];
  }),
) as Record<FacetKey, [string, number][]>;

function Facets({ picked, toggle }: { picked: Picked; toggle: (k: FacetKey, v: string) => void }) {
  const { t } = useLang();
  const title: Record<FacetKey, string> = {
    category: t.products.facetCategory,
    series: t.products.facetSeries,
    material: t.products.facetMaterial,
  };
  const label = (k: FacetKey, v: string) =>
    ({ category: t.common.category[v], series: v, material: t.common.material[v] })[k];
  return (
    <div className="divide-y divide-warm-200 border-y border-warm-200">
      {FACETS.map((k) => (
        <fieldset key={k} className="pb-4">
          <legend className="pb-2 pt-5 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">{title[k]}</legend>
          {OPTIONS[k].map(([v, n]) => (
            <label key={v} className="flex min-h-[2.25rem] cursor-pointer items-center gap-3 text-sm font-light">
              <input
                type="checkbox"
                checked={picked[k].includes(v)}
                onChange={() => toggle(k, v)}
                className="h-4 w-4 accent-ink"
              />
              <span>
                {label(k, v)} <span className="text-warm-500">({n})</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export default function ProductsContent() {
  const { lang, t } = useLang();
  const [picked, setPicked] = useState<Picked>(NONE);
  const [sort, setSort] = useState<Sort>('featured');

  const toggle = (k: FacetKey, v: string) =>
    setPicked((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));
  const active = FACETS.reduce((n, k) => n + picked[k].length, 0);

  const shown = filterProducts(products, picked).sort((a, b) => {
    if (sort === 'name') return a.name[lang].localeCompare(b.name[lang], lang);
    if (sort === 'category') return a.category.localeCompare(b.category);
    return Number(!!b.featured) - Number(!!a.featured);
  });

  const clearBtn = (
    <button
      type="button"
      onClick={() => setPicked(NONE)}
      className="text-[11px] font-normal uppercase tracking-widest2 underline underline-offset-4 hover:text-warm-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink active:scale-[0.98]"
    >
      {t.products.clear}
    </button>
  );

  return (
    <>
      <section className="px-6 pb-10 pt-32 md:px-[6vw] md:pb-14 md:pt-40">
        <nav aria-label="breadcrumb" className="mb-10 text-[11px] uppercase tracking-widest2 text-warm-500">
          <Link href="/" className="hover:text-ink">
            {t.nav.home}
          </Link>
          <span className="mx-2">/</span>
          <span aria-current="page">{t.nav.products}</span>
        </nav>
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.products.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.products.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[6vw] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        {/* จอใหญ่: ตัวกรองติดด้านซ้าย · จอเล็ก: พับอยู่ใน <details> ด้านล่าง */}
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-light tracking-wide">{t.products.filterBy}</h2>
            {active > 0 && clearBtn}
          </div>
          <Facets picked={picked} toggle={toggle} />
        </aside>

        <div>
          <details className="group mb-8 border-y border-warm-200 lg:hidden">
            <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between text-[11px] font-normal uppercase tracking-widest2 [&::-webkit-details-marker]:hidden">
              <span>
                {t.products.filters}
                {active > 0 && ` (${active})`}
              </span>
              <span aria-hidden className="group-open:hidden">+</span>
              <span aria-hidden className="hidden group-open:inline">−</span>
            </summary>
            <div className="pb-5">
              <Facets picked={picked} toggle={toggle} />
              {active > 0 && <div className="mt-4">{clearBtn}</div>}
            </div>
          </details>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="text-sm font-light">
              {t.products.found.replace('{n}', String(shown.length))}
            </p>
            <label className="flex items-center gap-3 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">
              {t.products.sort}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border border-warm-300 bg-paper px-3 py-2 text-sm font-light normal-case tracking-normal text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink"
              >
                <option value="featured">{t.products.sortFeatured}</option>
                <option value="name">{t.products.sortName}</option>
                <option value="category">{t.products.sortCategory}</option>
              </select>
            </label>
          </div>

          {shown.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className="border border-warm-200 px-6 py-16 text-center">
              <p className="text-sm font-light">{t.products.empty}</p>
              <div className="mt-6">{clearBtn}</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
```
The `−` in the summary is U+2212 MINUS SIGN (a "collapse" glyph hidden from assistive tech), not an en-dash. Copy it from this plan.

- [ ] **Step 8: README line**

In `README.md` replace:
```
npm run check:overflow   # ทุกหน้า × 375/768/1024/1200 × motion/reduced-motion ต้องไม่ล้นจอ ไม่มี console error ภาพทุกไฟล์โหลดได้ (เปิด dev server ก่อน · Node 22+)
```
with:
```
npm run check:overflow   # ทุกหน้า × 375/768/1024/1200 × motion/reduced-motion ต้องไม่ล้นจอ ไม่มี console error ภาพทุกไฟล์โหลดได้ (เปิด dev server ก่อน · Node 22+)
npm run check:filter     # ตรรกะตัวกรองหน้าสินค้ารวม (ไม่ต้องเปิด server · Node 22.6+)
```

- [ ] **Step 9: Verify**

Run the gates (shared block). Then:
```bash
npm run check:filter 2>&1 | tail -1                                         # expect: ผ่าน: ตัวกรองสินค้า
grep -rn "products\.featured" app components lib                            # expect: no output
curl -s http://localhost:4100/products/ | grep -c 'กรองตาม'                   # expect: 1
curl -s http://localhost:4100/products/ | grep -o 'type="checkbox"' | wc -l   # expect: 22 (11 options × desktop + mobile copies)
curl -s http://localhost:4100/products/ | grep -o '<h3' | wc -l               # expect: 10
```
And the U+0E4E scan (expect no output). If the checkbox count differs, count the distinct values per facet in `lib/products.ts` (2 categories + 6 series + 3 materials = 11) and report the mismatch instead of forcing the number.

- [ ] **Step 10: Commit**

```bash
git add scripts/check-filter.mjs package.json lib/products.ts lib/i18n.ts components/ProductCard.tsx components/ProductsContent.tsx README.md
git commit -F - <<'EOF'
feat: turn the products page into a filterable item grid

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: `/works/` page, nav item and home strip

**Files:**
- Create: `lib/works.ts`, `app/works/page.tsx`, `components/WorksContent.tsx`
- Modify: `lib/i18n.ts`, `components/Nav.tsx`, `components/Footer.tsx`, `app/sitemap.ts`, `components/home/HomeContent.tsx`, `README.md`

**Interfaces:**
- Consumes: `getProduct(slug)` from `lib/products.ts`; `<ParallaxImage label? src? ratio? speed? />` (no `src` = grey labeled frame); `<Reveal className? delay? y? />`.
- Produces: `type Work`, `works: Work[]`; route `/works/`; i18n `t.nav.works`, `t.works.kicker | title | sub | awaiting | used | homeSub | homeLink`.

- [ ] **Step 1: Create `lib/works.ts`**

```ts
// ── MOCK เพื่อเดโม ──
// ผลงานการติดตั้งตัวอย่าง: ชื่อเป็นประเภทงาน + ย่าน ไม่ใช่โครงการหรือลูกค้าจริง และยังไม่มีภาพ (กรอบเทารอภาพ)
// ของจริง: แก้รายการนี้ แล้วใส่ path ภาพที่ image หน้า /works/ จะแสดงภาพแทนกรอบเทาเอง

export type Work = {
  slug: string;
  type: { th: string; en: string };
  name: { th: string; en: string };
  area: { th: string; en: string };
  year: number;
  image?: string;
  products: string[]; // slug ใน lib/products.ts
};

export const works: Work[] = [
  {
    slug: 'condo-sukhumvit',
    type: { th: 'คอนโดมิเนียม', en: 'Condominium' },
    name: { th: 'ครัวเปิดรับวิวเมือง', en: 'Open kitchen with a city view' },
    area: { th: 'ย่านสุขุมวิท กรุงเทพฯ', en: 'Sukhumvit, Bangkok' },
    year: 2026,
    products: ['elate-13963t-c4', 'toccata-3644x-2kd'],
  },
  {
    slug: 'house-rama9',
    type: { th: 'บ้านเดี่ยว', en: 'Detached house' },
    name: { th: 'ครัวไอส์แลนด์สำหรับครอบครัว', en: 'Family island kitchen' },
    area: { th: 'ย่านพระราม 9 กรุงเทพฯ', en: 'Rama 9, Bangkok' },
    year: 2026,
    products: ['taut-21370t-4cd', 'indio-3885x-2sd'],
  },
  {
    slug: 'townhome-ari',
    type: { th: 'ทาวน์โฮม', en: 'Townhome' },
    name: { th: 'ครัวแคบที่ใช้ได้ทุกตารางนิ้ว', en: 'A narrow kitchen that uses every inch' },
    area: { th: 'ย่านอารีย์ กรุงเทพฯ', en: 'Ari, Bangkok' },
    year: 2025,
    products: ['kumin-99480t-4', 'toccata-3645x-2kd'],
  },
  {
    slug: 'penthouse-sathorn',
    type: { th: 'เพนต์เฮาส์', en: 'Penthouse' },
    name: { th: 'ครัวโชว์กับครัวหนักแยกส่วน', en: 'Show kitchen and working kitchen' },
    area: { th: 'ย่านสาทร กรุงเทพฯ', en: 'Sathorn, Bangkok' },
    year: 2025,
    products: ['elate-15609x-4', 'marcato-3676x-2kd'],
  },
  {
    slug: 'house-bangna',
    type: { th: 'บ้านเดี่ยว', en: 'Detached house' },
    name: { th: 'ครัวไทยหลังบ้านปรับใหม่', en: 'Rebuilt Thai back kitchen' },
    area: { th: 'ย่านบางนา กรุงเทพฯ', en: 'Bang Na, Bangkok' },
    year: 2024,
    products: ['kumin-30946t-4', 'toccata-3644x-2kd'],
  },
  {
    slug: 'cafe-thonglor',
    type: { th: 'ร้านคาเฟ่', en: 'Café' },
    name: { th: 'เคาน์เตอร์เตรียมอาหารหลังบาร์', en: 'Prep counter behind the bar' },
    area: { th: 'ย่านทองหล่อ กรุงเทพฯ', en: 'Thonglor, Bangkok' },
    year: 2024,
    products: ['taut-21366t-4', 'marcato-3676x-2kd'],
  },
];
```

- [ ] **Step 2: i18n strings**

In `lib/i18n.ts`, Thai block, replace:
```ts
      products: 'สินค้า',
```
with:
```ts
      products: 'สินค้า',
      works: 'ผลงาน',
```
Replace:
```ts
    contact: {
      title: 'ติดต่อเรา',
```
with:
```ts
    works: {
      kicker: 'INSTALLATIONS',
      title: 'ผลงานการติดตั้ง',
      sub: 'ครัวที่ทีมช่างของเราดูแลตั้งแต่วัดหน้างานจนส่งมอบ ภาพผลงานจริงกำลังรวบรวม',
      awaiting: 'รอภาพผลงาน',
      used: 'สินค้าที่ใช้',
      homeSub: 'ดูครัวที่ทีมช่างของเราติดตั้งและส่งมอบแล้ว',
      homeLink: 'ดูผลงานทั้งหมด',
    },
    contact: {
      title: 'ติดต่อเรา',
```
English block, replace:
```ts
      products: 'Products',
```
with:
```ts
      products: 'Products',
      works: 'Works',
```
Replace:
```ts
    contact: {
      title: 'Contact Us',
```
with:
```ts
    works: {
      kicker: 'INSTALLATIONS',
      title: 'Installation Works',
      sub: 'Kitchens our own team handled from site survey to handover. Project photos are being gathered.',
      awaiting: 'Photo coming soon',
      used: 'Products used',
      homeSub: 'See the kitchens our team has installed and handed over.',
      homeLink: 'View all works',
    },
    contact: {
      title: 'Contact Us',
```

- [ ] **Step 3: Create `components/WorksContent.tsx`**

```tsx
'use client';

// หน้าผลงานการติดตั้ง: หัวข้อ → รายการ 2 คอลัมน์เหลื่อมกัน (คอลัมน์ขวาเลื่อนลง) มือถือ 1 คอลัมน์
// ยังไม่มีภาพจริง: ไม่มี image = กรอบเทามีป้าย "รอภาพผลงาน" · ใส่ image ใน lib/works.ts แล้วภาพจะขึ้นแทน
// ภาพ parallax ในกรอบ (เหตุผล: ความลึกแบบเดียวกับภาพหน้าอื่น) + reveal ทีละชิ้น (เหตุผล: อ่านทีละผลงานตามที่เลื่อนถึง)

import Link from 'next/link';
import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import { useLang } from './LangProvider';
import { works } from '@/lib/works';
import { getProduct } from '@/lib/products';

export default function WorksContent() {
  const { lang, t } = useLang();
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.works.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.works.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.works.sub}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <ul className="grid gap-x-12 gap-y-20 md:grid-cols-2 lg:gap-x-20">
          {works.map((w, i) => (
            <li key={w.slug} className={i % 2 ? 'md:mt-28' : ''}>
              <Reveal delay={(i % 2) * 0.12} y={30}>
                <ParallaxImage
                  label={w.image ? w.name[lang] : t.works.awaiting}
                  src={w.image}
                  ratio={i % 3 === 0 ? '4/5' : '3/2'}
                  speed={i % 2 ? 6 : -6}
                />
                <p className="mt-5 text-[12px] font-normal text-warm-500">
                  {w.type[lang]} · {w.year}
                </p>
                <h2 className="mt-2 text-xl font-light leading-snug tracking-wide">{w.name[lang]}</h2>
                <p className="mt-1 text-[13px] font-light text-stone-600">{w.area[lang]}</p>
                <p className="mt-4 text-[12px] font-normal text-warm-500">{t.works.used}</p>
                <ul className="mt-1 space-y-1 text-sm font-light">
                  {w.products.map((slug) => {
                    const p = getProduct(slug);
                    if (!p) return null;
                    return (
                      <li key={slug}>
                        <Link
                          href={`/products/${slug}/`}
                          className="underline-offset-4 hover:underline focus-visible:underline"
                        >
                          {p.name[lang]}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Create `app/works/page.tsx`**

```tsx
import type { Metadata } from 'next';
import WorksContent from '@/components/WorksContent';

export const metadata: Metadata = {
  title: 'ผลงานการติดตั้ง: ครัวที่ ITERRA ดูแลตั้งแต่วัดหน้างานถึงส่งมอบ',
  description:
    'ตัวอย่างผลงานติดตั้งก๊อกและซิงก์ครัว KOHLER โดยทีมช่างของ ITERRA ทั้งคอนโดมิเนียม บ้านเดี่ยว และร้านคาเฟ่',
  alternates: { canonical: '/works/' },
};

export default function WorksPage() {
  return <WorksContent />;
}
```

- [ ] **Step 5: Nav, footer, sitemap**

`components/Nav.tsx`, replace:
```tsx
  { href: '/products/', key: 'products' },
```
with:
```tsx
  { href: '/products/', key: 'products' },
  { href: '/works/', key: 'works' },
```
Replace (seven items must fit one line at 768 px in both languages):
```tsx
          <nav aria-label="เมนูหลัก" className="pointer-events-auto hidden items-center gap-6 md:flex lg:gap-8">
```
with:
```tsx
          <nav aria-label="เมนูหลัก" className="pointer-events-auto hidden items-center gap-4 md:flex lg:gap-8">
```
Replace:
```tsx
                className={`text-[11px] font-normal uppercase tracking-widest2 transition-opacity ${
                  pathname === l.href ? 'opacity-100 underline underline-offset-8' : 'opacity-85 hover:opacity-100'
```
with:
```tsx
                className={`whitespace-nowrap text-[11px] font-normal uppercase tracking-widest2 transition-opacity ${
                  pathname === l.href ? 'opacity-100 underline underline-offset-8' : 'opacity-85 hover:opacity-100'
```
`components/Footer.tsx`, replace:
```tsx
            <li><Link href="/products/" className="text-paper/75 hover:text-paper">{t.nav.products}</Link></li>
```
with:
```tsx
            <li><Link href="/products/" className="text-paper/75 hover:text-paper">{t.nav.products}</Link></li>
            <li><Link href="/works/" className="text-paper/75 hover:text-paper">{t.nav.works}</Link></li>
```
`app/sitemap.ts`, replace:
```ts
  const staticPages = ['', '/about/', '/products/', '/catalog/', '/articles/', '/contact/'].map((p) => ({
```
with:
```ts
  const staticPages = ['', '/about/', '/products/', '/works/', '/catalog/', '/articles/', '/contact/'].map((p) => ({
```

- [ ] **Step 6: Home strip in `components/home/HomeContent.tsx`**

Replace line 3:
```tsx
// หน้าแรก: hero → ผนังภาพ parallax → เรื่องราว → สินค้าเด่น → สถิติ → แคตตาล็อก → บทความล่าสุด → CTA (ไม่มี section ไหน pin)
```
with:
```tsx
// หน้าแรก: hero → ผนังภาพ parallax → เรื่องราว → สินค้าเด่น → สถิติ → ผลงาน → แคตตาล็อก → บทความล่าสุด → CTA (ไม่มี section ไหน pin)
```
Insert this function directly above `function LatestPosts() {`:
```tsx
// แถบชวนไปหน้าผลงานการติดตั้ง: ข้อความกับลิงก์เท่านั้น (หน้าผลงานยังเป็นกรอบเทารอภาพ จึงไม่ดึงภาพมาหน้าแรก)
function WorksStrip() {
  const { t } = useLang();
  return (
    <section className="px-6 py-20 md:px-[8vw] md:py-24">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.works.title}</h2>
          <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-warm-500">{t.works.homeSub}</p>
        </div>
        <Link
          href="/works/"
          className="shrink-0 text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
        >
          {t.works.homeLink} <span aria-hidden>→</span>
        </Link>
      </Reveal>
    </section>
  );
}

```
Replace:
```tsx
      <Stats />
      <CatalogTeaser />
```
with:
```tsx
      <Stats />
      <WorksStrip />
      <CatalogTeaser />
```

- [ ] **Step 7: README row**

In `README.md` replace:
```
| `lib/site.ts` | โดเมนจริง, ชื่อ, ที่อยู่, เบอร์ติดต่อ (มีผลกับ SEO/sitemap/JSON-LD) |
```
with:
```
| `lib/works.ts` | ผลงานการติดตั้งตัวอย่าง (ชื่อสมมติ ยังไม่มีภาพ) → ใส่ผลงานจริงและ path ภาพที่ `image` |
| `lib/site.ts` | โดเมนจริง, ชื่อ, ที่อยู่, เบอร์ติดต่อ (มีผลกับ SEO/sitemap/JSON-LD) |
```

- [ ] **Step 8: Verify**

Run the gates (shared block; `check:overflow` must now report one more page than before because `/works/` is linked from `/`). Then:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4100/works/         # expect: 200
curl -s http://localhost:4100/works/ | grep -o 'รอภาพผลงาน' | head -1          # expect: รอภาพผลงาน
curl -s http://localhost:4100/works/ | grep -o '<h2' | wc -l                   # expect: 6
curl -s http://localhost:4100/ | grep -o 'href="/works/"' | wc -l              # expect: 4 (desktop nav, mobile nav, home strip, footer)
```
And the U+0E4E scan (expect no output).

- [ ] **Step 9: Commit**

```bash
git add lib/works.ts lib/i18n.ts app/works/page.tsx components/WorksContent.tsx components/Nav.tsx components/Footer.tsx app/sitemap.ts components/home/HomeContent.tsx README.md
git commit -F - <<'EOF'
feat: add the installation works page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Kitchen photo behind the home contact CTA

**Files:**
- Modify: `components/home/HomeContent.tsx` (`ContactCta` only)

**Interfaces:**
- Consumes: `<Placeholder fill src />` (already imported in this file; `fill` = `absolute inset-0`, `cover` image, decorative `alt=""`), the existing file `public/media/scenes/showroom-kitchen-at-home-2.webp`.
- Produces: nothing for other tasks.

- [ ] **Step 1: Edit `ContactCta`**

Insert directly above `function ContactCta() {`:
```tsx
// ภาพพื้นหลังแถบ CTA: โต๊ะไม้ในครัว (ไม่ซ้ำห้องกับภาพอื่นบนหน้าแรก) ทับด้วย ink 70% ให้ตัวอักษรอ่านได้
// แถบนี้เคยเป็นพื้น ink เรียบติดกับ footer ที่เป็น ink เหมือนกัน จึงดูเป็นบล็อกเดียว
const CTA_IMAGE = '/media/scenes/showroom-kitchen-at-home-2.webp';

```
Replace:
```tsx
    <section className="relative overflow-hidden bg-ink px-6 py-28 text-center text-paper md:py-36">
      <Reveal>
```
with:
```tsx
    <section className="relative overflow-hidden bg-ink px-6 py-28 text-center text-paper md:py-36">
      <Placeholder fill src={CTA_IMAGE} />
      <div className="absolute inset-0 bg-ink/70" aria-hidden />
      <Reveal className="relative">
```
Replace:
```tsx
        <p className="mx-auto mt-5 max-w-md text-sm font-light text-paper/60">{t.home.ctaSub}</p>
```
with:
```tsx
        <p className="mx-auto mt-5 max-w-md text-sm font-light text-paper/85">{t.home.ctaSub}</p>
```
Replace:
```tsx
          className="mt-10 inline-block border border-paper/50 px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-paper hover:text-ink"
```
with:
```tsx
          className="mt-10 inline-block border border-paper/60 px-10 py-4 text-[11px] font-normal uppercase tracking-widest2 transition-colors duration-300 hover:bg-paper hover:text-ink active:scale-[0.98]"
```

- [ ] **Step 2: Verify**

Run the gates (shared block). Then:
```bash
test -f public/media/scenes/showroom-kitchen-at-home-2.webp && echo ok          # expect: ok
curl -s http://localhost:4100/ | grep -o 'showroom-kitchen-at-home-2.webp' | wc -l   # expect: 1
```

- [ ] **Step 3: Commit**

```bash
git add components/home/HomeContent.tsx
git commit -F - <<'EOF'
feat: put a kitchen photo behind the home contact call

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Controller checks after each task (not for implementers)

- Task 1: Elate detail at 1200 and 375, each of the 4 finishes; tune `tint` values if a finish looks wrong; sink page has no finish row; reduced motion.
- Task 2: `/products/` at 1440, 1200, 768, 375: sidebar, mobile `<details>`, filter to one item, empty state, sort by name in TH and EN, card dots tint only their card.
- Task 3: nav on one line at 768 in TH and EN; `/works/` at 1200, 768, 375; home strip.
- Task 4: home CTA screenshot; contrast of heading, sub text and button label measured from screenshot pixels (AA: 4.5:1 small text, 3:1 large).
