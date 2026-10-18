import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import { currentAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบหลังบ้าน',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await currentAdmin()) redirect('/admin/products/');
  return <LoginForm />;
}
