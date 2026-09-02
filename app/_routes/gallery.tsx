import type { Metadata } from 'next';
import DepthGallery from '@/components/DepthGallery';
import { galleryPlanes } from '@/components/depth-field';
import { dict, type Lang } from '@/lib/i18n';
import { products } from '@/lib/products';
import { alternates, fieldHrefs } from '@/app/_lib/routes';

export const path = '/gallery/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.gallery.title,
  description: dict[lang].meta.gallery.description,
  alternates: alternates(lang, path),
});

// ชุดระนาบคำนวณตอน build ไม่ใช่ตอน render บนเครื่องผู้ใช้ — เหตุผลเดียวกับ
// app/_routes/home.tsx: lib/products.generated.ts หนัก 424KB ถ้า DepthGallery ซึ่งเป็น
// client component import เอง แคตตาล็อกทั้งก้อนจะกลายเป็น client chunk
// ทั้งที่หน้านี้ต้องการแค่ 40 รายการ ส่งมาเป็น props ทำให้ HTML พก JSON ก้อนเล็ก ๆ
// มาแทน (ตัว DepthGallery import แค่ type ซึ่งถูกลบตอนคอมไพล์)
export default function GalleryPage({ lang }: { lang: Lang }) {
  const { planes, index } = galleryPlanes();
  // href ของระนาบและของรายการในดัชนีมาจากข้อมูล ไม่ได้ผ่าน <Link> ของเรา —
  // ในต้นไม้ไทยทั้งสองชุดต้องชี้เข้าหน้าไทย ไม่งั้นสนามทั้งสนามเป็นทางออกจาก
  // ต้นไม้ที่ผู้อ่านเพิ่งเลือก
  const planesFor = fieldHrefs(lang, planes);
  const indexFor = fieldHrefs(lang, index);
  return <DepthGallery planes={planesFor} index={indexFor} total={products.length} />;
}
