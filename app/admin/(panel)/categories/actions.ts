'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import * as tax from '@/lib/server/taxonomy';

export async function saveCategoryAction(input: tax.CategoryInput, isNew: boolean) {
  return adminAction(() => tax.saveCategory(db, input, isNew));
}
export async function deleteCategoryAction(key: string) {
  return adminAction(() => tax.deleteCategory(db, key));
}
export async function saveBrandAction(id: number | null, name: string) {
  return adminAction(() => tax.saveBrand(db, id, name));
}
export async function deleteBrandAction(id: number) {
  return adminAction(() => tax.deleteBrand(db, id));
}
export async function saveMaterialAction(input: tax.MaterialInput, isNew: boolean) {
  return adminAction(() => tax.saveMaterial(db, input, isNew));
}
export async function deleteMaterialAction(key: string) {
  return adminAction(() => tax.deleteMaterial(db, key));
}
