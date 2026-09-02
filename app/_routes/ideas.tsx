// /ideas = ไอเดียแต่งห้อง สองชุด (task C1)

import type { Metadata } from 'next';
import IdeasContent, { type HubCard } from './parts/IdeasContent';
import { ideaPicture } from './parts/idea-media';
import { ideaHubs } from '@/lib/ideas.generated';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/ideas/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.ideas.title,
  description: dict[lang].meta.ideas.description,
  alternates: alternates(lang, path),
});

export default function IdeasPage() {
  const hubs: HubCard[] = ideaHubs.map((hub) => ({
    slug: hub.slug,
    items: hub.items.length,
    cover: ideaPicture(hub.items.find((item) => item.image)?.image) ?? null,
  }));

  return <IdeasContent hubs={hubs} />;
}
