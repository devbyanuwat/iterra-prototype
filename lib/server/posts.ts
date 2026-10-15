// บทความ: เขียนจากหลังบ้าน และอ่านให้หน้าเว็บ (เฉพาะที่มี published_at)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// หน้าเว็บแสดงเนื้อหาและหมวดเป็นภาษาไทย (เหมือนก่อนย้ายมา DB) หลังบ้านจึงแก้ body_th กับ tag_th อย่างเดียว body_en tag_en ไม่แตะ
import type { Post, PostCard } from '../posts';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminPost = {
  id: number;
  slug: string;
  titleTh: string;
  titleEn: string;
  excerptTh: string;
  excerptEn: string;
  tagTh: string;
  bodyTh: string; // ย่อหน้าคั่นด้วยบรรทัดว่าง
  cover: string;
  inline: string[]; // ไม่เกิน 2 รูป แทรกหลังย่อหน้าที่ 2 และ 4
  published: boolean;
  date: string; // วันเผยแพร่ YYYY-MM-DD · '' = ร่าง
  updated: string; // YYYY-MM-DD เวลาไทย
};
export type PostInput = Omit<AdminPost, 'id' | 'date' | 'updated'>;

const GONE = 'ไม่พบบทความนี้ อาจถูกลบไปแล้ว';
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
// วันนี้ตามเวลาไทย ไม่ขึ้นกับ timezone ของ DB
const TODAY = "(now() at time zone 'Asia/Bangkok')::date";
const SELECT = `select p.*, p.id::int as pid, to_char(p.published_at, 'YYYY-MM-DD') as day,
                       to_char(p.updated_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as updated_day
                  from posts p`;

// ย่อหน้าคั่นด้วยบรรทัดว่าง (spec หัวข้อ 3)
export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export async function listAdminPosts(db: Db): Promise<AdminPost[]> {
  const r = await db.query(`${SELECT} order by p.updated_at desc, p.id desc`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    titleTh: x.title_th,
    titleEn: x.title_en,
    excerptTh: x.excerpt_th,
    excerptEn: x.excerpt_en,
    tagTh: x.tag_th,
    bodyTh: x.body_th,
    cover: x.cover ?? '',
    inline: x.inline,
    published: x.day !== null,
    date: x.day ?? '',
    updated: x.updated_day,
  }));
}

// คืน id · เผยแพร่ครั้งแรกได้วันที่วันนี้ แก้ทีหลังวันที่เดิมไม่เปลี่ยน · ไม่ติ๊กเผยแพร่ = ร่าง (published_at null)
export async function savePost(db: Db, id: number | null, input: PostInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError(GONE);
  const titleTh = text(input.titleTh, 200, 'กรุณากรอกหัวข้อภาษาไทย');
  const titleEn = text(input.titleEn, 200);
  const bodyTh = text(input.bodyTh, 20000, 'กรุณากรอกเนื้อหา');
  // แก้แล้วล้างช่อง slug = คง slug เดิม (null → coalesce ตอน update) ไม่งั้นลิงก์สาธารณะเปลี่ยนเงียบ ๆ
  const given = text(input.slug, 80);
  const slug = given || (id === null ? slugFrom(titleEn) || `post-${Date.now().toString(36)}` : null);
  if (slug !== null && !SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  const cover = text(input.cover, 300);
  if (!cover) throw new InputError('กรุณาใส่รูปปก');
  const inline = Array.isArray(input.inline) ? input.inline : [];
  if (inline.length > 2) throw new InputError('รูปประกอบได้ไม่เกิน 2 รูป');
  if (![cover, ...inline].every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const excerptTh = text(input.excerptTh, 400);
  const v = [
    slug, titleTh, titleEn || titleTh, excerptTh, text(input.excerptEn, 400) || excerptTh, bodyTh, text(input.tagTh, 60),
    cover, inline, input.published === true,
  ];
  if (id === null) {
    const r = await db.query(
      `insert into posts (slug, title_th, title_en, excerpt_th, excerpt_en, body_th, tag_th, cover, inline, published_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, case when $10::boolean then ${TODAY} end)
       returning id::int as id`,
      v,
    );
    return r.rows[0].id;
  }
  const r = await db.query(
    `update posts set slug = coalesce($1, slug), title_th = $2, title_en = $3, excerpt_th = $4, excerpt_en = $5, body_th = $6, tag_th = $7,
       cover = $8, inline = $9, published_at = case when $10::boolean then coalesce(published_at, ${TODAY}) end, updated_at = now()
     where id = $11`,
    [...v, id],
  );
  if (r.rowCount === 0) throw new InputError(GONE);
  return id;
}

export async function setPostPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query(
    `update posts set published_at = case when $2::boolean then coalesce(published_at, ${TODAY}) end, updated_at = now() where id = $1`,
    [id, published === true],
  );
  if (r.rowCount === 0) throw new InputError(GONE);
}

// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null
export async function deletePost(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('delete from posts where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}

// ── อ่านให้หน้าเว็บ · เฉพาะที่เผยแพร่ ──
function toCard(x: any): PostCard {
  return {
    slug: x.slug,
    title: { th: x.title_th, en: x.title_en },
    excerpt: { th: x.excerpt_th, en: x.excerpt_en },
    date: x.day,
    cover: x.cover ?? '',
    tag: x.tag_th,
  };
}

export async function listPublishedPosts(db: Db): Promise<PostCard[]> {
  // เลือกเฉพาะคอลัมน์ที่การ์ดใช้ · ไม่ดึงเนื้อบทความ เพราะ root layout เรียกทุก request
  const r = await db.query(
    `select p.slug, p.title_th, p.title_en, p.excerpt_th, p.excerpt_en, p.cover, p.tag_th,
            to_char(p.published_at, 'YYYY-MM-DD') as day
       from posts p where p.published_at is not null order by p.published_at desc, p.id desc`,
  );
  return r.rows.map(toCard);
}

export async function getPublishedPost(db: Db, slug: string): Promise<Post | null> {
  const r = await db.query(`${SELECT} where p.published_at is not null and p.slug = $1`, [slug]);
  const x = r.rows[0];
  return x ? { ...toCard(x), inline: x.inline, body: paragraphs(x.body_th) } : null;
}
