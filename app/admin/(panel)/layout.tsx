import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';

// ทุกหน้าใน (panel) ต้องเข้าสู่ระบบ · หน้าในกลุ่มนี้เรียก requireAdmin() ซ้ำเองด้วย เพราะ layout กับ page render พร้อมกัน
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
