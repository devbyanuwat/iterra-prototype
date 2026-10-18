import type { Metadata } from 'next';
import AnnouncementAdmin from '@/components/admin/AnnouncementAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getAnnouncement } from '@/lib/server/announcement';

export const metadata: Metadata = { title: 'ประกาศ' };

export default async function AdminAnnouncementPage() {
  await requireAdmin();
  return <AnnouncementAdmin data={await getAnnouncement(db)} />;
}
