// สินค้า: เขียนจากหลังบ้าน (Task 6) และอ่านให้หน้าเว็บ (Task 8)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminProduct = {
  id: number;
  slug: string;
  category: string;
  brandId: number;
  brand: string;
  material: string; // '' = ไม่ระบุ
  series: string;
  th: string;
  en: string;
  descTh: string;
  descEn: string;
  specs: string; // บรรทัดละข้อ "ชื่อ: ค่า"
  images: string[];
  published: boolean;
  featured: boolean;
  updated: string; // YYYY-MM-DD
};
export type ProductInput = Omit<AdminProduct, 'id' | 'brand' | 'updated'>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const SELECT = `select p.*, p.id::int as pid, p.brand_id::int as bid, b.name as brand_name,
                       to_char(p.updated_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as updated_day
                  from products p join brands b on b.id = p.brand_id`;

export function parseSpecs(text: string): { label: string; value: string }[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const at = l.indexOf(':');
      if (at <= 0) throw new InputError(`สเปกบรรทัดที่ ${i + 1} ต้องเป็นแบบ ชื่อ: ค่า`);
      return { label: l.slice(0, at).trim(), value: l.slice(at + 1).trim() };
    });
}

export function slugFrom(en: string): string {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');
}

export async function listAdmin(db: Db): Promise<AdminProduct[]> {
  const r = await db.query(`${SELECT} order by p.updated_at desc, p.id desc`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    category: x.category_key,
    brandId: x.bid,
    brand: x.brand_name,
    material: x.material_key ?? '',
    series: x.series,
    th: x.name_th,
    en: x.name_en,
    descTh: x.desc_th,
    descEn: x.desc_en,
    specs: x.specs.map((s: { label: string; value: string }) => `${s.label}: ${s.value}`).join('\n'),
    images: x.images,
    published: x.published,
    featured: x.featured,
    updated: x.updated_day, // วันตามเวลาไทย ไม่ขึ้นกับ timezone ของ Node
  }));
}

// คืน id · ไม่แตะราคาและภาพบรรยากาศ (scenes) เพราะยังไม่มีช่องในฟอร์ม
export async function saveProduct(db: Db, id: number | null, input: ProductInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  const th = str(input.th);
  if (!th) throw new InputError('กรุณากรอกชื่อสินค้าภาษาไทย');
  const en = str(input.en);
  const slug = str(input.slug) || slugFrom(en) || `product-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  if (!Number.isInteger(input.brandId)) throw new InputError('กรุณาเลือกแบรนด์');
  const images = Array.isArray(input.images) ? input.images : [];
  if (!images.every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const specs = parseSpecs(str(input.specs));
  const material = str(input.material) || null;
  const ref = await db.query(
    `select exists(select 1 from categories where key = $1) as c,
            exists(select 1 from brands where id = $2) as b,
            ($3::text is null or exists(select 1 from materials where key = $3::text)) as m`,
    [str(input.category), input.brandId, material],
  );
  if (!ref.rows[0].c) throw new InputError('ไม่พบหมวดนี้');
  if (!ref.rows[0].b) throw new InputError('ไม่พบแบรนด์นี้');
  if (!ref.rows[0].m) throw new InputError('ไม่พบวัสดุนี้');
  const v = [
    slug, str(input.category), input.brandId, material, str(input.series), th, en || th,
    str(input.descTh), str(input.descEn), JSON.stringify(specs), images, input.featured === true, input.published === true,
  ];
  if (id === null) {
    const r = await db.query(
      `insert into products (slug, category_key, brand_id, material_key, series, name_th, name_en, desc_th, desc_en,
         specs, images, featured, published, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, (select coalesce(max(sort), 0) + 1 from products))
       returning id::int as id`,
      v,
    );
    return r.rows[0].id;
  }
  const r = await db.query(
    `update products set slug = $1, category_key = $2, brand_id = $3, material_key = $4, series = $5, name_th = $6,
       name_en = $7, desc_th = $8, desc_en = $9, specs = $10::jsonb, images = $11, featured = $12, published = $13,
       updated_at = now()
     where id = $14`,
    [...v, id],
  );
  if (r.rowCount === 0) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  return id;
}

export async function deleteProduct(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้');
  await db.query('delete from products where id = $1', [id]);
}

export async function setPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  const r = await db.query('update products set published = $2, updated_at = now() where id = $1', [id, published === true]);
  if (r.rowCount === 0) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
}
