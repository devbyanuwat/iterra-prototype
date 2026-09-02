// /guides = คู่มือเลือกซื้อทั้งสิบสามชุด (task C1)
//
// server component บาง ๆ ครอบ client component ตามแบบเดียวกับ /products และ
// /finish: เมทาดาทาต้องออกจากฝั่ง server ส่วนภาษาของเนื้อหามาจากต้นไม้ผ่าน context
//
// และมันทำอีกอย่างที่จำเป็นกว่า: **แปลงข้อมูลให้เสร็จตรงนี้** lib/guides.generated.ts
// (497 บรรทัด) กับ lib/tiles.generated.ts (167 ใบ) ไม่ต้องเดินทางไปเป็น client
// chunk เพื่อวาดการ์ดสิบสามใบ — เหตุผลเดียวกับที่ app/_routes/gallery.tsx ไม่ยอมให้
// DepthGallery import แคตตาล็อกเอง

import type { Metadata } from 'next';
import GuidesContent, { type GuideCard } from './parts/GuidesContent';
import { coverageOf } from './parts/coverage';
import { coverPicture } from './parts/guide-media';
import { guides } from '@/lib/guides.generated';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/guides/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.guides.title,
  description: dict[lang].meta.guides.description,
  alternates: alternates(lang, path),
});

export default function GuidesPage() {
  const items: GuideCard[] = guides.map((guide) => ({
    slug: guide.slug,
    sections: guide.sections.length,
    options: guide.sections.reduce((n, section) => n + section.options.length, 0),
    coverage: coverageOf(guide),
    cover: coverPicture(guide.sections) ?? null,
  }));

  return <GuidesContent items={items} />;
}
