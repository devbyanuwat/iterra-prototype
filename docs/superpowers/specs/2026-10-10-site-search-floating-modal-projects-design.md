# Site search, floating buttons, announcement modal, project reference

Branch `room-studio`. Static export (`output: 'export'`), no server code.

## What the owner asked for

1. A search button in the top navigation.
2. A go-to-top button.
3. An announcement modal when a visitor enters the site.
4. A "Project Reference" menu item.
5. A LINE chat button at the bottom right, under the go-to-top button.

Decided with the owner: no mockup, build on the real site. Search covers products, articles, projects and site pages. The modal shows once per browser session. The project page uses sample content until the client supplies real projects.

## A. Floating buttons (items 2 and 5)

`components/FloatingActions.tsx`, mounted once in `app/layout.tsx`.

- Fixed stack at the bottom right: go-to-top above, LINE below.
- Go-to-top is hidden until the page is scrolled past one viewport height. It scrolls with the site's Lenis instance. `components/SmoothScroll.tsx` exports `scrollToTop()`, which falls back to `window.scrollTo(0, 0)` when Lenis is not running (reduced motion).
- LINE is always visible. It links to `https://line.me/R/ti/p/` + `CONTACT.line`, opens in a new tab with `rel="noopener"`. It uses LINE green (`#06C755`), the one colour outside the site palette.
- Both are at least 44 px, have an accessible name in the current language, and sit above page content but below the mobile menu, the search panel and the modal.

## B. Search (item 1)

- `lib/search.ts` (import-free logic, so a Node script can test it): `buildIndex(sources)` and `search(index, query)`. An entry is `{ group, href, title: Name, text }`. Matching is a case-insensitive substring test on Thai and English title plus `text`, every query word must match. Title matches sort before text-only matches. Results are capped per group.
- Groups: products (name, series, category), articles (title, excerpt), projects (name, location, type), pages (the navigation entries plus `/room/`).
- `components/SearchPanel.tsx`: a full-screen panel in the style of the mobile menu, with a text input that is focused on open, live results grouped under headings, an empty hint before typing, and a no-results line. Escape and a close button close it. Choosing a result navigates and closes.
- `components/Nav.tsx`: a magnifier button before the language switch on wide screens, and next to the menu button on small screens.

## C. Announcement modal (item 3)

- `lib/announcement.ts`: `{ enabled, id, image, title: Name, body: Name, cta: { label: Name, href } }`. Sample content invites the visitor to book a showroom visit and links to `/contact/`.
- `components/Announcement.tsx`, mounted in the layout. It opens a native `<dialog>` with `showModal()` about one second after the first page of a session loads, whichever page that is. Closing it writes `sessionStorage['announcement:' + id]`, so it stays closed until the tab is closed. A new `id` shows it again.
- Closes by the × button, Escape, a click on the backdrop, or following the call to action.
- Does nothing when `enabled` is false or when `sessionStorage` is unavailable (then it shows once per page load and closing still works).

## D. Project reference (item 4)

- `lib/projects.ts`: six sample projects, `{ slug, name: Name, location: Name, type: Name, year, image, products: string[] }`. Images come from `public/media/gallery` and `public/media/scenes`. `products` holds product slugs that exist in `lib/products.ts`.
- `app/projects/page.tsx` + `components/ProjectsContent.tsx`: a heading, a short line stating the entries are samples, and a card grid. Each card shows the image, name, location, type, year and links to the products used. No per-project detail page.
- Navigation: a seventh entry, "ผลงาน" / "Project Reference", in the desktop menu, the mobile menu, the footer and `app/sitemap.ts`.
- If seven entries plus search and language do not fit at 768 px, the switch to the mobile menu moves from `md` to `lg`.

## Not in this change

Server-side search, a back office for the announcement, an embedded LINE chat widget, real project content, project detail pages.

## Checks

- `scripts/check-search.mjs` (`npm run check:search`): the index contains every product, post, project and page; a Thai query and an English query each find a known product; a query with no match returns nothing; every project's product slugs exist.
- `tsc`, `build`, `check:overflow`, the U+0E4E scan.
- Browser pass at 1280, 768 and 375: each of the five items, in Thai and English for the labels that change.

## Tasks

A. Floating buttons. B. Search. C. Announcement modal. D. Project reference page and menu. Task B's project group is wired in task D, when `lib/projects.ts` exists.
