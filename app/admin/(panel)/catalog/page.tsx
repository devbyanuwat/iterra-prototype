import type { Metadata } from 'next';
import CatalogAdmin from '@/components/admin/CatalogAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'แคตตาล็อก' };

export default async function AdminCatalogPage() {
  await requireAdmin();
  return <CatalogAdmin catalog={await getCatalog(db)} />;
}
