'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { saveAnnouncement, type AnnouncementInput } from '@/lib/server/announcement';

export async function saveAnnouncementAction(input: AnnouncementInput) {
  return adminAction(async (tx, a) => {
    await saveAnnouncement(tx, input);
    await audit(tx, a.id, 'update', 'announcement', 1, { enabled: input.enabled === true, resetSeen: input.resetSeen === true });
  });
}
