// ผลงานอ้างอิง: เขียนจากหลังบ้าน และอ่านให้หน้าเว็บ (เฉพาะ published)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// สินค้าในผลงานเรียงตาม sort ของสินค้า เพราะ project_products ไม่มีคอลัมน์ลำดับ · หน้าเว็บเห็นเฉพาะสินค้าที่เผยแพร่
import type { Project } from '../projects';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminProject = {
  id: number;
  slug: string;
  th: string;
  en: string;
  locationTh: string;
  locationEn: string;
  typeTh: string;
  typeEn: string;
  year: string; // ค.ศ. 4 หลัก เป็นข้อความตามช่องในฟอร์ม
  images: string[]; // รูปแรกแสดงตอนเปิดหน้า
  products: number[]; // id ของสินค้าที่ใช้
  published: boolean;
};
export type ProjectInput = Omit<AdminProject, 'id'>;

const GONE = 'ไม่พบผลงานนี้ อาจถูกลบไปแล้ว';
const NO_PRODUCT = 'ไม่พบสินค้าบางรายการ อาจถูกลบไปแล้ว';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
// < และ > ไม่มีเหตุให้ใช้ในข้อความหลังบ้าน ปฏิเสธไว้ก่อน เผื่อวันหน้ามีที่ไหนเผลอแสดงเป็น HTML
function text(v: unknown, max: number, required = ''): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new InputError(required);
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  if (s.length > max) throw new InputError(`ยาวเกิน ${max} ตัวอักษร`);
  return s;
}
const slugFrom = (en: string) => en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');
const SELECT = `select p.*, p.id::int as pid,
         array(select pp.product_id::int from project_products pp join products pr on pr.id = pp.product_id
                where pp.project_id = p.id order by pr.sort, pr.id) as product_ids,
         array(select pr.slug from project_products pp join products pr on pr.id = pp.product_id
                where pp.project_id = p.id and pr.published order by pr.sort, pr.id) as product_slugs
    from projects p`;

export async function listAdminProjects(db: Db): Promise<AdminProject[]> {
  const r = await db.query(`${SELECT} order by p.sort, p.id`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    th: x.name_th,
    en: x.name_en,
    locationTh: x.location_th,
    locationEn: x.location_en,
    typeTh: x.type_th,
    typeEn: x.type_en,
    year: x.year === null ? '' : String(x.year),
    images: x.images,
    products: x.product_ids,
    published: x.published,
  }));
}

// คืน id · รายการสินค้าแทนทั้งชุดทุกครั้งที่บันทึก · ผลงานใหม่ไปอยู่ท้าย
export async function saveProject(db: Db, id: number | null, input: ProjectInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError(GONE);
  const th = text(input.th, 120, 'กรุณากรอกชื่อผลงานภาษาไทย');
  const en = text(input.en, 120);
  const locationTh = text(input.locationTh, 120);
  const typeTh = text(input.typeTh, 120);
  const slug = text(input.slug, 80) || slugFrom(en) || `project-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  const year = text(input.year, 10);
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) {
    throw new InputError('กรุณากรอกปีที่เสร็จเป็น ค.ศ. 4 หลัก เช่น 2026');
  }
  const images = Array.isArray(input.images) ? input.images : [];
  if (images.length === 0) throw new InputError('กรุณาใส่รูปอย่างน้อย 1 รูป');
  if (!images.every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const ids = [...new Set(Array.isArray(input.products) ? input.products : [])];
  if (!ids.every((x) => Number.isInteger(x))) throw new InputError(NO_PRODUCT);
  if (ids.length) {
    const found = await db.query('select count(*)::int as n from products where id = any($1::bigint[])', [ids]);
    if (found.rows[0].n !== ids.length) throw new InputError(NO_PRODUCT);
  }
  const v = [
    slug, th, en || th, locationTh, text(input.locationEn, 120) || locationTh, typeTh, text(input.typeEn, 120) || typeTh,
    Number(year), images, input.published === true,
  ];
  let pid: number;
  if (id === null) {
    const r = await db.query(
      `insert into projects (slug, name_th, name_en, location_th, location_en, type_th, type_en, year, images, published, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, (select coalesce(max(sort), 0) + 1 from projects))
       returning id::int as id`,
      v,
    );
    pid = r.rows[0].id;
  } else {
    const r = await db.query(
      `update projects set slug = $1, name_th = $2, name_en = $3, location_th = $4, location_en = $5, type_th = $6, type_en = $7,
         year = $8, images = $9, published = $10
       where id = $11`,
      [...v, id],
    );
    if (r.rowCount === 0) throw new InputError(GONE);
    pid = id;
  }
  await db.query('delete from project_products where project_id = $1', [pid]);
  if (ids.length) {
    await db.query('insert into project_products (project_id, product_id) select $1, unnest($2::bigint[])', [pid, ids]);
  }
  return pid;
}

export async function setProjectPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('update projects set published = $2 where id = $1', [id, published === true]);
  if (r.rowCount === 0) throw new InputError(GONE);
}

// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null · project_products หายตาม (on delete cascade)
export async function deleteProject(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('delete from projects where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}

// ── อ่านให้หน้าเว็บ · เฉพาะที่เผยแพร่ ──
export async function listPublishedProjects(db: Db): Promise<Project[]> {
  const r = await db.query(`${SELECT} where p.published order by p.sort, p.id`);
  return r.rows.map((x) => ({
    slug: x.slug,
    name: { th: x.name_th, en: x.name_en },
    location: { th: x.location_th, en: x.location_en },
    type: { th: x.type_th, en: x.type_en },
    year: x.year,
    images: x.images,
    products: x.product_slugs,
  }));
}
