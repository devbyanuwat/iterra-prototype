import type { Metadata } from 'next';
import CatalogContent from '@/components/CatalogContent';

export const metadata: Metadata = {
  title: 'แคตตาล็อก KOHLER Kitchens 2026',
  description: 'เปิดดูและดาวน์โหลดแคตตาล็อกครัวและตู้เสื้อผ้า KOHLER Kitchens 2026 ฉบับเต็ม 49 หน้า',
  alternates: { canonical: '/catalog/' },
};

export default function CatalogPage() {
  return <CatalogContent />;
}
