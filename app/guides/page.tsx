// /guides = คู่มือเลือกซื้อทั้งสิบสามชุด (task C1)
//
// server component บาง ๆ ครอบ client component ตามแบบเดียวกับ /products และ
// /finish: เมทาดาทาต้องออกจากฝั่ง server ส่วนการสลับภาษาเป็น state ฝั่ง client
//
// และมันทำอีกอย่างที่จำเป็นกว่า: **แปลงข้อมูลให้เสร็จตรงนี้** lib/guides.generated.ts
// (497 บรรทัด) กับ lib/tiles.generated.ts (167 ใบ) ไม่ต้องเดินทางไปเป็น client
// chunk เพื่อวาดการ์ดสิบสามใบ — เหตุผลเดียวกับที่ app/gallery/page.tsx ไม่ยอมให้
// DepthGallery import แคตตาล็อกเอง

import type { Metadata } from 'next';
import GuidesContent, { type GuideCard } from './GuidesContent';
import { coverageOf } from './coverage';
import { coverPicture } from './media';
import { guides } from '@/lib/guides.generated';
import { dict, DEFAULT_LANG } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${dict[DEFAULT_LANG].guides.title} — KOHLER shopping guides | คู่มือเลือกซื้อ`,
  description:
    'KOHLER shopping guides taken from kohler.co.th in both languages — 13 guides covering faucets, sinks, toilets, showering, bathroom furniture and more.',
  alternates: { canonical: '/guides/' },
};

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
