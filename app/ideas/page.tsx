// /ideas = ไอเดียแต่งห้อง สองชุด (task C1)

import type { Metadata } from 'next';
import IdeasContent, { type HubCard } from './IdeasContent';
import { ideaPicture } from './media';
import { ideaHubs } from '@/lib/ideas.generated';
import { dict, DEFAULT_LANG } from '@/lib/i18n';

export const metadata: Metadata = {
  title: `${dict[DEFAULT_LANG].ideas.title} — KOHLER bathroom & kitchen ideas | ไอเดียแต่งห้อง`,
  description:
    'Bathroom and kitchen ideas from kohler.co.th, in Thai and English — with the articles we hold opening here rather than off-site.',
  alternates: { canonical: '/ideas/' },
};

export default function IdeasPage() {
  const hubs: HubCard[] = ideaHubs.map((hub) => ({
    slug: hub.slug,
    items: hub.items.length,
    cover: ideaPicture(hub.items.find((item) => item.image)?.image) ?? null,
  }));

  return <IdeasContent hubs={hubs} />;
}
