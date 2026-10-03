import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // ไม่ต้องให้ Next เขียน AGENTS.md / CLAUDE.md ทับในโปรเจกต์
  agentRules: false,
  // ให้เปิด dev server จากมือถือหรือเครื่องอื่นในวง LAN ได้ (เช่น http://192.168.1.34:4100)
  // ครอบช่วง IP ภายในทั้ง 3 ช่วง · มีผลเฉพาะ next dev ไม่เกี่ยวกับเว็บที่ deploy
  allowedDevOrigins: ['10.*.*.*', '192.168.*.*', ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`)],
  // ตรึง root ไว้ที่โฟลเดอร์นี้ ไม่งั้น Turbopack ไต่ขึ้นไปเจอ lockfile ที่ home แล้วใช้ home เป็น root
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
};

export default nextConfig;
