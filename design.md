# Design: ITERRA

Locked design system, written from the code as it stands. Future Hallmark runs
read this file first, and new pages follow it. Change it on purpose, in the same
commit as the code that needs the change.

## System

- Genre: editorial
- Tone: quiet luxury. Thin type, warm neutrals, a lot of empty paper.
- Axes: light paper / thin geometric sans / neutral (no chromatic accent)
- Page shape: label, large thin heading, short grey intro, then image-led sections
- Languages: Thai and English on every page, switched in place

## Tokens

`tailwind.config.ts` is the source of truth. The OKLCH values are the same
colours, computed from the hex values, for use outside Tailwind.

| Token | Tailwind | Hex | OKLCH | Use |
| --- | --- | --- | --- | --- |
| paper | `paper` | `#faf9f7` | `oklch(98.2% 0.003 85)` | Page background |
| ink | `ink` | `#1c1917` | `oklch(21.6% 0.006 56)` | Text, borders, dark sections |
| warm 100 | `warm-100` | `#f5f4f1` | `oklch(96.7% 0.004 91)` | Product image background |
| warm 200 | `warm-200` | `#e9e7e2` | `oklch(92.8% 0.007 89)` | Photo placeholder background |
| warm 300 | `warm-300` | `#d6d3cc` | `oklch(86.7% 0.010 87)` | Hairline borders |
| warm 400 | `warm-400` | `#a8a29e` | `oklch(71.6% 0.009 56)` | Decoration only, never text on paper |
| warm 500 | `warm-500` | `#78716c` | `oklch(55.3% 0.012 58)` | Labels and intro text, at 11px or larger |
| stone 600 | `stone-600` | Tailwind default | | Small secondary text that must pass contrast |

One colour sits outside the palette: LINE green `#06C755`
(`oklch(72.4% 0.205 149)`), on the floating LINE button only.

Dialog backdrops use ink at 60% (`backdrop:bg-ink/60`).

## Typography

- Family: `Inter`, then `Noto Sans Thai`, then `system-ui`. One family, no display face.
- Weights loaded: 200, 300, 400, 500. Body is 300 (`font-light`).
- Page heading (h1): `text-4xl font-extralight tracking-wide md:text-5xl`
- Section heading (h2): `text-3xl font-extralight tracking-wide md:text-4xl`
- Card heading: `text-lg font-light leading-snug tracking-wide`
- Label: `text-[11px] uppercase tracking-widest2 text-warm-500`, where
  `tracking-widest2` is `0.22em`. Use `text-[10px]` for card metadata.
- Intro text: `text-sm font-light leading-relaxed text-warm-500`, `max-w-lg`
- Small text at 11px on paper needs `font-normal`. Light weight at that size
  fails contrast.
- Headings stay upright. No italics.

## Layout

- Page gutter: `px-6`, then `md:px-[8vw]`. Tighter sections use `md:px-[6vw]` or `md:px-[4vw]`.
- First section clears the fixed nav: `pt-36 md:pt-44`.
- Card grid: `grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3`
- Image ratios in use: `16/9`, `21/9`, `3/2`, `4/5`, `1/1`. Images fill the frame with `object-cover`.
- Corners are square. `rounded-full` is for colour swatches and the floating buttons only.
- No shadows. Separation comes from space and `warm-300` hairlines.
- The nav switches to the mobile menu below `lg`.

## Buttons and links

- Primary button: `border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper`
- Text link: `underline-offset-4 hover:underline`
- Every control is at least 44px tall or wide (`min-h-11`, `h-11 w-11`).
- Focus ring: `focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink`. Use `outline-paper` on dark sections. The ring appears at once, never animated.
- Panels and announcements are native `<dialog>` elements opened with `showModal()`.

## Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` in CSS, `power3.out` in GSAP.
- Scroll: Lenis, `lerp: 0.08`.
- Entry: `Reveal` clips up from the bottom with a fade, 1.1s, once per element.
- Hover colour changes: 300ms.
- Project cards on hover: scale to 1.04 over 0.5s, and a random image slides in over 0.7s every 2 seconds. Mouse only.
- Animate `transform`, `opacity` and `clip-path` only.
- Reduced motion: `globals.css` cuts every animation and transition to near zero, and components that loop must not start.

## Back office

Status: proposed on 2026-10-12, before any back office code exists. There is no
mockup: this section is the reference. Parts that depend on how the backend is
built are left out until that is decided.

Audience: shop staff who are not technical. Mostly desktop, sometimes a phone.
Interface text is Thai only. Content is entered in Thai and English.

### How it differs from the public site

- Body text is weight 400 (`font-normal`), not 300. Staff read and type for long stretches.
- Inputs are 16px (`text-base`), so iOS does not zoom the page on focus.
- Labels are plain Thai, `text-sm font-normal text-ink`. No uppercase and no wide tracking: `tracking-widest2` is for short Latin labels and pulls Thai words apart.
- No scroll effects: no Lenis, no `Reveal`, no parallax. Hover and focus changes only.
- Same palette, square corners and hairlines. Still no shadows.

### Colour use

Contrast is measured against paper (`#faf9f7`).

| Colour | Contrast | Use in the back office |
| --- | --- | --- |
| ink | 16.62:1 | Body text, headings, primary buttons |
| stone 600 | 7.25:1 | Hints, secondary text, table headers |
| warm 500 | 4.56:1 | Short Latin labels at weight 400 only. Not for body text. |
| warm 400 | 2.40:1 | Never text |
| danger `#9f2d20` | 6.95:1 | Delete buttons and error text only |

`danger` is a new token. Add it to `tailwind.config.ts` in the first back office
commit. Colour is never the only signal: an error always has text, and a status
tag always has a word.

### Shell

- From `lg`: `grid lg:grid-cols-[15rem_minmax(0,1fr)]`. The left rail holds the wordmark, three links (บทความ, ผลงาน, แคตตาล็อก), a link that opens the public site in a new tab, and at the bottom the signed-in name and ออกจากระบบ. The rail has `border-r border-warm-300`.
- Below `lg`: a top bar with the wordmark and a menu button. The links open in a native `<dialog>`.
- Link: `block min-h-11 border-l border-transparent pl-3 text-stone-600 hover:text-ink`. Current page: `aria-current="page"` with `border-ink text-ink`.
- Content column: `px-6 py-8 md:px-10 md:py-12`. Lists use `max-w-5xl`, forms use `max-w-2xl`.

### Page header

- Title: `text-2xl font-extralight tracking-wide md:text-3xl`.
- Under it, the number of records in `text-sm text-stone-600`.
- One primary action on the right, named for what it does: เพิ่มบทความ.

### List

- Columns: รูป (thumbnail, `3/2`, 64px wide), ชื่อ (Thai title, English under it in stone 600), สถานะ, แก้ไขล่าสุด, and the row actions.
- Header cell: `text-xs font-normal text-stone-600` with `border-b border-ink`.
- Row: `border-b border-warm-300`, at least 64px tall. The title is the link to the edit form.
- Row actions are text buttons, each `min-h-11`: แก้ไข, ซ่อน or แสดง, ลบ.
- Order: last edited first. From 21 records up, show a filter box and pages of 20.
- Below `md`: each row becomes a stacked block. The page never scrolls sideways.

### Status tag

`inline-block border px-2.5 py-1 text-xs font-normal`, then:

- เผยแพร่: `border-ink bg-ink text-paper`
- ซ่อน: `border-ink text-ink`
- ฉบับร่าง: `border-dashed border-warm-500 text-stone-600`

### Form

- One column, `max-w-2xl`, `space-y-8`. Related fields sit under a section heading, `text-base font-medium`.
- A field reads top to bottom: label, hint, control, error.
- Label: `mb-2 block text-sm font-normal text-ink`. A required field ends with "(จำเป็น)" in stone 600. Never an asterisk alone.
- Text input: `h-11 w-full border border-warm-300 bg-paper px-3 text-base font-normal text-ink`, plus the focus ring from Buttons and links. A textarea uses `min-h-32 py-2.5` in place of `h-11`.
- Hint: `mt-1.5 text-xs font-normal text-stone-600`.
- Error: `mt-1.5 text-sm font-normal text-danger`. It says what to do: กรุณากรอกชื่อบทความ. The control gets `aria-invalid`, `aria-describedby` and `border-danger`.
- Validate when a field loses focus and on submit, not on each keystroke. When a submit fails, focus moves to the first invalid field, and a line above the form says how many fields need attention.
- Bilingual field: two controls, `grid gap-4 md:grid-cols-2`, Thai first. Each label starts with ไทย or English.
- Short fixed list (project type): native `<select>` with the input classes.
- Products used in a project: native checkboxes in a list with a filter box, each row `min-h-11`.

### Action bar

- `sticky bottom-0 border-t border-warm-300 bg-paper py-4`, at the foot of the form column.
- Left: a status line with `role="status"`: บันทึกแล้ว 14:32, or ยังไม่ได้บันทึก.
- Right: ยกเลิก (text link), บันทึกฉบับร่าง (outline), เผยแพร่ (solid).
- Solid button: `inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-sm font-normal text-paper hover:bg-paper hover:text-ink`.
- Outline button: `inline-flex min-h-11 items-center border border-ink px-6 text-sm font-normal hover:bg-ink hover:text-paper`.
- Leaving with unsaved changes asks first.

### Upload

- Drop zone: `border border-dashed border-warm-500 bg-warm-100 px-6 py-10 text-center`. It is also a button: a click or Enter opens the file picker. While a file is over it: `border-ink`.
- Text: ลากไฟล์มาวาง หรือกดเพื่อเลือกไฟล์, with the limits under it in stone 600.
- Each file gets a row: name, size, a progress bar (`h-1 bg-warm-200` track, `bg-ink` fill, scaled with `transform`), and a step in Thai: กำลังอัปโหลด, กำลังประมวลผล, เสร็จแล้ว, ไม่สำเร็จ.
- A failed row gives the reason in danger text, with ลองใหม่ and นำออก. The other files carry on.
- Project images: a grid of thumbnails. The first is the cover and is marked ภาพปก. Reorder with เลื่อนขึ้น and เลื่อนลง buttons. Dragging may be added, but never as the only way.
- Catalogue PDF: one file. After upload the step reads กำลังสร้างภาพตัวอย่าง with the page count. The old catalogue stays live until the new one is ready.
- Proposed limits, to confirm against the server: 5 MB for an image (JPG, PNG, WebP), 50 MB for the PDF. The current catalogue is 18 MB.

### Confirm dialog

- Native `<dialog>` opened with `showModal()`: `w-[min(92vw,440px)] bg-paper p-0 text-ink backdrop:bg-ink/60`.
- The title names the record: ลบบทความ followed by its title.
- The body says what will happen and that it cannot be undone.
- Buttons: ยกเลิก, which has focus when the dialog opens, and ลบ (`border border-danger bg-danger text-paper`).
- Only deleting asks. Hiding does not.

### States every screen needs

- Loading: blocks of `bg-warm-100` in the shape of the content, with visually hidden text กำลังโหลด.
- Empty: one sentence and the primary action. ยังไม่มีบทความ, then เพิ่มบทความ.
- Failed to load: what failed, in plain Thai, and ลองใหม่.
- Session ended: go to the login page, then back to the same page after signing in.
- Saving: the button reads กำลังบันทึก and is disabled. The fields stay readable.

### Control states

| State | Button | Input |
| --- | --- | --- |
| Default | As in Action bar | `border-warm-300` |
| Hover | Colours invert | `border-warm-500` |
| Focus | Focus ring | Focus ring |
| Active | `active:scale-[0.98]` | No change |
| Disabled | `opacity-40 cursor-not-allowed`, label stays | `bg-warm-100 text-stone-600` |
| Loading | Label reads กำลังบันทึก, `aria-busy="true"` | No change |
| Error | No change | `border-danger` and the error text |
| Success | Returns to default, status line updates | Returns to default |

### Login

- One centred column, `max-w-sm`: wordmark, อีเมล, รหัสผ่าน, เข้าสู่ระบบ.
- Wrong details give one message for both fields: อีเมลหรือรหัสผ่านไม่ถูกต้อง. It never says which one was wrong.
- The password field has a button to show or hide the text.
- Lockout after repeated failures is set in `docs/pm/standards.md`.

### Open decisions

These need the spec before the forms are built.

1. Article body: plain paragraphs with images between them, or a rich text editor.
2. Draft: do all three content types have ฉบับร่าง, or only เผยแพร่ and ซ่อน.
3. English: required to publish, or optional with the Thai text shown in its place.
4. Deleting: every staff account, or one owner account.
5. File limits against the server's disk and memory.

## Code patterns

Only what holds whichever way the backend is built.

### Names

- Routes: plural nouns, kebab-case, no verbs. `/api/articles`, `/api/projects`, `/api/catalogs`. Back office pages live under `/admin/`.
- JSON fields: camelCase.
- Bilingual text is one object, `{ "th": "...", "en": "..." }`: the `Name` type already in `lib/`.
- Language codes follow ISO 639-1: `th` and `en`, as the `Lang` type.
- Public URLs use `slug`: lowercase Latin letters, digits and hyphens. Each record also has an `id` that never changes.
- Components are `PascalCase.tsx`. Files in `lib/` stay import-free when a check script reads them. Check scripts are `scripts/check-*.mjs`.

### Dates

- Stored and sent as ISO 8601 in UTC: `2026-10-23T02:30:00Z`. A date without a time: `2026-10-23`.
- Shown in the Asia/Bangkok time zone. The Thai interface shows the Buddhist year. The conversion happens at display and nowhere else.
- Every record has `createdAt` and `updatedAt`.

### Responses

- One record: the object itself.
- A list: `{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`
- An error: `{ "error": { "code": "VALIDATION_FAILED", "message": "กรุณาตรวจข้อมูลที่กรอก", "fields": { "title.th": "กรุณากรอกชื่อบทความ" } } }`
- `message` and `fields` are Thai and ready to show. `code` is English in upper snake case, for the code to branch on.
- Status codes: 400 malformed request, 401 not signed in, 403 not allowed, 404 not found, 409 conflict such as a slug already in use, 413 file too large, 422 validation failed, 500 server fault. A 500 never shows the raw error to staff.

### Git

- One branch per task, cut from `origin/main` with `--no-track`: `feat/admin-articles-form`.
- Conventional Commits: `feat:`, `fix:`, `docs:`. One commit is one task that passes the checks.
- One pull request per deploy round. Nobody pushes to `main`.
- Before a commit: `npx tsc --noEmit`, the `check:*` scripts that apply, and `npm run build`.

## Rules

- Colours come from the tokens above. No raw hex in components, apart from LINE green and, once it is in `tailwind.config.ts`, `danger`.
- Thai text must not contain U+0E4E. Text must not contain an en dash.
- No arrows and no emoji in interface text.
- New interface text goes in `lib/i18n.ts`, in both languages.
- Sample content (projects, announcement, privacy policy, LINE ID) is labelled as sample until the client supplies the real content.
