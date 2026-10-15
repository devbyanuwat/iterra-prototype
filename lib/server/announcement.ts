// ประกาศที่เด้งตอนเข้าเว็บ (แถวเดียว id = 1) · import แค่ node: เพื่อให้ scripts/check-db.mjs รันได้ตรง ๆ
// seen_key คือ id ที่เบราว์เซอร์จำว่าปิดไปแล้ว (lib/announcement.ts) เปลี่ยนค่า = ทุกคนเห็นอีกครั้ง
import { randomBytes } from 'node:crypto';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
type Name = { th: string; en: string };

export class InputError extends Error {
  name = 'InputError';
}

export type AnnouncementData = {
  enabled: boolean;
  id: string;
  image: string | null;
  title: Name;
  body: Name;
  cta: { label: Name; href: string } | null;
};
export type AnnouncementInput = {
  enabled: boolean;
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
  image: string;
  ctaTh: string;
  ctaEn: string;
  href: string;
  resetSeen: boolean;
};

// < และ > ไม่มีเหตุให้ใช้ในข้อความหลังบ้าน ปฏิเสธไว้ก่อน เผื่อวันหน้ามีที่ไหนเผลอแสดงเป็น HTML
const str = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  return s;
};

export async function getAnnouncement(db: Db): Promise<AnnouncementData | null> {
  const a = (await db.query('select * from announcement where id = 1')).rows[0];
  if (!a) return null;
  return {
    enabled: a.enabled,
    id: a.seen_key,
    image: a.image,
    title: { th: a.title_th, en: a.title_en },
    body: { th: a.body_th, en: a.body_en },
    cta: a.cta_href ? { label: { th: a.cta_label_th ?? '', en: a.cta_label_en ?? '' }, href: a.cta_href } : null,
  };
}

export async function saveAnnouncement(db: Db, input: AnnouncementInput): Promise<void> {
  const titleTh = str(input.titleTh);
  const bodyTh = str(input.bodyTh);
  if (!titleTh || !bodyTh) throw new InputError('กรุณากรอกหัวข้อและเนื้อหาภาษาไทย');
  const href = str(input.href);
  const ctaTh = str(input.ctaTh);
  // ลิงก์ในเว็บเอง หรือ https เท่านั้น กัน javascript: และ data:
  // \ ห้ามด้วย เพราะเบราว์เซอร์อ่าน /\evil.com เป็น //evil.com
  if (href && (!/^(\/(?!\/)\S*|https:\/\/\S+)$/.test(href) || href.includes('\\'))) throw new InputError('ลิงก์ต้องขึ้นต้นด้วย / หรือ https://');
  if (href && !ctaTh) throw new InputError('กรุณากรอกข้อความปุ่มภาษาไทย');
  const image = str(input.image);
  if (image && (!/^\/(media|uploads)\/[\w./-]+$/.test(image) || image.includes('..'))) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  await db.query(
    `insert into announcement (id, enabled, seen_key, title_th, title_en, body_th, body_en, image, cta_label_th, cta_label_en, cta_href, updated_at)
     values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (id) do update set
       enabled = excluded.enabled,
       seen_key = case when $11::boolean then excluded.seen_key else announcement.seen_key end,
       title_th = excluded.title_th, title_en = excluded.title_en,
       body_th = excluded.body_th, body_en = excluded.body_en,
       image = excluded.image,
       cta_label_th = excluded.cta_label_th, cta_label_en = excluded.cta_label_en, cta_href = excluded.cta_href,
       updated_at = now()`,
    [
      input.enabled === true,
      randomBytes(6).toString('hex'),
      titleTh,
      str(input.titleEn) || titleTh,
      bodyTh,
      str(input.bodyEn) || bodyTh,
      image || null,
      href ? ctaTh : null,
      href ? str(input.ctaEn) || ctaTh : null,
      href || null,
      input.resetSeen === true,
    ],
  );
}
