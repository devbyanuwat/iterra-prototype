'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deletePost, savePost, setPostPublished, type PostInput } from '@/lib/server/posts';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function savePostAction(id: number | null, input: PostInput) {
  return adminAction(async (tx, a) => {
    const pid = await savePost(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'post', pid, { title: String(input.titleTh).trim() });
  });
}
export async function deletePostAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deletePost(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'post', id, { slug });
  });
}
export async function setPostPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setPostPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'post', id);
  });
}
