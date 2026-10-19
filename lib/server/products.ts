// สินค้า: เขียนจากหลังบ้าน (Task 6) และอ่านให้หน้าเว็บ (Task 8)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

import type { Product } from '../products';
import { applyDraft } from '../product-draft.mjs';

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
  draft: ProductDraft | null; // ร่างที่ยังไม่เผยแพร่ · null = ไม่มี
};
export type ProductInput = Omit<AdminProduct, 'id' | 'brand' | 'updated' | 'draft'>;
// เนื้อหาที่เก็บใน revisions · การแสดงหรือซ่อนไม่อยู่ในนี้ เพราะเป็นสวิตช์ที่มีผลทันที
export type ProductDraft = Omit<ProductInput, 'published'>;
export type ProductRevision = { id: number; at: string; user: string | null; published: boolean; data: ProductDraft };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
// < และ > ไม่มีเหตุให้ใช้ในข้อความหลังบ้าน ปฏิเสธไว้ก่อน เผื่อวันหน้ามีที่ไหนเผลอแสดงเป็น HTML
const str = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  return s;
};
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

const notFound = () => new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');

function toAdmin(x: any): AdminProduct {
  return {
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
    draft: x.draft ?? null,
  };
}
const draftOf = ({ id: _i, brand: _b, updated: _u, published: _p, draft: _d, ...rest }: AdminProduct): ProductDraft => rest;

// ร่าง = revision ล่าสุดที่ยังไม่เผยแพร่ · revision ล่าสุดเผยแพร่แล้วได้ draft เป็น null
const WITH_DRAFT = `select x.*, d.draft from (${SELECT}) x
  left join lateral (select data as draft, published_at from revisions
                      where entity = 'product' and entity_id = x.pid order by id desc limit 1) d on d.published_at is null`;

export async function listAdmin(db: Db): Promise<AdminProduct[]> {
  const r = await db.query(`${WITH_DRAFT} order by x.updated_at desc, x.id desc`);
  return r.rows.map(toAdmin);
}

// ตรวจและจัดข้อมูลให้เรียบร้อย ใช้ทั้งตอนบันทึกลงคอลัมน์และตอนเก็บร่าง
async function clean(db: Db, input: ProductDraft): Promise<ProductDraft> {
  const th = str(input.th);
  if (!th) throw new InputError('กรุณากรอกชื่อสินค้าภาษาไทย');
  const en = str(input.en);
  const slug = str(input.slug) || slugFrom(en) || `product-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  if (!Number.isInteger(input.brandId)) throw new InputError('กรุณาเลือกแบรนด์');
  const images = Array.isArray(input.images) ? input.images : [];
  if (!images.every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  parseSpecs(str(input.specs));
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
  return {
    slug, category: str(input.category), brandId: input.brandId, material: material ?? '', series: str(input.series), th, en,
    descTh: str(input.descTh), descEn: str(input.descEn), specs: str(input.specs), images, featured: input.featured === true,
  };
}

// คืน id · ไม่แตะราคาและภาพบรรยากาศ (scenes) เพราะยังไม่มีช่องในฟอร์ม
export async function saveProduct(db: Db, id: number | null, input: ProductInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw notFound();
  const d = await clean(db, input);
  const v = [
    d.slug, d.category, d.brandId, d.material || null, d.series, d.th, d.en || d.th,
    d.descTh, d.descEn, JSON.stringify(parseSpecs(d.specs)), d.images, d.featured, input.published === true,
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
  if (r.rowCount === 0) throw notFound();
  return id;
}

// ── ร่าง เผยแพร่ ประวัติ (spec 2026-10-19) ──

// เก็บร่าง หน้าเว็บยังไม่เปลี่ยน · สินค้าใหม่ได้แถวที่ซ่อนไว้ก่อนเพราะต้องมี id
export async function saveDraft(db: Db, id: number | null, input: ProductDraft, userId: number): Promise<{ id: number; rev: number }> {
  if (id !== null && !Number.isInteger(id)) throw notFound();
  const live = id === null ? null : (await db.query(`${SELECT} where p.id = $1`, [id])).rows[0];
  if (id !== null && !live) throw notFound();
  const data = await clean(db, input);
  // ร่างยังไม่ลงคอลัมน์ unique ของ slug จึงต้องเช็กเอง ไม่งั้นไปเจอตอนกดเผยแพร่
  if ((await db.query('select 1 from products where slug = $1 and id is distinct from $2', [data.slug, id])).rows.length)
    throw new InputError('slug นี้มีสินค้าอื่นใช้แล้ว');
  if (id === null) id = await saveProduct(db, null, { ...data, published: false });
  else
    // ร่างแรกของสินค้าที่มีอยู่ก่อน: เก็บฉบับที่ขึ้นเว็บไว้เป็นฉบับตั้งต้น ย้อนกลับมาได้
    await db.query(
      `insert into revisions (entity, entity_id, data, user_id, at, published_at)
       select 'product', $1, $2::jsonb, null, $3, $3
        where not exists (select 1 from revisions where entity = 'product' and entity_id = $1)`,
      [id, JSON.stringify(draftOf(toAdmin(live))), live.updated_at],
    );
  const r = await db.query(
    `insert into revisions (entity, entity_id, data, user_id) values ('product', $1, $2::jsonb, $3) returning id::int as id`,
    [id, JSON.stringify(data), userId],
  );
  return { id, rev: r.rows[0].id };
}

// เขียนร่างล่าสุดลงคอลัมน์ให้หน้าเว็บเห็น และตั้งเป็นแสดง · คืนเลข revision
export async function publishDraft(db: Db, id: number): Promise<number> {
  if (!Number.isInteger(id)) throw notFound();
  const d = (
    await db.query(
      `select id::int as id, data, published_at from revisions where entity = 'product' and entity_id = $1 order by id desc limit 1`,
      [id],
    )
  ).rows[0];
  if (!d || d.published_at) throw new InputError('ไม่มีฉบับร่างให้เผยแพร่');
  await saveProduct(db, id, { ...d.data, published: true });
  await db.query('update revisions set published_at = now() where id = $1', [d.id]);
  return d.id;
}

// ใหม่สุดก่อน · ponytail: ไม่แบ่งหน้า สินค้าหนึ่งชิ้นแก้ไม่กี่สิบครั้ง
export async function listRevisions(db: Db, id: number): Promise<ProductRevision[]> {
  if (!Number.isInteger(id)) throw notFound();
  const r = await db.query(
    `select r.id::int as id, to_char(r.at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') as at, u.name as "user",
            r.published_at is not null as published, r.data
       from revisions r left join admin_users u on u.id = r.user_id
      where r.entity = 'product' and r.entity_id = $1 order by r.id desc`,
    [id],
  );
  return r.rows;
}

// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null
export async function deleteProduct(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้');
  await db.query("delete from revisions where entity = 'product' and entity_id = $1", [id]);
  const r = await db.query('delete from products where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}

export async function setPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  const r = await db.query('update products set published = $2, updated_at = now() where id = $1', [id, published === true]);
  if (r.rowCount === 0) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
}

// ── อ่านให้หน้าเว็บ (Task 8) · เฉพาะที่เผยแพร่ ──
const ASK = { th: 'สอบถามราคา', en: 'Price on request' };

function toProduct(r: any): Product {
  return {
    slug: r.slug,
    category: r.category_key,
    brand: r.brand_name,
    series: r.series,
    ...(r.material_key ? { material: r.material_key } : {}),
    name: { th: r.name_th, en: r.name_en },
    desc: { th: r.desc_th, en: r.desc_en },
    specs: r.specs,
    price: r.price_th ? { th: r.price_th, en: r.price_en ?? r.price_th } : ASK,
    featured: r.featured,
    images: r.images,
    ...(r.scenes.length ? { scenes: r.scenes } : {}),
  };
}

export async function listPublished(db: Db): Promise<Product[]> {
  const r = await db.query(`${SELECT} where p.published order by p.sort, p.id`);
  return r.rows.map(toProduct);
}

export async function getPublished(db: Db, slug: string): Promise<Product | null> {
  const r = await db.query(`${SELECT} where p.published and p.slug = $1`, [slug]);
  return r.rows[0] ? toProduct(r.rows[0]) : null;
}

// ── โหมดดูร่างของแอดมิน (spec 2026-10-19 ข้อ 3) ──
// เหมือน listPublished แต่ใช้เนื้อหาร่างแทน และรวมสินค้าที่ยังซ่อนแต่มีร่าง (สินค้าใหม่ที่ยังไม่เคยเผยแพร่)
export async function listPreview(db: Db): Promise<Product[]> {
  const r = await db.query(
    `select y.*, b2.name as draft_brand from (${WITH_DRAFT}) y
       left join brands b2 on b2.id = (y.draft->>'brandId')::bigint
      where y.published or y.draft is not null order by y.sort, y.id`,
  );
  return r.rows.map((x) => (x.draft ? applyDraft(toProduct(x), x.draft, x.draft_brand ?? x.brand_name) : toProduct(x)));
}

// ponytail: กรองจากทั้งรายการ สินค้าหลักร้อยพอ
export async function getPreview(db: Db, slug: string): Promise<Product | null> {
  return (await listPreview(db)).find((p) => p.slug === slug) ?? null;
}

// สินค้าที่มีร่างรอเผยแพร่ ให้แถบแอดมินรู้ว่าหน้าไหนกดเผยแพร่ได้ · slug = ที่ขึ้นเว็บอยู่, draftSlug = ในร่าง
export async function listDrafts(db: Db): Promise<{ id: number; slug: string; draftSlug: string }[]> {
  const r = await db.query(`select x.pid as id, x.slug, x.draft->>'slug' as "draftSlug" from (${WITH_DRAFT}) x where x.draft is not null`);
  return r.rows;
}
