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
        dim: '#666666',
        line: {
          DEFAULT: 'rgba(0,0,0,0.10)',
          6: 'rgba(0,0,0,0.06)',
          12: 'rgba(0,0,0,0.12)',
        },
        // Driven by the --accent custom property; tweened on swatch change.
        accent: 'var(--accent)',

        // DEPRECATED alias. `cream` meant light type on a dark page; there are
        // ~100 `text-cream` call sites and pointing it at ink keeps them
        // readable through the retheme instead of leaving pale text on a pale
        // page. Migrate to `ink`, then delete this.
        cream: '#232323',
      },
      fontSize: {
        // Floors from spec §3.2 — nothing readable goes below 15px or under
        // weight 400. Kohler runs body at 16-17px/400; ours was 13-14px/300,
        // which is the whole of "ตัวเล็กและบางอ่านยาก".
        label: ['13px', { lineHeight: '1.3', letterSpacing: '0.12em' }],
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
