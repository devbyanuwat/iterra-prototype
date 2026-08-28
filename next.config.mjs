import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // ไม่ต้องให้ Next เขียน AGENTS.md / CLAUDE.md ทับในโปรเจกต์
  agentRules: false,
  // ตรึง root ไว้ที่โฟลเดอร์นี้ ไม่งั้น Turbopack ไต่ขึ้นไปเจอ lockfile ที่ home แล้วใช้ home เป็น root
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
};

export default nextConfig;
