import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';

export const metadata: Metadata = {
  title: 'ITERRA — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม | Premium Kitchen & Bath',
  description:
    'คัดสรรซิงก์ ก๊อกครัว เตาแม่เหล็กไฟฟ้า ชุดครัวบิลท์อิน และสุขภัณฑ์พรีเมียมจากแบรนด์ชั้นนำระดับโลก สัมผัสจริงได้ที่โชว์รูม ITERRA กรุงเทพฯ',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <HomeContent />;
}
