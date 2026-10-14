import type { Metadata } from 'next';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import { requireAdmin } from '@/lib/admin';

// mockup หลังบ้าน: ไม่มี API ไม่มีล็อกอิน ห้ามให้ Google เก็บ และไม่อยู่ใน sitemap
export const metadata: Metadata = {
  title: 'จัดการสินค้า (ตัวอย่าง)',
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
  await requireAdmin();
  return <ProductsAdmin />;
}
