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

## Rules

- Colours come from the tokens above. No raw hex in components, apart from LINE green.
- Thai text must not contain U+0E4E. Text must not contain an en dash.
- No arrows and no emoji in interface text.
- New interface text goes in `lib/i18n.ts`, in both languages.
- Sample content (projects, announcement, privacy policy, LINE ID) is labelled as sample until the client supplies the real content.
