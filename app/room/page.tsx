import type { Metadata } from 'next';
import RoomContent from '@/components/room/RoomContent';

// หน้านี้เข้าได้ด้วยลิงก์ตรงเท่านั้น: ไม่อยู่ในเมนู footer หรือ sitemap และไม่ให้เครื่องมือค้นหาเก็บ
export const metadata: Metadata = {
  title: 'จำลองห้องครัว 3 มิติ',
  description: 'ลองสีหน้าบาน ท็อป พื้น และโทนแสงกับครัวผัง I, L และ U ในห้องจำลอง หมุนและซูมดูได้ 180 องศา',
  alternates: { canonical: '/room/' },
  robots: { index: false, follow: false },
};

export default function RoomPage() {
  return <RoomContent />;
}
