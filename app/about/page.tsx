import type { Metadata } from 'next';
import AboutContent from '@/components/AboutContent';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา — เรื่องราวของ ITERRA',
  description:
    'กว่า 25 ปีของ ITERRA ดีลเลอร์อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม จากร้านเล็กบนถนนสุขุมวิทสู่โชว์รูมที่ให้คุณสัมผัสของจริงทุกชิ้น',
  alternates: { canonical: '/about/' },
};

// เนื้อหาย้ายไป components/AboutContent.tsx เพราะต้องอ่าน useLang (client)
// หน้านี้เหลือแค่ metadata ซึ่งเป็นของฝั่ง server — รูปแบบเดียวกับ /products และ /contact
export default function AboutPage() {
  return <AboutContent />;
}
