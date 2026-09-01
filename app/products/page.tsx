import type { Metadata } from 'next';
import ProductsContent from '@/components/ProductsContent';

export const metadata: Metadata = {
  title: 'สินค้าทั้งหมด — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม',
  description:
    'ชมสินค้าคัดสรรทั้ง 12 รายการของ KOHLER — ซิงก์สเตนเลส ก๊อกครัว เตาแม่เหล็กไฟฟ้า ชุดครัวบิลท์อิน สุขภัณฑ์อัจฉริยะ ฝักบัวเรนชาวเวอร์ และอีกมากมาย',
  alternates: { canonical: '/products/' },
};

export default function ProductsPage() {
  return <ProductsContent />;
}
