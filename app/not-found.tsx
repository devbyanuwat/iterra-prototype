import type { Metadata } from 'next';
import NotFoundContent from '@/components/NotFoundContent';

export const metadata: Metadata = {
  title: 'ไม่พบหน้าที่คุณต้องการ',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}
