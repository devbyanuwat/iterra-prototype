// /guides/[slug] = คู่มือเลือกซื้อหนึ่งชุด (task C1)
//
// server component แปลงข้อมูลให้เสร็จก่อนส่งลง client ด้วยเหตุผลเดียวกับ
// app/_routes/guides.tsx: คลังไทล์ 167 ใบกับคู่มือทั้ง 13 ชุดไม่ต้องเดินทางไปทั้งก้อน
// เพื่อวาดคู่มือชุดเดียว รูปทุกใบถูก resolve ที่นี่แล้ว (ดู ./parts/guide-media.ts)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuideContent, { type GuideView } from './parts/GuideContent';
import { catFor, coverageOf } from './parts/coverage';
import { guidePicture } from './parts/guide-media';
import { getGuide, guides } from '@/lib/editorial';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

const SOURCE_ORIGIN = 'https://www.kohler.co.th';

export const path = (slug: string) => `/guides/${slug}/`;

export function staticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const guide = getGuide(slug);
    if (!guide) return {};
    const name = dict[lang].guideNames[slug] ?? slug;
    const { missing, total } = coverageOf(guide);
    return {
      title: name,
      // จำนวนบล็อกที่ไม่มีอังกฤษอยู่ในคำบรรยายด้วย: หน้าอังกฤษประกาศ lang="en"
      // แต่มีข้อความไทยอยู่จริง ตัวอย่างค้นหาที่ไม่บอกไว้ก็จะเซอร์ไพรส์คนกดเข้ามา
      // หน้าไทยไม่มีปัญหานี้ คำบรรยายจึงไม่ต้องพูดถึงมัน
      description:
        lang === 'th'
          ? `${name}: ${guide.sections.length} หมวดจากคู่มือเลือกซื้อของ KOHLER ยกมาจาก kohler.co.th ไม่ได้เรียบเรียงใหม่`
          : missing > 0
            ? `${name}: ${guide.sections.length} sections from KOHLER’s own shopping guide, harvested in both languages. ${missing} of ${total} blocks have no English at source and are shown in Thai.`
            : `${name}: ${guide.sections.length} sections from KOHLER’s own shopping guide, in Thai and English.`,
      alternates: alternates(lang, path(slug)),
    };
  };

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
