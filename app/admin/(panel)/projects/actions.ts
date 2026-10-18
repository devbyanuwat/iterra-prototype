'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deleteProject, saveProject, setProjectPublished, type ProjectInput } from '@/lib/server/projects';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveProjectAction(id: number | null, input: ProjectInput) {
  return adminAction(async (tx, a) => {
    const pid = await saveProject(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'project', pid, { name: String(input.th).trim() });
  });
}
export async function deleteProjectAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deleteProject(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'project', id, { slug });
  });
}
export async function setProjectPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setProjectPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'project', id);
  });
}
