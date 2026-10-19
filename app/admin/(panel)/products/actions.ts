'use server';

import { adminAction, requireAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { audit } from '@/lib/server/audit';
import { deleteProduct, listAdmin, listRevisions, publishDraft, saveDraft, setPublished, type ProductDraft } from '@/lib/server/products';
import { listBrands, listCategories, listMaterials } from '@/lib/server/taxonomy';

// ทุกตัวที่แก้ข้อมูลผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
// บันทึกเป็นร่างเสมอ · publish = เผยแพร่ร่างนั้นต่อทันทีใน transaction เดียวกัน
export async function saveProductAction(id: number | null, input: ProductDraft, publish: boolean) {
  return adminAction(async (tx, a) => {
    const { id: pid, rev } = await saveDraft(tx, id, input, a.id);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'product', pid, { name: String(input.th).trim(), revision: rev });
    if (publish === true) {
      await publishDraft(tx, pid);
      await audit(tx, a.id, 'publish', 'product', pid, { revision: rev });
    }
  });
}
export async function productHistoryAction(id: number) {
  await requireAdmin();
  return listRevisions(db, id);
}
// แผงแก้ไขบนหน้าเว็บ: ข้อมูลชุดเดียวกับหน้าสินค้าหลังบ้าน · slug เป็นของที่ขึ้นเว็บหรือในร่างก็ได้ (ตอนดูร่าง URL เป็น slug ในร่าง)
export async function productEditAction(slug: string) {
  await requireAdmin();
  const [products, categories, brands, materials] = await Promise.all([listAdmin(db), listCategories(db), listBrands(db), listMaterials(db)]);
  const product = products.find((p) => p.slug === slug || p.draft?.slug === slug) ?? null;
  return { product, categories, brands, materials };
}
// แถบแอดมินบนหน้าเว็บ: เผยแพร่ร่างของสินค้าที่เปิดดูอยู่
export async function publishProductAction(id: number) {
  return adminAction(async (tx, a) => {
    const rev = await publishDraft(tx, id);
    await audit(tx, a.id, 'publish', 'product', id, { revision: rev });
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
