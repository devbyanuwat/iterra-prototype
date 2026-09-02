// /ideas/[slug] = ไอเดียหนึ่งชุด (task C1)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IdeaHubContent, { type HubView } from '../IdeaHubContent';
import { ideaPicture, localPostFor } from '../media';
import { ideaHubs } from '@/lib/ideas.generated';
import { dict } from '@/lib/i18n';

type Props = { params: Promise<{ slug: string }> };

const SOURCE_ORIGIN = 'https://www.kohler.co.th';

export function generateStaticParams() {
  return ideaHubs.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = ideaHubs.find((item) => item.slug === slug);
  if (!hub) return {};
  const en = dict.en.ideas.names[slug] ?? slug;
  const th = dict.th.ideas.names[slug] ?? slug;
  return {
    title: `${en} — KOHLER | ${th}`,
    description: `${hub.items.length} ${slug} stories from kohler.co.th, in Thai and English.`,
    alternates: { canonical: `/ideas/${slug}/` },
  };
}

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
