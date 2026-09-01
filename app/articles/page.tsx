import type { Metadata } from 'next';
import ArticlesContent from '@/components/ArticlesContent';

export const metadata: Metadata = {
  title: 'บทความ — ไอเดียครัวสไตล์โชว์รูม',
  description:
    'รวมบทความไอเดียครัวและห้องน้ำจากทีม KOHLER — วิธีจัดครัวให้เหมือนโชว์รูม คู่มือเลือกซื้อ และเทรนด์วัสดุพรีเมียม',
  alternates: { canonical: '/articles/' },
};

export default function ArticlesPage() {
  return <ArticlesContent />;
}
