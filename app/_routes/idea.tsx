// /ideas/[slug] = ไอเดียหนึ่งชุด (task C1)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IdeaHubContent, { type HubView } from './parts/IdeaHubContent';
import { ideaPicture, localPostFor } from './parts/idea-media';
import { ideaHubs } from '@/lib/ideas.generated';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

const SOURCE_ORIGIN = 'https://www.kohler.co.th';

export const path = (slug: string) => `/ideas/${slug}/`;

export function staticParams() {
  return ideaHubs.map((hub) => ({ slug: hub.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const hub = ideaHubs.find((item) => item.slug === slug);
    if (!hub) return {};
    const name = dict[lang].ideas.names[slug] ?? slug;
    return {
      title: name,
      description:
        lang === 'th'
          ? `${hub.items.length} เรื่องในชุด${name}จาก kohler.co.th ทั้งไทยและอังกฤษ`
          : `${hub.items.length} ${slug} stories from kohler.co.th, in Thai and English.`,
      alternates: alternates(lang, path(slug)),
    };
  };

export default async function IdeaHubPage({ params }: Props) {
  const { slug } = await params;
  const hub = ideaHubs.find((item) => item.slug === slug);
  if (!hub) notFound();

  const view: HubView = {
    slug: hub.slug,
    sourceUrl: `${SOURCE_ORIGIN}${hub.path}`,
    items: hub.items.map((item, i) => {
      // บทความของเราเองมาก่อนต้นฉบับเสมอ — ของชิ้นเดียวกัน อ่านที่นี่ได้ก็ควรอ่านที่นี่
      const post = localPostFor(item.href);
      return {
        key: `${hub.slug}-${i}`,
        // เส้นทางในเว็บเขียนเป็น path เปล่า คำนำหน้าภาษาถูกเติมตอนเรนเดอร์โดย
        // components/Link.tsx ส่วนลิงก์ออกนอกเว็บ (ต้นฉบับที่ kohler.co.th)
        // เป็น URL เต็มจึงไม่ถูกแตะ
        href: post ? `/articles/${post.slug}/` : `${SOURCE_ORIGIN}${item.href}`,
        external: !post,
        heading: item.heading,
        blurb: item.blurb,
        // ภาพของการ์ดมาจากหน้าไอเดียต้นทางเสมอ ไม่ใช่ปกบทความของเรา:
        // การ์ดชุดนี้ถูกเลือกภาพมาให้อยู่ด้วยกันแล้ว สลับบางใบเป็นปกของเราจะได้
        // แถวที่โทนไม่เข้ากันโดยไม่ได้อะไรกลับมา
        picture: ideaPicture(item.image) ?? null,
      };
    }),
  };

  return <IdeaHubContent hub={view} />;
}
