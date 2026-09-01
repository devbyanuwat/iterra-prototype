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
        card: ['24px', { lineHeight: '1.25' }],
        section: ['32px', { lineHeight: '1.15' }],
      },
      letterSpacing: {
        // 0.22em was splash-screen tracking. 0.12em still reads as a label
        // without falling apart at 13px.
        widest2: '0.12em',
      },
      fontFamily: {
        // ทั้งสอง family อยู่ในทั้งสอง stack — DM Sans ไม่มีอักษรไทย
        // ถ้าไม่ใส่ Plex Thai ต่อท้าย display พาดหัวไทยจะตกไปใช้ฟอนต์ระบบ
        sans: ['var(--font-plex-thai)', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'var(--font-plex-thai)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
