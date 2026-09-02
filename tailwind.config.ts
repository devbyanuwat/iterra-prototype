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
        label: ['15px', { lineHeight: '1.3', letterSpacing: '0.12em' }],
        body: ['16px', { lineHeight: '1.6' }],
        'body-sm': ['15px', { lineHeight: '1.6' }],

        // ── display scale ──────────────────────────────────────────────────
        // The scale used to stop at section: 32px, with nothing between it and
        // the 420px decorative model number on the PDP. A 32px heading on a
        // 1440px canvas is a fortieth of the frame, which is blog scale, not
        // catalogue scale — see scratchpad/task-y-research.md §4.
        //
        // Both steps are fluid so the jump happens on the canvas that can hold
        // it: `section` is 40px until ~800px wide and reaches its 72px ceiling
        // at 1440; `hero` bottoms out at 48px on a 390px phone (the old pinned
        // hero measured 50.7px there) and tops out at 108px at 1440, which is
        // the size the Thai leading work was originally derived against.
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
        section: ['clamp(40px, 5vw, 72px)', { lineHeight: '1.6' }],
        hero: ['clamp(48px, 7.5vw, 108px)', { lineHeight: '1.6' }],
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
