import type { Metadata } from 'next';
import ProductsContent from '@/components/ProductsContent';

export const metadata: Metadata = {
  title: 'สินค้าทั้งหมด: ก๊อกและซิงก์ครัว KOHLER',
  description:
    'ก๊อกและซิงก์ครัว KOHLER ทุกรุ่นในโชว์รูม ITERRA: ก๊อกผสม ก๊อกเดี่ยว ซิงก์สเตนเลส และซิงก์เหล็กหล่อ',
  alternates: { canonical: '/products/' },
};

export default function ProductsPage() {
  return <ProductsContent />;
}
