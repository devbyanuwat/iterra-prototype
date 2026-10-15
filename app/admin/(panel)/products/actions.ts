'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deleteProduct, saveProduct, setPublished, type ProductInput } from '@/lib/server/products';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveProductAction(id: number | null, input: ProductInput) {
  return adminAction(async (tx, a) => {
    const pid = await saveProduct(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'product', pid, { name: String(input.th).trim() });
  });
}
export async function deleteProductAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deleteProduct(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'product', id, { slug });
  });
}
export async function setPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'product', id);
  });
}
