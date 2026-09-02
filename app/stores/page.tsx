import type { Metadata } from 'next';
import StoresContent from '@/components/StoresContent';
import { dict, DEFAULT_LANG } from '@/lib/i18n';
import { stores } from '@/lib/stores.generated';

// metadata อ่านจาก dict[DEFAULT_LANG] ไม่ใช่สตริงที่พิมพ์ไว้ตรง ๆ — เว็บนี้พลิก
// ภาษาเริ่มต้นด้วยค่าคงที่ค่าเดียว (ba10764) หน้าที่ฮาร์ดโค้ดภาษาไว้จะกลายเป็น
// <title> ที่ไม่ตรงกับ <html lang> ทันทีที่มีใครพลิก
const t = dict[DEFAULT_LANG];

export const metadata: Metadata = {
  title: t.stores.title,
  description: t.stores.sub(stores.length),
  alternates: { canonical: '/stores/' },
};

export default function StoresPage() {
  return <StoresContent />;
}
