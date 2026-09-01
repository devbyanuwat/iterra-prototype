import type { Metadata } from 'next';
import DepthGallery from '@/components/DepthGallery';
import { galleryPlanes } from '@/components/depth-field';
import { products } from '@/lib/products';

export const metadata: Metadata = {
  title: 'แกลเลอรี — สนามภาพเชิงลึก | Gallery',
  description:
    'สินค้าคัดสรรลอยอยู่ในสนามภาพเชิงลึก เลื่อนเมาส์เพื่อเดินดู คลิกเพื่อเปิดชิ้นนั้นในเฉดที่กำลังมองอยู่ — พร้อมมุมมองดัชนีสำหรับการค้นหา',
  alternates: { canonical: '/gallery' },
};

// ชุดระนาบคำนวณตอน build ไม่ใช่ตอน render บนเครื่องผู้ใช้ — เหตุผลเดียวกับ
// app/page.tsx: lib/products.generated.ts หนัก 424KB ถ้า DepthGallery ซึ่งเป็น
// client component import เอง แคตตาล็อกทั้งก้อนจะกลายเป็น client chunk
// ทั้งที่หน้านี้ต้องการแค่ 40 รายการ ส่งมาเป็น props ทำให้ HTML พก JSON ก้อนเล็ก ๆ
// มาแทน (ตัว DepthGallery import แค่ type ซึ่งถูกลบตอนคอมไพล์)
export default function GalleryPage() {
  const { planes, index } = galleryPlanes();
  return <DepthGallery planes={planes} index={index} total={products.length} />;
}
