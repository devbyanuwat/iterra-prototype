// หมวด แบรนด์ วัสดุ · import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// ลบรายการที่สินค้ายังใช้อยู่ไม่ได้: FK on delete restrict โยน code 23503 ให้ adminAction แปลเป็นข้อความ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
type Name = { th: string; en: string };
export type CategoryRow = { key: string; name: Name; multiBrand: boolean; count: number };
export type BrandRow = { id: number; name: string; count: number };
export type MaterialRow = { key: string; name: Name; count: number };
export type CategoryInput = { key: string; th: string; en: string; multiBrand: boolean };
export type MaterialInput = { key: string; th: string; en: string };

// ข้อผิดที่ผู้ดูแลระบบแก้เองได้ adminAction ส่งข้อความนี้กลับไปตรง ๆ
export class InputError extends Error {
  name = 'InputError';
}

function text(v: unknown, msg: string, max = 120): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new InputError(msg);
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  if (s.length > max) throw new InputError(`ยาวเกิน ${max} ตัวอักษร`);
  return s;
}
function key(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^[a-z][a-zA-Z0-9-]{0,39}$/.test(s)) throw new InputError('รหัสใช้ a-z ตัวเลข และ - ขึ้นต้นด้วยตัวอักษร ไม่เกิน 40 ตัว');
  return s;
}
const nextSort = (table: string) => `(select coalesce(max(sort), 0) + 1 from ${table})`;

export async function listCategories(db: Db): Promise<CategoryRow[]> {
  const r = await db.query(
    `select c.key, c.name_th, c.name_en, c.multi_brand, count(p.id)::int as n
       from categories c left join products p on p.category_key = c.key
      group by c.key order by c.sort, c.key`,
  );
  return r.rows.map((x) => ({ key: x.key, name: { th: x.name_th, en: x.name_en }, multiBrand: x.multi_brand, count: x.n }));
}

export async function saveCategory(db: Db, input: CategoryInput, isNew: boolean): Promise<void> {
  const v = [key(input.key), text(input.th, 'กรุณากรอกชื่อภาษาไทย'), text(input.en, 'กรุณากรอกชื่อภาษาอังกฤษ'), input.multiBrand === true];
  if (isNew) {
    await db.query(`insert into categories (key, name_th, name_en, multi_brand, sort) values ($1, $2, $3, $4, ${nextSort('categories')})`, v);
    return;
  }
  const r = await db.query('update categories set name_th = $2, name_en = $3, multi_brand = $4 where key = $1', v);
  if (r.rowCount === 0) throw new InputError('ไม่พบหมวดนี้ อาจถูกลบไปแล้ว');
}

export async function deleteCategory(db: Db, k: string): Promise<void> {
  await db.query('delete from categories where key = $1', [k]);
}

export async function listBrands(db: Db): Promise<BrandRow[]> {
  const r = await db.query(
    `select b.id::int as id, b.name, count(p.id)::int as n
       from brands b left join products p on p.brand_id = b.id
      group by b.id order by b.name`,
  );
  return r.rows.map((x) => ({ id: x.id, name: x.name, count: x.n }));
}

export async function saveBrand(db: Db, id: number | null, name: string): Promise<void> {
  const n = text(name, 'กรุณากรอกชื่อแบรนด์', 80);
  if (id === null) {
    await db.query('insert into brands (name) values ($1)', [n]);
    return;
  }
  if (!Number.isInteger(id)) throw new InputError('ไม่พบแบรนด์นี้');
  const r = await db.query('update brands set name = $2 where id = $1', [id, n]);
  if (r.rowCount === 0) throw new InputError('ไม่พบแบรนด์นี้ อาจถูกลบไปแล้ว');
}

export async function deleteBrand(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบแบรนด์นี้');
  await db.query('delete from brands where id = $1', [id]);
}

export async function listMaterials(db: Db): Promise<MaterialRow[]> {
  const r = await db.query(
    `select m.key, m.name_th, m.name_en, count(p.id)::int as n
       from materials m left join products p on p.material_key = m.key
      group by m.key order by m.sort, m.key`,
  );
  return r.rows.map((x) => ({ key: x.key, name: { th: x.name_th, en: x.name_en }, count: x.n }));
}

export async function saveMaterial(db: Db, input: MaterialInput, isNew: boolean): Promise<void> {
  const v = [key(input.key), text(input.th, 'กรุณากรอกชื่อภาษาไทย'), text(input.en, 'กรุณากรอกชื่อภาษาอังกฤษ')];
  if (isNew) {
    await db.query(`insert into materials (key, name_th, name_en, sort) values ($1, $2, $3, ${nextSort('materials')})`, v);
    return;
  }
  const r = await db.query('update materials set name_th = $2, name_en = $3 where key = $1', v);
  if (r.rowCount === 0) throw new InputError('ไม่พบวัสดุนี้ อาจถูกลบไปแล้ว');
}

export async function deleteMaterial(db: Db, k: string): Promise<void> {
  await db.query('delete from materials where key = $1', [k]);
}
