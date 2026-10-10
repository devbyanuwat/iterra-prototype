import type { Metadata } from 'next';
import ProjectsContent from '@/components/ProjectsContent';

export const metadata: Metadata = {
  title: 'ผลงานอ้างอิง — Project Reference',
  description: 'ผลงานอ้างอิงของ ITERRA โครงการที่เลือกใช้ก๊อกและซิงก์ครัวพรีเมียมจาก KOHLER',
  alternates: { canonical: '/projects/' },
};

export default function ProjectsPage() {
  return <ProjectsContent />;
}
