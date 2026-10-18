import type { Metadata } from 'next';
import ProjectsAdmin from '@/components/admin/ProjectsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdmin } from '@/lib/server/products';
import { listAdminProjects } from '@/lib/server/projects';

export const metadata: Metadata = { title: 'ผลงาน' };

export default async function AdminProjectsPage() {
  await requireAdmin();
  const [projects, products] = await Promise.all([listAdminProjects(db), listAdmin(db)]);
  // ส่งแค่ที่ตัวเลือกสินค้าต้องใช้ ไม่ส่งข้อมูลสินค้าทั้งแถวไปฝั่ง client
  const options = products.map((p) => ({ id: p.id, th: p.th, published: p.published })).sort((a, b) => a.th.localeCompare(b.th, 'th'));
  return <ProjectsAdmin projects={projects} products={options} />;
}
