// root layout ของต้นไม้อังกฤษ — เส้นทางเปล่า (/, /products/, /finish/CP/ …)
//
// route group (en) ไม่ปรากฏใน URL มันมีไว้ให้ต้นไม้นี้มี root layout เป็นของ
// ตัวเอง ซึ่งเป็นวิธีเดียวที่ App Router ให้เขียน <html lang> ต่างกันต่อกลุ่ม
// โครงทั้งหมดอยู่ที่ app/_lib/root.tsx ที่นี่เหลือแค่ "ต้นไม้นี้ภาษาอะไร"

import RootShell, { rootMetadata } from '@/app/_lib/root';

export const metadata = rootMetadata('en');

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
