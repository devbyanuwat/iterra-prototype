import type { Metadata } from 'next';
import HeroVideoAdmin from '@/components/admin/HeroVideoAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getHeroAdmin } from '@/lib/server/hero-video';

export const metadata: Metadata = { title: 'วิดีโอหน้าแรก' };

export default async function AdminHeroPage() {
  await requireAdmin();
  return <HeroVideoAdmin hero={await getHeroAdmin(db)} />;
}
