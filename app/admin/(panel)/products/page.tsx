import type { Metadata } from 'next';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdmin } from '@/lib/server/products';
import { listBrands, listCategories, listMaterials } from '@/lib/server/taxonomy';

export const metadata: Metadata = { title: 'จัดการสินค้า' };

export default async function AdminProductsPage() {
  await requireAdmin();
  const [products, categories, brands, materials] = await Promise.all([
    listAdmin(db),
    listCategories(db),
    listBrands(db),
    listMaterials(db),
  ]);
  return <ProductsAdmin products={products} categories={categories} brands={brands} materials={materials} />;
}
