import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette measured off kohler.co.th — see
        // docs/superpowers/specs/2026-09-01-iterra-kohler-derived-system.md §3.1
        //
        // The product photography was shot on white, so a light page is the
        // honest ground for it. The keying work still pays: a transparent PNG
        // on a white card has no box edge, an unkeyed one does.
        base: '#E5E5E5',
        surface: '#FFFFFF',
        ink: '#232323',
        // สเปก §3.1 วัด #666666 มาจาก kohler.co.th ซึ่งถูก แต่ของเขาวางตัวรองไว้
        // บน "การ์ดขาว" เป็นหลัก — #666 บน #FFFFFF ได้ 5.74:1 สบาย ๆ
        // ของเราวางบนพื้น #E5E5E5 ซึ่งให้ 4.51:1 ผ่าน AC ข้อ 3 (≥4.5) แค่ 0.01
        // วัดจริงในเบราว์เซอร์เจอ 4.49 ตอน Reveal ยัง tween ค้างที่ opacity .99
        // ลอกค่าสีมาโดยไม่คิดว่าพื้นหลังต่างกันคือความผิดพลาดแบบเดียวกับที่ทำให้
        // ต้องรื้อรอบนี้ตั้งแต่แรก จึงเข้มขึ้นเป็น #5D5D5D = 5.22:1 บนพื้น base
        dim: '#5D5D5D',
        line: {
          DEFAULT: 'rgba(0,0,0,0.10)',
          6: 'rgba(0,0,0,0.06)',
          12: 'rgba(0,0,0,0.12)',
        },
        // Driven by the --accent custom property; tweened on swatch change.
        accent: 'var(--accent)',
      },
      fontSize: {
        // Floors from spec §3.2 — nothing readable goes below 15px or under
        // weight 400. Kohler runs body at 16-17px/400; ours was 13-14px/300,
        // which is the whole of "ตัวเล็กและบางอ่านยาก".
        // 15px, not the 13px in spec §3.2. The spec's own AC 1 is measured
        // ("no readable text below 15px") and a label is read, so the two
        // clash. AC 1 is the gate that gets checked, so it wins; 0.12em
        // tracking carries the label voice on its own.
        // 1.6, not 1.3 (task E2). The floor below was derived over 1,108 Thai
        // wrap positions and then applied to `h1..h4` in globals.css — an ELEMENT
        // selector, which any utility class outranks. So the floor covered body
        // copy and nothing else: `label` shipped 1.30, `.micro` shipped 1.30, and
        // `text-2xl` (Tailwind's own default, 24/32 = 1.333) silently overrode the
        // heading rule wherever a component reached for it.
        //
        // Measured on the shipped build, every Thai text node on 24 route-loads ×
        // 4 widths: 2,773 node-instances below 1.6, **150 of them wrapping to two
        // or more lines** — which is where a 1.3 ratio on Thai actually collides.
        // The ratio is scale-invariant: Sarabun's worst cluster pair is 1.582em at
        // weight 400, so 15px/19.5px overlaps exactly as 32px/41.6px would.
        //
        // The fix is that the floor now lives in the SCALE, where the utilities
        // get their value, instead of in a selector the utilities beat.
        label: ['15px', { lineHeight: '1.6', letterSpacing: '0.12em' }],
        body: ['16px', { lineHeight: '1.6' }],
        'body-sm': ['15px', { lineHeight: '1.6' }],

        // ── Tailwind's own ladder, re-floored (task E2) ────────────────────
        // These keys already exist in Tailwind's defaults and carry Latin-tuned
        // leading (text-2xl is 24/32). Every one of them is one autocomplete away
        // from a developer, they all outrank the `h1..h4` element rule, and this
        // site's text falls back to Thai on most routes — so each is a live way to
        // put a 1.33 ratio back under Thai glyphs. Overriding the line-height (the
        // sizes are untouched) closes that door without forbidding the utilities.
        // Anything that genuinely wants tighter leading asks for it: `.en-tight`
        // for English display type, `leading-none` for the numeric model number.
        xs: ['12px', { lineHeight: '1.6' }],
        sm: ['14px', { lineHeight: '1.6' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.6' }],
        '2xl': ['24px', { lineHeight: '1.6' }],
        '3xl': ['30px', { lineHeight: '1.6' }],
        '4xl': ['36px', { lineHeight: '1.6' }],
        '5xl': ['48px', { lineHeight: '1.6' }],
        '6xl': ['60px', { lineHeight: '1.6' }],
        '7xl': ['72px', { lineHeight: '1.6' }],
        '8xl': ['96px', { lineHeight: '1.6' }],
        '9xl': ['128px', { lineHeight: '1.6' }],

        // ── display scale ──────────────────────────────────────────────────
        // The scale used to stop at section: 32px, with nothing between it and
        // the 420px decorative model number on the PDP. A 32px heading on a
        // 1440px canvas is a fortieth of the frame, which is blog scale, not
        // catalogue scale — see scratchpad/task-y-research.md §4.
        //
        // Both steps are fluid, but they track the MEASURE rather than the
        // window — the ranges below were retuned in task D2 after measuring what
        // the containers actually give them. See the note above `section`.
        //
        // The 1.6 leading is a MEASURED floor, not a taste call, and it is not
        // the 1.08 that used to be in globals.css — that number was derived
        // against IBM Plex Sans Thai, and the body face became Sarabun in
        // 6cc30d9. Sarabun sets a Thai upper stack (ascender + upper vowel +
        // tone, e.g. ฟื้) 1.25em above the baseline and a lower vowel 0.33em
        // below it, so its worst ink box is 1.58em — wider than the 1.30em its
        // own font metrics declare.
        //
        // 1.6 comes from sweeping every Thai heading this site renders — 1,108
        // wrap positions across 18 routes, including the ten Kohler articles
        // imported in the same pass. The ratio each one needs to clear is:
        //   under 1.25   950 of 1108
        //   1.25–1.35    115
        //   1.35–1.45     24
        //   1.45–1.55     19   worst: 'อยู่ด้วยกันจนหลังการติดตั้ง' at ยู่|ตั้ = 1.550
        // So 1.35 was not enough either — it was only enough for the four
        // headings sampled by hand first. 1.6 clears the measured worst by
        // 0.05em and also clears Sarabun's absolute worst cluster pair (1.582
        // at weight 400, 1.613 at 600). Re-measured after the change: 907 wrap
        // positions at 1.6, zero collisions, tightest +1.06px.
        //
        // Latin only needs 0.91em and 1.6 is slack on it, but there is no
        // English-mode escape hatch here — see the note in globals.css, English
        // mode falls back to Thai copy on most of this site. Use .en-tight per
        // element instead. Full table and method in scratchpad/task-a3.md §1.
        card: ['24px', { lineHeight: '1.6' }],
        // ── measure, not viewport (task D2) ────────────────────────────────
        // The first version of these two steps sized off the viewport alone —
        // 5vw and 7.5vw with maxima of 72 and 108 — and that is wrong here for a
        // reason the vw unit cannot see: THE BOXES THESE HEADINGS LIVE IN STOP
        // GROWING BEFORE THE VIEWPORT DOES. `max-w-2xl` is 672px and
        // `max-w-4xl` is 896px whatever the window does, and a section heading
        // in a two-column block at 768 gets a 286px column.
        //
        // So the size kept climbing while the measure did not, and characters
        // per line — the thing that actually decides whether a heading reads —
        // went the wrong way. Measured across 18 routes at four widths, both
        // languages, on blocks that actually wrap (Thai figures; English within
        // 1 character of these):
        //
        //   hero      390: 48px in 327px → 10.8 cpl, up to 4 lines
        //             768: 56px in 633px → 21.5 cpl
        //            1024: 76px in 768px → 21.5 cpl
        //            1440: 107px in 896px → 10.8 cpl, 4 lines   ← worse than 768
        //
        // A heading that reads on a laptop wrapping to four lines on a desktop
        // is exactly "the wrong size for the screen". The middle of that range
        // is right, so the coefficient stays and the ENDS are pulled in: the max
        // now lands where the container caps (7.5vw reaches 76px at a 1013px
        // viewport, and max-w-4xl caps at 896px just above that), and the min
        // stops a 390px phone being handed a 48px headline in a 327px box.
        //
        // `section` needed the coefficient changed as well, not just the cap:
        // its containers are much narrower than `hero`'s (286–556px measured),
        // so 5vw overshot them at every width — 13–15.5 cpl everywhere, up to
        // 4 lines for a five-word heading. 3.6vw tracks those boxes instead of
        // the window, and 30px at the bottom keeps it clear of `card` (24px)
        // so the ranks never cross.
        //
        // Sizes are unchanged between Thai and English on purpose. Measured at
        // the same size in the same box the two scripts come out within one
        // character per line of each other, so a separate Thai step would be
        // solving a problem the numbers do not show. What Thai does differently
        // is WHERE the line breaks — no word spaces, so a break lands wherever
        // the box runs out — and that is handled by `text-wrap` in globals.css,
        // not by a second size ladder. Full before/after in scratchpad/task-d2.md.
        section: ['clamp(30px, 3.6vw, 52px)', { lineHeight: '1.6' }],
        hero: ['clamp(34px, 7.5vw, 76px)', { lineHeight: '1.6' }],
      },
      letterSpacing: {
        // 0.22em was splash-screen tracking. 0.12em still reads as a label
        // without falling apart at 13px.
        widest2: '0.12em',
      },
      fontFamily: {
        // ทั้งสอง family อยู่ในทั้งสอง stack — DM Sans ไม่มีอักษรไทย
        // ถ้าไม่ใส่ Plex Thai ต่อท้าย display พาดหัวไทยจะตกไปใช้ฟอนต์ระบบ
        sans: ['var(--font-thai)', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'var(--font-thai)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
