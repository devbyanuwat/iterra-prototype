import type { Metadata } from 'next';
import ProductsContent from '@/components/ProductsContent';

export const metadata: Metadata = {
  title: 'สินค้าทั้งหมด — ชุดครัวและอุปกรณ์ครัวพรีเมียม',
  description:
    'ชมสินค้าคัดสรรทั้ง 7 รายการของ ITERRA — ซิงก์สเตนเลส ก๊อกครัว เตาแม่เหล็กไฟฟ้า เตาอบ เครื่องล้างจาน และชุดครัวบิลท์อิน',
  alternates: { canonical: '/products/' },
};

export default function ProductsPage() {
  return <ProductsContent />;
}
