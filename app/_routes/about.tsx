import type { Metadata } from 'next';
import AboutContent from '@/components/AboutContent';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/about/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.about.title,
  description: dict[lang].meta.about.description,
  alternates: alternates(lang, path),
});

// เนื้อหาย้ายไป components/AboutContent.tsx เพราะต้องอ่าน useLang (client)
// หน้านี้เหลือแค่ metadata ซึ่งเป็นของฝั่ง server — รูปแบบเดียวกับ /products และ /contact
export default function AboutPage() {
  return <AboutContent />;
}
