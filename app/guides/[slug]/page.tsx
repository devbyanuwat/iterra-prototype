// /guides/[slug] = คู่มือเลือกซื้อหนึ่งชุด (task C1)
//
// server component แปลงข้อมูลให้เสร็จก่อนส่งลง client ด้วยเหตุผลเดียวกับ
// app/guides/page.tsx: คลังไทล์ 167 ใบกับคู่มือทั้ง 13 ชุดไม่ต้องเดินทางไปทั้งก้อน
// เพื่อวาดคู่มือชุดเดียว รูปทุกใบถูก resolve ที่นี่แล้ว (ดู ./media.ts)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuideContent, { type GuideView } from '../GuideContent';
import { catFor, coverageOf } from '../coverage';
import { guidePicture } from '../media';
import { getGuide, guides } from '@/lib/guides.generated';
import { dict } from '@/lib/i18n';

type Props = { params: Promise<{ slug: string }> };

const SOURCE_ORIGIN = 'https://www.kohler.co.th';

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const en = dict.en.guideNames[slug] ?? slug;
  const th = dict.th.guideNames[slug] ?? slug;
  const { missing, total } = coverageOf(guide);
  return {
    title: `${en} — KOHLER shopping guide | คู่มือเลือกซื้อ${th}`,
    // จำนวนบล็อกที่ไม่มีอังกฤษอยู่ในคำบรรยายด้วย: หน้านี้ประกาศ lang="en" แต่มี
    // ข้อความไทยอยู่จริง ตัวอย่างค้นหาที่ไม่บอกไว้ก็จะเซอร์ไพรส์คนกดเข้ามา
    description:
      missing > 0
        ? `${en}: ${guide.sections.length} sections from KOHLER’s own shopping guide, harvested in both languages. ${missing} of ${total} blocks have no English at source and are shown in Thai.`
        : `${en}: ${guide.sections.length} sections from KOHLER’s own shopping guide, in Thai and English.`,
    alternates: { canonical: `/guides/${slug}/` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const view: GuideView = {
    slug: guide.slug,
    sourceUrl: `${SOURCE_ORIGIN}${guide.path}`,
    coverage: coverageOf(guide),
    cat: catFor(guide.slug),
    sections: guide.sections.map((section) => ({
      title: section.title,
      enAvailable: section.enAvailable,
      options: section.options.map((option) => ({
        label: option.label,
        enAvailable: option.enAvailable,
        // href ของต้นทางไม่ถูกส่งต่อ: มันชี้ไปที่ตัวกรองของแคตตาล็อก kohler.co.th
        // ซึ่งไม่ใช่ของที่เรามี (ไฟล์ข้อมูลเองก็เขียนไว้ว่าเก็บเป็นข้อมูลเฉย ๆ)
        picture: guidePicture(option.image) ?? null,
      })),
    })),
  };

  return <GuideContent guide={view} />;
}
