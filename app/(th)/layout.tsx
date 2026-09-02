// root layout ของต้นไม้ไทย — ทุกเส้นทางใต้ /th/
//
// คู่แฝดของ app/(en)/layout.tsx ต่างกันคำเดียว และคำนั้นคือทั้งหมดของงานนี้:
// <html lang="th"> ถูกเขียนลง HTML ตั้งแต่ตอน build ไม่ใช่ตอน hydrate ผลคือ
// line-height floor ของไทยใน globals.css และการเลือกฟอนต์ไทยของเบราว์เซอร์
// มีผลตั้งแต่เฟรมแรก ไม่ใช่หลัง JS ทำงาน

import RootShell, { rootMetadata } from '@/app/_lib/root';

export const metadata = rootMetadata('th');

export default function ThaiLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="th">{children}</RootShell>;
}
