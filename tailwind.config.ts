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
        sans: ['Inter', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
