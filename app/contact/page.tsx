import type { Metadata } from 'next';
import ContactContent from '@/components/ContactContent';

export const metadata: Metadata = {
  title: 'ติดต่อเรา — นัดหมายชมโชว์รูม',
  description:
    'ติดต่อทีมที่ปรึกษา ITERRA สอบถามสินค้า นัดหมายเข้าชมโชว์รูมชุดครัวและอุปกรณ์ครัวพรีเมียมในกรุงเทพฯ ตอบกลับภายใน 24 ชั่วโมง',
  alternates: { canonical: '/contact/' },
};

export default function ContactPage() {
  return <ContactContent />;
}
