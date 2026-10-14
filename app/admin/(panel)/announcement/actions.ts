'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import { saveAnnouncement, type AnnouncementInput } from '@/lib/server/announcement';

export async function saveAnnouncementAction(input: AnnouncementInput) {
  return adminAction(() => saveAnnouncement(db, input));
}
