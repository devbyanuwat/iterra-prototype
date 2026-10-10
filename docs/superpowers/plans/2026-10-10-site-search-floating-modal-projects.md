# Site search, floating buttons, announcement modal, project reference: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a go-to-top button, a LINE button, a site search, an entry announcement and a Project Reference page to the ITERRA site.

**Architecture:** Three small client components mounted once in `app/layout.tsx` (floating buttons, announcement) or inside `Nav` (search panel). Search and announcement logic live in import-free `lib/*.ts` files so one Node script can test them. Both overlays are native `<dialog>` elements opened with `showModal()`: the browser supplies the focus trap, Escape and the top layer, so no z-index is needed for them.

**Tech Stack:** Next.js 16 static export, React 19, Tailwind 3.4, Lenis. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-10-site-search-floating-modal-projects-design.md`

## Global Constraints

- Branch `room-studio`. No new branch. One commit per task, pushed to `origin room-studio`. No PR, no merge.
- Static export: no server code, no route handlers.
- No new npm dependency. Icons are inline SVG.
- Colours come from Tailwind tokens (`paper`, `ink`, `warm-*`). The one exception is LINE green `#06C755`.
- Every user-facing string exists in both `dict.th` and `dict.en` in `lib/i18n.ts` (`Dict = typeof dict.th`, so a missing English key fails `tsc`).
- Thai text: no U+0E4E, no en dash or em dash.
- `lib/search.ts`, `lib/announcement.ts`, `lib/projects.ts` have no `import` lines (Node runs them with `--experimental-strip-types`, which cannot resolve `@/`).
- Interactive targets are at least 44 px.
- Read `node_modules/next/dist/docs/` for any Next API you are unsure of (AGENTS.md).
- Gates before every commit:
  - `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` prints nothing
  - `npm run check:search` (from Task 2 on), `npm run check:room`, `npm run check:filter`
  - `npm run build`
  - `perl -CSD -ne 'print "$ARGV:$.: $_" if /\x{0E4E}/' lib/*.ts components/*.tsx` prints nothing
  - `npm run check:overflow` with the dev server running on port 4100 (launch config `iterra-dev`)

## Review Focus

1. A query of only spaces returns no results and shows the hint, not every entry. Pinned in Task 2 Step 1.
2. A query with regex characters (`(`, `+`, `[`) does not throw. Pinned in Task 2 Step 1.
3. An English query in capitals finds the product (`ELATE`). Pinned in Task 2 Step 1.
4. `sessionStorage` that throws (private mode, blocked site data): the announcement still opens and still closes. Pinned in Task 3 Step 1.
5. The announcement does not open on top of an open search panel. Pinned in Task 3 Step 5 (browser).

---

### Task 1: Floating buttons (go to top, LINE)

**Files:**
- Create: `components/FloatingActions.tsx`
- Modify: `components/SmoothScroll.tsx`, `app/layout.tsx`, `lib/i18n.ts`

**Interfaces:**
- Produces: `scrollToTop(): void` exported from `components/SmoothScroll.tsx`; `t.float.top`, `t.float.line`.

- [ ] **Step 1: Export `scrollToTop` from `components/SmoothScroll.tsx`**

Add above the component:

```ts
let lenis: Lenis | null = null;

// Lenis ไม่ถูกสร้างเมื่อผู้ใช้ปิด motion: ตกไปใช้การเลื่อนของเบราว์เซอร์
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else window.scrollTo(0, 0);
}
```

Inside the effect, replace `const lenis = new Lenis({ lerp: 0.08 });` with:

```ts
    const instance = new Lenis({ lerp: 0.08 });
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => instance.raf(time * 1000);
```

and the cleanup with:

```ts
    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis = null;
    };
```

(Delete the old `lenis.on(...)` and old `const raf` lines.)

- [ ] **Step 2: Add strings to `lib/i18n.ts`**

In `dict.th`, after the `nav` block:

```ts
    float: { top: 'กลับขึ้นด้านบน', line: 'แชตกับเราทาง LINE' },
```

In `dict.en`, after the `nav` block:

```ts
    float: { top: 'Back to top', line: 'Chat with us on LINE' },
```

- [ ] **Step 3: Create `components/FloatingActions.tsx`**

```tsx
'use client';

// ปุ่มลอยมุมขวาล่าง: กลับขึ้นด้านบน (โผล่เมื่อเลื่อนเกิน 1 จอ) อยู่บน · LINE อยู่ล่าง เห็นตลอด
// z-40: อยู่เหนือเนื้อหา ใต้แถบเมนู (z-50) และเมนูมือถือ (z-60) · แผงค้นหากับประกาศเป็น <dialog> อยู่ชั้นบนสุดเอง

import { useEffect, useState } from 'react';
import { useLang } from './LangProvider';
import { scrollToTop } from './SmoothScroll';
import { CONTACT } from '@/lib/site';

const round = 'flex h-12 w-12 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(28,25,23,0.18)] transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.94] motion-reduce:transition-none';

export default function FloatingActions() {
  const { t } = useLang();
  const [far, setFar] = useState(false);

  useEffect(() => {
    const check = () => setFar(window.scrollY > window.innerHeight);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-3 md:bottom-6 md:right-6">
      {far && (
        <button type="button" onClick={scrollToTop} aria-label={t.float.top} title={t.float.top} className={`${round} border border-warm-300 bg-paper text-ink`}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
      {/* ตัวอักษรสีเข้มบนเขียว LINE: ขาวบน #06C755 ได้ contrast ราว 2.3:1 ไม่ผ่าน */}
      <a
        href={`https://line.me/R/ti/p/${encodeURIComponent(CONTACT.line)}`}
        target="_blank"
        rel="noopener"
        aria-label={t.float.line}
        title={t.float.line}
        className={`${round} bg-[#06C755] text-[11px] font-medium tracking-wide text-ink`}
      >
        LINE
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Mount in `app/layout.tsx`**

Add `import FloatingActions from '@/components/FloatingActions';` and place `<FloatingActions />` after `<Footer />` inside `<LangProvider>`.

- [ ] **Step 5: Run gates** (all in Global Constraints except `check:search`, which does not exist yet). Expected: all pass.

- [ ] **Step 6: Browser check** on `http://localhost:4100/` at 1280 and 375:
  - at page top only the LINE button shows; after scrolling past one screen the arrow shows above it;
  - clicking the arrow returns `window.scrollY` to 0;
  - the LINE link `href` is `https://line.me/R/ti/p/%40iterra`, `target="_blank"`;
  - both measure at least 44 px (`getBoundingClientRect`);
  - on `/room/` at 375 and 1280 the stack does not cover a studio control. If it does, stop and report (off-plan).
  - switch language to EN: `aria-label` values change.

- [ ] **Step 7: Commit and push**

```bash
git add components/FloatingActions.tsx components/SmoothScroll.tsx app/layout.tsx lib/i18n.ts
git commit -m "feat: floating go-to-top and LINE buttons"
git push origin room-studio
```

---

### Task 2: Search

**Files:**
- Create: `lib/search.ts`, `scripts/check-search.mjs`, `components/SearchPanel.tsx`
- Modify: `lib/i18n.ts`, `components/Nav.tsx`, `package.json`

**Interfaces:**
- Produces:
  - `lib/search.ts`: `type Name`, `type Group = 'products' | 'articles' | 'projects' | 'pages'`, `type Entry = { group: Group; href: string; title: Name; text: string }`, `type Sources`, `GROUPS: Group[]`, `buildIndex(sources: Sources): Entry[]`, `search(index: Entry[], query: string, perGroup?: number): Entry[]`
  - `lib/i18n.ts`: `NAV_LINKS`, `PAGES: { href: string; title: { th: string; en: string } }[]`, `t.search.*`
  - `components/SearchPanel.tsx`: default export, props `{ open: boolean; onClose: () => void }`
- Task 4 passes real projects into `buildIndex`; here `projects` is `[]`.

- [ ] **Step 1: Write the failing check `scripts/check-search.mjs`**

```js
// เช็กการค้นหาในเว็บ (lib/search.ts) กับข้อมูลจริง: npm run check:search
import assert from 'node:assert/strict';
import { buildIndex, search, GROUPS } from '../lib/search.ts';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { PAGES } from '../lib/i18n.ts';

const projects = [];
const index = buildIndex({ products, posts, projects, pages: PAGES });
const hrefs = (q) => search(index, q).map((e) => e.href);

// ดัชนีครบทุกรายการ
assert.equal(index.length, products.length + posts.length + projects.length + PAGES.length);
for (const p of products) assert.ok(index.some((e) => e.href === `/products/${p.slug}/`), `ไม่มีสินค้า ${p.slug}`);
for (const p of posts) assert.ok(index.some((e) => e.href === `/articles/${p.slug}/`), `ไม่มีบทความ ${p.slug}`);
assert.ok(PAGES.some((p) => p.href === '/room/'), 'หน้าเว็บต้องมี /room/');
assert.ok(index.every((e) => GROUPS.includes(e.group) && e.title.th && e.title.en));

// ไทย และอังกฤษ (ไม่สนตัวพิมพ์)
assert.ok(hrefs('ซิงก์').includes('/products/toccata-3644x-2kd/'));
assert.ok(hrefs('ELATE').includes('/products/elate-13963t-c4/'));
// ทุกคำต้องตรง
assert.deepEqual(hrefs('indio cast-iron'), ['/products/indio-3885x-2sd/']);
assert.deepEqual(hrefs('indio stainless'), []);
// ตรงชื่อมาก่อนตรงเนื้อหา
const kitchen = search(index, 'ครัว').filter((e) => e.group === 'articles');
const inTitle = (e) => e.title.th.includes('ครัว');
assert.ok(kitchen.findIndex((e) => !inTitle(e)) === -1 || kitchen.findIndex((e) => !inTitle(e)) > kitchen.findLastIndex(inTitle));
// จำกัดจำนวนต่อกลุ่ม
assert.ok(search(index, 'kohler', 2).filter((e) => e.group === 'products').length <= 2);
// ไม่พบ · ช่องว่างล้วน · อักขระพิเศษ
assert.deepEqual(hrefs('zzzzqqq'), []);
assert.deepEqual(hrefs('   '), []);
assert.deepEqual(hrefs(''), []);
assert.doesNotThrow(() => search(index, '( + [ \\ *'));
// หน้าเว็บ
assert.ok(hrefs('studio').includes('/room/'));
assert.ok(hrefs('ติดต่อ').includes('/contact/'));

console.log('ผ่าน: การค้นหา');
```

Add to `package.json` scripts:

```json
    "check:search": "node --no-warnings --experimental-strip-types scripts/check-search.mjs",
```

- [ ] **Step 2: Run it**

Run: `npm run check:search`
Expected: FAIL, `Cannot find module ... lib/search.ts`.

- [ ] **Step 3: Create `lib/search.ts`**

```ts
// ค้นหาในเว็บ: ดัชนีสร้างในเบราว์เซอร์จากข้อมูลที่มีอยู่แล้ว (เว็บเป็น static export ไม่มี server)
// ไฟล์นี้ไม่มี import เพื่อให้ scripts/check-search.mjs รันด้วย Node ได้
// ponytail: จับคู่แบบ substring ไล่ทุกรายการ พอสำหรับหลักร้อยรายการ · เกินนั้นค่อยทำดัชนีแบบ token

export type Name = { th: string; en: string };
export type Group = 'products' | 'articles' | 'projects' | 'pages';
export type Entry = { group: Group; href: string; title: Name; text: string };
export type Sources = {
  products: { slug: string; name: Name; series: string; category: string }[];
  posts: { slug: string; title: Name; excerpt: Name }[];
  projects: { slug: string; name: Name; location: Name; type: Name }[];
  pages: { href: string; title: Name }[];
};

export const GROUPS: Group[] = ['products', 'articles', 'projects', 'pages'];

const both = (n: Name) => `${n.th} ${n.en}`;

export function buildIndex(s: Sources): Entry[] {
  return [
    ...s.products.map((p): Entry => ({ group: 'products', href: `/products/${p.slug}/`, title: p.name, text: `${p.series} ${p.category} kohler` })),
    ...s.posts.map((p): Entry => ({ group: 'articles', href: `/articles/${p.slug}/`, title: p.title, text: both(p.excerpt) })),
    ...s.projects.map((p): Entry => ({ group: 'projects', href: `/projects/#${p.slug}`, title: p.name, text: `${both(p.location)} ${both(p.type)}` })),
    ...s.pages.map((p): Entry => ({ group: 'pages', href: p.href, title: p.title, text: '' })),
  ];
}

// ทุกคำในคำค้นต้องเจอ · ผลที่ตรงชื่อมาก่อนผลที่ตรงแค่เนื้อหา · ไม่เกิน perGroup รายการต่อกลุ่ม
export function search(index: Entry[], query: string, perGroup = 6): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: Entry[] = [];
  for (const group of GROUPS) {
    const inTitle: Entry[] = [];
    const inText: Entry[] = [];
    for (const e of index) {
      if (e.group !== group) continue;
      const title = both(e.title).toLowerCase();
      const all = `${title} ${e.text.toLowerCase()}`;
      if (!words.every((w) => all.includes(w))) continue;
      (words.every((w) => title.includes(w)) ? inTitle : inText).push(e);
    }
    out.push(...[...inTitle, ...inText].slice(0, perGroup));
  }
  return out;
}
```

- [ ] **Step 4: Add `NAV_LINKS`, `PAGES` and strings to `lib/i18n.ts`**

In `dict.th`, after `float`:

```ts
    search: {
      open: 'ค้นหา',
      close: 'ปิดการค้นหา',
      placeholder: 'ค้นหาสินค้า บทความ ผลงาน',
      hint: 'พิมพ์ชื่อสินค้า รุ่น หรือหัวข้อที่สนใจ',
      none: 'ไม่พบผลลัพธ์ ลองคำอื่น',
      groups: { products: 'สินค้า', articles: 'บทความ', projects: 'ผลงาน', pages: 'หน้าเว็บ' },
    },
```

In `dict.en`, after `float`:

```ts
    search: {
      open: 'Search',
      close: 'Close search',
      placeholder: 'Search products, journal, projects',
      hint: 'Type a product name, a model or a topic',
      none: 'No results. Try another word.',
      groups: { products: 'Products', articles: 'Journal', projects: 'Projects', pages: 'Pages' },
    },
```

At the end of the file, after `export type Dict`:

```ts
// เมนูหลัก: ใช้ทั้ง Nav และดัชนีค้นหา
export const NAV_LINKS = [
  { href: '/', key: 'home' },
  { href: '/about/', key: 'about' },
  { href: '/products/', key: 'products' },
  { href: '/catalog/', key: 'catalog' },
  { href: '/articles/', key: 'articles' },
  { href: '/contact/', key: 'contact' },
] as const;

// หน้าเว็บที่ค้นหาได้: เมนูหลัก + หน้าจำลองห้องครัว (ไม่อยู่ในเมนู)
export const PAGES = [
  ...NAV_LINKS.map((l) => ({ href: l.href as string, title: { th: dict.th.nav[l.key], en: dict.en.nav[l.key] } })),
  { href: '/room/', title: { th: dict.th.room.title, en: dict.en.room.title } },
];
```

- [ ] **Step 5: Run the check**

Run: `npm run check:search`
Expected: `ผ่าน: การค้นหา` (the assertions were run against the real data when this plan was written).

- [ ] **Step 6: Create `components/SearchPanel.tsx`**

```tsx
'use client';

// แผงค้นหาเต็มจอ: <dialog> แบบ modal (เบราว์เซอร์จัดการ focus, Escape และชั้นบนสุดให้)
// data-lenis-prevent: ไม่ให้ Lenis เลื่อนหน้าข้างหลังตอนเลื่อนผลค้นหา

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import { buildIndex, search, GROUPS } from '@/lib/search';
import { PAGES } from '@/lib/i18n';
import { products } from '@/lib/products';
import { posts } from '@/lib/posts';

const index = buildIndex({ products, posts, projects: [], pages: PAGES });

export default function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(index, query), [query]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery('');
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      onClose={onClose}
      aria-label={t.search.open}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-ink p-0 text-paper"
    >
      <div className="flex items-center gap-4 px-6 py-5 md:px-[4vw]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.open}
          className="h-12 min-w-0 flex-1 border-b border-paper/30 bg-transparent text-xl font-extralight tracking-wide text-paper placeholder:text-paper/40 focus-visible:border-paper focus-visible:outline-none"
        />
        <button type="button" onClick={onClose} aria-label={t.search.close} className="flex h-11 w-11 items-center justify-center text-2xl font-extralight focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper">
          ×
        </button>
      </div>
      <div className="px-6 pb-16 pt-4 md:px-[4vw]" aria-live="polite">
        {query.trim() === '' && <p className="text-sm font-light text-paper/60">{t.search.hint}</p>}
        {query.trim() !== '' && results.length === 0 && <p className="text-sm font-light text-paper/60">{t.search.none}</p>}
        {GROUPS.map((group) => {
          const items = results.filter((e) => e.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mb-8">
              <h2 className="mb-2 text-[11px] font-normal uppercase tracking-widest2 text-paper/50">{t.search.groups[group]}</h2>
              <ul>
                {items.map((e) => (
                  <li key={e.href}>
                    <Link href={e.href} onClick={onClose} className="flex min-h-11 items-center border-b border-paper/10 py-2 text-lg font-extralight tracking-wide hover:text-paper/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper">
                      {e.title[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 7: Wire into `components/Nav.tsx`**

- Delete the local `const LINKS = [...] as const;` and import it: `import { NAV_LINKS as LINKS, type Lang } from '@/lib/i18n';` (replaces the existing `import type { Lang }` line).
- Add `import SearchPanel from './SearchPanel';`
- Add state: `const [searching, setSearching] = useState(false);`
- Add this button component above `export default function Nav`:

```tsx
function SearchButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-11 w-11 items-center justify-center opacity-85 transition-opacity hover:opacity-100">
      <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    </button>
  );
}
```

- In the desktop `<nav>`, put `<SearchButton label={t.search.open} onClick={() => setSearching(true)} />` directly before `<LangSwitch />`.
- In the small-screen `<div className="pointer-events-auto flex items-center gap-4 md:hidden">`, put the same `<SearchButton … />` between `<LangSwitch />` and the menu button, and change `gap-4` to `gap-2`.
- After the mobile menu `<div>`, before the closing `</>`: `<SearchPanel open={searching} onClose={() => setSearching(false)} />`

- [ ] **Step 8: Run gates.** Expected: all pass.

- [ ] **Step 9: Browser check** on `http://localhost:4100/` at 1280 and 375:
  - the magnifier is visible in the header; clicking it opens the panel with the input focused (`showModal()` focuses the first focusable element, which is the input);
  - before typing the hint shows; typing `ซิงก์` lists products under "สินค้า"; typing `zzzz` shows the no-results line;
  - with a query that returns many results at 375, the results scroll inside the panel and `window.scrollY` of the page does not change;
  - Escape closes; × closes; clicking a result goes to that page and the panel is closed;
  - reopening shows an empty input;
  - EN: placeholder, hint and group headings are English, result titles are English.

- [ ] **Step 10: Commit and push**

```bash
git add lib/search.ts lib/i18n.ts scripts/check-search.mjs components/SearchPanel.tsx components/Nav.tsx package.json
git commit -m "feat: site search panel in the navigation"
git push origin room-studio
```

---

### Task 3: Announcement modal

**Files:**
- Create: `lib/announcement.ts`, `components/Announcement.tsx`
- Modify: `scripts/check-search.mjs`, `app/layout.tsx`, `lib/i18n.ts`

**Interfaces:**
- Produces: `ANNOUNCEMENT`, `shouldShow(a, storage)`, `markSeen(id, storage)` from `lib/announcement.ts`; `t.announce.close`.

- [ ] **Step 1: Add failing assertions to `scripts/check-search.mjs`**

Add the import at the top:

```js
import { ANNOUNCEMENT, shouldShow, markSeen } from '../lib/announcement.ts';
```

Add before the final `console.log`:

```js
// ── ประกาศตอนเข้าเว็บ (อยู่ในด่านเดียวกัน: ตรรกะสั้น ไม่คุ้มแยกสคริปต์) ──
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
const on = { enabled: true, id: 'a1' };
const s = mem();
assert.equal(shouldShow(on, s), true);
markSeen('a1', s);
assert.equal(shouldShow(on, s), false);
assert.equal(shouldShow({ enabled: true, id: 'a2' }, s), true); // id ใหม่ = แสดงอีกครั้ง
assert.equal(shouldShow({ enabled: false, id: 'a3' }, s), false);
assert.equal(shouldShow(on, null), true); // ไม่มี storage: แสดงทุกครั้งที่โหลดหน้า
assert.equal(shouldShow(on, broken), true);
assert.doesNotThrow(() => markSeen('a1', broken));
assert.ok(ANNOUNCEMENT.id && ANNOUNCEMENT.image.startsWith('/media/'));
for (const n of [ANNOUNCEMENT.title, ANNOUNCEMENT.body, ANNOUNCEMENT.cta.label]) assert.ok(n.th.trim() && n.en.trim() && !/[\u0E4E\u2013\u2014]/.test(n.th + n.en));
```

Change the last line to `console.log('ผ่าน: การค้นหา และประกาศ');`

- [ ] **Step 2: Run it**

Run: `npm run check:search`
Expected: FAIL, `Cannot find module ... lib/announcement.ts`.

- [ ] **Step 3: Create `lib/announcement.ts`**

```ts
// ประกาศที่เด้งตอนเข้าเว็บ · แก้เนื้อหาที่นี่ที่เดียว
// enabled: false = ปิดประกาศ · เปลี่ยน id = ประกาศใหม่ ผู้ที่เคยปิดไปแล้วจะเห็นอีกครั้ง
// ไฟล์นี้ไม่มี import เพื่อให้ scripts/check-search.mjs รันด้วย Node ได้
// ── เนื้อหาตัวอย่าง รอของจริงจากลูกค้า ──

export const ANNOUNCEMENT = {
  enabled: true,
  id: '2026-10-showroom',
  image: '/media/scenes/about-hero.webp',
  title: { th: 'นัดชมโชว์รูม ITERRA', en: 'Visit the ITERRA showroom' },
  body: {
    th: 'สัมผัสก๊อกและซิงก์ครัวรุ่นจริง พร้อมที่ปรึกษาช่วยเลือกให้เข้ากับครัวของคุณ นัดหมายล่วงหน้าได้ทุกวัน',
    en: 'See the faucets and sinks in person, with a consultant to help you choose what fits your kitchen. Book any day of the week.',
  },
  cta: { label: { th: 'นัดหมายเข้าชม', en: 'Book a visit' }, href: '/contact/' },
};

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const key = (id: string) => `announcement:${id}`;

// storage ใช้ไม่ได้ (โหมดส่วนตัว, ถูกบล็อก) = แสดง ไม่พัง
export function shouldShow(a: { enabled: boolean; id: string }, storage: Store | null): boolean {
  if (!a.enabled) return false;
  try {
    return storage?.getItem(key(a.id)) !== '1';
  } catch {
    return true;
  }
}

export function markSeen(id: string, storage: Store | null): void {
  try {
    storage?.setItem(key(id), '1');
  } catch {
    // จำไม่ได้ก็ไม่เป็นไร: ประกาศจะขึ้นอีกเมื่อโหลดหน้าใหม่
  }
}
```

- [ ] **Step 4: Run the check**

Run: `npm run check:search`
Expected: `ผ่าน: การค้นหา และประกาศ`

- [ ] **Step 5: Add the string, the component, and mount it**

`lib/i18n.ts`: in `dict.th` after `search`: `announce: { close: 'ปิดประกาศ' },` and in `dict.en`: `announce: { close: 'Close announcement' },`

Create `components/Announcement.tsx`:

```tsx
'use client';

// ประกาศตอนเข้าเว็บ: เปิดราว 1 วินาทีหลังหน้าแรกของรอบนั้นโหลด ครั้งเดียวต่อการเปิดแท็บ (sessionStorage)
// อยู่ใน layout จึง mount ครั้งเดียวต่อการโหลดเว็บ ไม่เด้งซ้ำตอนเปลี่ยนหน้า

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import { ANNOUNCEMENT as A, markSeen, shouldShow } from '@/lib/announcement';

// การอ่าน window.sessionStorage เองก็โยน error ได้เมื่อเบราว์เซอร์บล็อกข้อมูลไซต์
const store = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export default function Announcement() {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!shouldShow(A, store())) return;
    const timer = setTimeout(() => {
      // มี dialog อื่นเปิดอยู่ (กำลังค้นหา): ไม่เด้งทับ รอบนี้ข้ามไป
      if (document.querySelector('dialog[open]')) return;
      ref.current?.showModal();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      aria-labelledby="announcement-title"
      onClose={() => markSeen(A.id, store())}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="w-[min(92vw,440px)] bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="relative">
        <img src={A.image} alt="" className="aspect-[16/9] w-full object-cover" />
        <button type="button" onClick={close} aria-label={t.announce.close} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center bg-paper text-2xl font-extralight text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
          ×
        </button>
      </div>
      <div className="p-6">
        <h2 id="announcement-title" className="text-xl font-light tracking-wide">{A.title[lang]}</h2>
        <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{A.body[lang]}</p>
        <Link href={A.cta.href} onClick={close} className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-[11px] font-normal uppercase tracking-widest2 text-paper hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink">
          {A.cta.label[lang]}
        </Link>
      </div>
    </dialog>
  );
}
```

`app/layout.tsx`: `import Announcement from '@/components/Announcement';` and `<Announcement />` after `<FloatingActions />`.

- [ ] **Step 6: Run gates.** Expected: all pass. `check:overflow` opens each page fresh, so the dialog may be open while it measures; it must still report no overflow.

- [ ] **Step 7: Browser check** at 1280 and 375. Clear the key first with `sessionStorage.clear()` then reload:
  - the dialog appears about one second after load, on `/` and also when the first page is `/products/`;
  - closing by ×, by Escape, and by clicking the backdrop each writes `sessionStorage['announcement:2026-10-showroom'] === '1'`;
  - after closing, reload: it does not appear; navigate to other pages: it does not appear;
  - the call to action goes to `/contact/` and the dialog is closed;
  - clear storage, reload, open the search panel within the first second: the announcement does not open over it;
  - at 375 the dialog fits the screen with no horizontal scroll;
  - EN: title, body, button and close label are English.

- [ ] **Step 8: Commit and push**

```bash
git add lib/announcement.ts components/Announcement.tsx scripts/check-search.mjs app/layout.tsx lib/i18n.ts
git commit -m "feat: announcement modal on first page of a session"
git push origin room-studio
```

---

### Task 4: Project Reference page and menu

**Files:**
- Create: `lib/projects.ts`, `app/projects/page.tsx`, `components/ProjectsContent.tsx`
- Modify: `lib/i18n.ts`, `components/Nav.tsx`, `components/Footer.tsx`, `components/SearchPanel.tsx`, `app/sitemap.ts`, `scripts/check-search.mjs`

**Interfaces:**
- Consumes: `buildIndex` `Sources.projects` shape `{ slug; name; location; type }` (Task 2); `NAV_LINKS`, `PAGES` (Task 2).
- Produces: `projects: Project[]` from `lib/projects.ts`.

- [ ] **Step 1: Make the check fail**

In `scripts/check-search.mjs` replace `const projects = [];` with `import { projects } from '../lib/projects.ts';` (move it up with the other imports) and add before the announcement block:

```js
// ── ผลงาน ──
assert.equal(projects.length, 6);
assert.equal(new Set(projects.map((p) => p.slug)).size, projects.length);
for (const p of projects) {
  assert.ok(index.some((e) => e.href === `/projects/#${p.slug}`), `ไม่มีผลงาน ${p.slug}`);
  for (const n of [p.name, p.location, p.type]) assert.ok(n.th.trim() && n.en.trim() && !/[\u0E4E\u2013\u2014]/.test(n.th + n.en));
  assert.ok(p.image.startsWith('/media/') && p.year > 2000);
  assert.ok(p.products.length > 0);
  for (const slug of p.products) assert.ok(products.some((x) => x.slug === slug), `${p.slug}: ไม่มีสินค้า ${slug}`);
}
assert.ok(hrefs('เขาใหญ่').includes('/projects/#khao-yai-villa'));
assert.ok(hrefs('penthouse').includes('/projects/#sukhumvit-penthouse'));
assert.ok(PAGES.some((p) => p.href === '/projects/'), 'เมนูต้องมี /projects/');
```

Run: `npm run check:search`
Expected: FAIL, `Cannot find module ... lib/projects.ts`.

- [ ] **Step 2: Create `lib/projects.ts`**

```ts
// ── ข้อมูลตัวอย่าง ── ผลงานอ้างอิง รอข้อมูลโครงการจริงจากลูกค้า (ชื่อ ที่ตั้ง ปี ภาพ สินค้าที่ใช้)
// products = slug ใน lib/products.ts · scripts/check-search.mjs ตรวจว่ามีจริง
// ไฟล์นี้ไม่มี import เพื่อให้สคริปต์ตรวจรันด้วย Node ได้

type Name = { th: string; en: string };
export type Project = { slug: string; name: Name; location: Name; type: Name; year: number; image: string; products: string[] };

const g = (name: string) => `/media/gallery/${name}.webp`;
const BKK = { th: 'กรุงเทพฯ', en: 'Bangkok' };
const CONDO = { th: 'คอนโดมิเนียม', en: 'Condominium' };

export const projects: Project[] = [
  { slug: 'sukhumvit-penthouse', name: { th: 'เพนต์เฮาส์สุขุมวิท', en: 'Sukhumvit Penthouse' }, location: BKK, type: CONDO, year: 2026, image: g('k-night'), products: ['elate-13963t-c4', 'toccata-3644x-2kd'] },
  { slug: 'khao-yai-villa', name: { th: 'วิลล่าเขาใหญ่', en: 'Khao Yai Villa' }, location: { th: 'นครราชสีมา', en: 'Nakhon Ratchasima' }, type: { th: 'บ้านพักตากอากาศ', en: 'Holiday home' }, year: 2025, image: g('k-timber'), products: ['taut-21366t-4', 'indio-3885x-2sd'] },
  { slug: 'ari-townhome', name: { th: 'ทาวน์โฮมอารีย์', en: 'Ari Townhome' }, location: BKK, type: { th: 'ทาวน์โฮม', en: 'Townhome' }, year: 2025, image: g('k-blue'), products: ['kumin-99480t-4', 'toccata-3645x-2kd'] },
  { slug: 'hua-hin-beach-house', name: { th: 'บ้านริมหาดหัวหิน', en: 'Hua Hin Beach House' }, location: { th: 'ประจวบคีรีขันธ์', en: 'Prachuap Khiri Khan' }, type: { th: 'บ้านเดี่ยว', en: 'Private house' }, year: 2024, image: g('k-dusk'), products: ['elate-15609x-4', 'marcato-3676x-2kd'] },
  { slug: 'nimman-cafe', name: { th: 'คาเฟ่นิมมาน', en: 'Nimman Café' }, location: { th: 'เชียงใหม่', en: 'Chiang Mai' }, type: { th: 'ร้านอาหารและคาเฟ่', en: 'Café and restaurant' }, year: 2024, image: g('k-dining'), products: ['taut-21370t-4cd', 'toccata-3645x-2kd'] },
  { slug: 'sathorn-residence', name: { th: 'เรสซิเดนซ์สาทร', en: 'Sathorn Residence' }, location: BKK, type: CONDO, year: 2023, image: g('k-stone'), products: ['kumin-30946t-4', 'toccata-3644x-2kd'] },
];
```

- [ ] **Step 3: Strings and menu entry in `lib/i18n.ts`**

`dict.th.nav`: add `projects: 'ผลงาน',` after `articles`. `dict.en.nav`: add `projects: 'Project Reference',` after `articles`.

`dict.th`, after `announce`:

```ts
    projects: {
      title: 'ผลงานอ้างอิง',
      sub: 'โครงการที่เลือกใช้ก๊อกและซิงก์จาก ITERRA',
      sample: 'ข้อมูลในหน้านี้เป็นตัวอย่างสำหรับเดโม',
      used: 'สินค้าที่ใช้',
    },
```

`dict.en`, after `announce`:

```ts
    projects: {
      title: 'Project Reference',
      sub: 'Projects fitted with faucets and sinks from ITERRA',
      sample: 'The entries on this page are samples for the demo.',
      used: 'Products used',
    },
```

`NAV_LINKS`: add `{ href: '/projects/', key: 'projects' },` between `articles` and `contact`.

- [ ] **Step 4: Wire projects into the search panel**

`components/SearchPanel.tsx`: add `import { projects } from '@/lib/projects';` and change the index line to `const index = buildIndex({ products, posts, projects, pages: PAGES });`

Run: `npm run check:search`
Expected: `ผ่าน: การค้นหา และประกาศ`

- [ ] **Step 5: Create the page**

`app/projects/page.tsx`:

```tsx
import type { Metadata } from 'next';
import ProjectsContent from '@/components/ProjectsContent';

export const metadata: Metadata = {
  title: 'ผลงานอ้างอิง — Project Reference',
  description: 'ผลงานอ้างอิงของ ITERRA โครงการที่เลือกใช้ก๊อกและซิงก์ครัวพรีเมียมจาก KOHLER',
  alternates: { canonical: '/projects/' },
};

export default function ProjectsPage() {
  return <ProjectsContent />;
}
```

(The em dash in `title` follows the existing pages' metadata pattern, for example `app/contact/page.tsx`.)

`components/ProjectsContent.tsx`:

```tsx
'use client';

// หน้าผลงานอ้างอิง: การ์ดโครงการ (ภาพ ชื่อ ที่ตั้ง ประเภท ปี สินค้าที่ใช้) · ไม่มีหน้ารายละเอียดรายโครงการ
// id ของการ์ด = slug ให้ผลค้นหาลิงก์มาที่ /projects/#slug ได้

import Link from 'next/link';
import Reveal from './Reveal';
import Placeholder from './Placeholder';
import { useLang } from './LangProvider';
import { projects } from '@/lib/projects';
import { getProduct } from '@/lib/products';

export default function ProjectsContent() {
  const { lang, t } = useLang();
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">PROJECT REFERENCE</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.projects.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.projects.sub}</p>
          <p className="mt-2 text-xs font-normal text-stone-600">{t.projects.sample}</p>
        </Reveal>
      </section>
      <section className="px-6 pb-28 md:px-[8vw]">
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.12} y={30}>
              <article id={p.slug} className="scroll-mt-28">
                <Placeholder src={p.image} label={p.name[lang]} ratio="3/2" />
                <p className="mt-5 text-[10px] uppercase tracking-widest2 text-warm-500">
                  {p.type[lang]} · {p.location[lang]} · {p.year}
                </p>
                <h2 className="mt-2 text-lg font-light leading-snug tracking-wide">{p.name[lang]}</h2>
                <p className="mt-3 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">{t.projects.used}</p>
                <ul className="mt-1">
                  {p.products.map((slug) => {
                    const product = getProduct(slug);
                    return product ? (
                      <li key={slug}>
                        <Link href={`/products/${slug}/`} className="inline-flex min-h-11 items-center text-[13px] font-light underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
                          {product.name[lang]}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 6: Menu, footer, sitemap**

`components/Nav.tsx` (seven entries plus search and language do not fit at 768, so the desktop menu starts at `lg`):
- desktop `<nav>`: `hidden items-center gap-6 md:flex lg:gap-8` becomes `hidden items-center gap-5 lg:flex xl:gap-8`
- small-screen wrapper: `md:hidden` becomes `lg:hidden`
- mobile menu container: `md:hidden` becomes `lg:hidden`
- Leave `md:px-[4vw]` as it is.

`components/Footer.tsx`: add after the articles `<li>`:

```tsx
            <li><Link href="/projects/" className="text-paper/75 hover:text-paper">{t.nav.projects}</Link></li>
```

`app/sitemap.ts`: the `staticPages` array becomes `['', '/about/', '/products/', '/catalog/', '/articles/', '/projects/', '/contact/']`.

- [ ] **Step 7: Run gates.** Expected: all pass; `npm run build` lists `/projects`.

- [ ] **Step 8: Browser check**
  - 1280 and 1024, TH and EN: the desktop menu shows seven entries, search and language on one line. Run in the page: `(() => { const n = document.querySelector('header nav'); const l = document.querySelector('header a'); return n.getBoundingClientRect().left - l.getBoundingClientRect().right; })()`. Expected: at least 24. If it is less at 1024 in EN, stop and report (off-plan: the label or the breakpoint needs the owner's decision).
  - 768 and 375: the hamburger shows; the mobile menu lists seven entries and none is cut off at 375 height 667.
  - `/projects/` at 1280, 768, 375: six cards, images load, each product link opens the right product page; EN switches every label.
  - Search `เขาใหญ่`: the result under "ผลงาน" opens `/projects/#khao-yai-villa` and the card is in view below the header.
  - Footer has the new link; `out/sitemap.xml` contains `/projects/`.

- [ ] **Step 9: Commit and push**

```bash
git add lib/projects.ts lib/i18n.ts app/projects components/ProjectsContent.tsx components/Nav.tsx components/Footer.tsx components/SearchPanel.tsx app/sitemap.ts scripts/check-search.mjs
git commit -m "feat: project reference page and menu entry"
git push origin room-studio
```

---

## Not in this plan

Enter key jumping to the first search result, keyboard arrow navigation between results, highlight of the matched text, project detail pages, a PR to `main`.
