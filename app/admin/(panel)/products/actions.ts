'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import { deleteProduct, saveProduct, setPublished, type ProductInput } from '@/lib/server/products';

export async function saveProductAction(id: number | null, input: ProductInput) {
  return adminAction(() => saveProduct(db, id, input));
}
export async function deleteProductAction(id: number) {
  return adminAction(() => deleteProduct(db, id));
}
export async function setPublishedAction(id: number, published: boolean) {
  return adminAction(() => setPublished(db, id, published));
}
