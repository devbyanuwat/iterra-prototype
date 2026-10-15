import type { Metadata } from 'next';
import InquiriesAdmin from '@/components/admin/InquiriesAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listInquiries } from '@/lib/server/inquiries';

export const metadata: Metadata = { title: 'ข้อความติดต่อ' };

export default async function AdminInquiriesPage() {
  await requireAdmin();
  return <InquiriesAdmin items={await listInquiries(db)} />;
}
