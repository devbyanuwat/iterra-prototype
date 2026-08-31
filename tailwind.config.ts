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
        // AD-1 showroom palette (spec §2)
        base: '#08090A',
        surface: '#111315',
        cream: '#EDE9E3',
        dim: '#6E7275',
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          6: 'rgba(255,255,255,0.06)',
          12: 'rgba(255,255,255,0.12)',
        },
        // Driven by the --accent custom property; tweened on swatch change.
        accent: 'var(--accent)',

        // DEPRECATED light palette — kept only so the ~100 call sites in
        // components/ and the other routes keep rendering while they are
        // migrated to the tokens above. Delete once that migration lands.
        paper: '#faf9f7',
        ink: '#1c1917',
        warm: {
          100: '#f5f4f1',
          200: '#e9e7e2',
          300: '#d6d3cc',
          400: '#a8a29e',
          500: '#78716c',
        },
      },
      letterSpacing: {
        widest2: '0.22em',
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
