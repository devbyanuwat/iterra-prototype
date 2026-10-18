import type { Metadata } from 'next';
import TaxonomyAdmin from '@/components/admin/TaxonomyAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listBrands, listCategories, listMaterials } from '@/lib/server/taxonomy';

export const metadata: Metadata = { title: 'หมวด แบรนด์ วัสดุ' };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [categories, brands, materials] = await Promise.all([listCategories(db), listBrands(db), listMaterials(db)]);
  return <TaxonomyAdmin categories={categories} brands={brands} materials={materials} />;
}
