import type { Metadata } from 'next';
import PrivacyContent from '@/components/PrivacyContent';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
  description: 'นโยบายความเป็นส่วนตัวและการใช้คุกกี้ของเว็บไซต์ ITERRA',
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
