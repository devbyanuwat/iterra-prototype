'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import * as tax from '@/lib/server/taxonomy';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveCategoryAction(input: tax.CategoryInput, isNew: boolean) {
  return adminAction(async (tx, a) => {
    await tax.saveCategory(tx, input, isNew);
    await audit(tx, a.id, isNew === true ? 'create' : 'update', 'category', String(input.key).trim());
  });
}
export async function deleteCategoryAction(key: string) {
  return adminAction(async (tx, a) => {
    await tax.deleteCategory(tx, key);
    await audit(tx, a.id, 'delete', 'category', String(key));
  });
}
export async function saveBrandAction(id: number | null, name: string) {
  return adminAction(async (tx, a) => {
    await tax.saveBrand(tx, id, name);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'brand', id, { name: String(name).trim() });
  });
}
export async function deleteBrandAction(id: number) {
  return adminAction(async (tx, a) => {
    await tax.deleteBrand(tx, id);
    await audit(tx, a.id, 'delete', 'brand', id);
  });
}
export async function saveMaterialAction(input: tax.MaterialInput, isNew: boolean) {
  return adminAction(async (tx, a) => {
    await tax.saveMaterial(tx, input, isNew);
    await audit(tx, a.id, isNew === true ? 'create' : 'update', 'material', String(input.key).trim());
  });
}
export async function deleteMaterialAction(key: string) {
  return adminAction(async (tx, a) => {
    await tax.deleteMaterial(tx, key);
    await audit(tx, a.id, 'delete', 'material', String(key));
  });
}
