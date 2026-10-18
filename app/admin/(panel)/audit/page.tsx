import type { Metadata } from 'next';
import AuditAdmin from '@/components/admin/AuditAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAudit } from '@/lib/server/audit';

export const metadata: Metadata = { title: 'บันทึกการใช้งาน' };

export default async function AdminAuditPage() {
  await requireAdmin();
  return <AuditAdmin rows={await listAudit(db)} />;
}
