import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';
import { SITE_TAGLINE_TH, SITE_TAGLINE_EN } from '@/lib/site';

export const metadata: Metadata = {
  title: `ITERRA — ${SITE_TAGLINE_TH} | ${SITE_TAGLINE_EN}`,
  description:
    'คัดสรรซิงก์ ก๊อกครัว เตาแม่เหล็กไฟฟ้า และชุดครัวบิลท์อินพรีเมียมจากแบรนด์ชั้นนำระดับโลก สัมผัสจริงได้ที่โชว์รูม ITERRA กรุงเทพฯ',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <HomeContent />;
}
