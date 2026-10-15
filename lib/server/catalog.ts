// แคตตาล็อก PDF (แถวเดียว id = 1): ตรวจไฟล์ นับหน้า และอ่านให้หน้าเว็บ
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type CatalogInfo = {
  pdf: string;
  pages: number; // 0 = นับจากไฟล์ไม่ได้
  sizeMb: number;
  updated: string; // YYYY-MM-DD HH:MM เวลาไทย
  images: boolean; // มีภาพรายหน้าที่ตรงกับไฟล์นี้หรือไม่
};

// spec หัวข้อ 5: PDF ไม่เกิน 30 MB · ครอบไฟล์ 18 MB ในเกณฑ์ประสิทธิภาพของ docs/pm/standards.md
export const MAX_PDF = 30 * 1024 * 1024;
// ภาพรายหน้าใน public/media/catalog สร้างจากไฟล์นี้ด้วย scripts/build-media.sh catalog (ต้องตรงกับ CATALOG.pdf ใน lib/catalog.ts)
// ไฟล์อื่นไม่มีภาพของตัวเอง เพราะไม่สร้างภาพบน server (spec หัวข้อ 10) หน้าเว็บจึงให้เปิด PDF ตรง
export const BUILT_PDF = '/media/catalog/kohler-kitchens-2026.pdf';

// ดูชนิดจากไบต์แรกของไฟล์ ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์ส่งมา
export function isPdf(b: Uint8Array): boolean {
  return b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === '%PDF-';
}

// นับหน้าโดยไม่ใช้ dependency: นับ object /Type /Page กับอ่าน /Count ของ page tree แล้วเอาค่ามากสุด
// ponytail: PDF ที่เก็บ object ไว้ใน object stream แบบบีบอัด (PDF 1.5 ขึ้นไปบางไฟล์) หาไม่เจอทั้งคู่ ได้ 0 = ไม่ทราบ
// ถ้าต้องแม่นทุกไฟล์ ให้เพิ่มช่องกรอกจำนวนหน้าในหลังบ้าน หรือใช้ pdfinfo บน server
export function pdfPageCount(b: Uint8Array): number {
  const s = Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString('latin1');
  const pages = (s.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  const counts = Array.from(s.matchAll(/\/Count\s+(\d+)/g), (m) => Number(m[1]));
  return Math.max(pages, 0, ...counts);
}

// MB ปัดขึ้นแบบ du -m (ไฟล์ 18,008,076 ไบต์ = 18 ตรงกับที่หน้าเว็บแสดงเดิม)
export const pdfSizeMb = (bytes: number) => Math.max(1, Math.ceil(bytes / 1048576));

export async function getCatalog(db: Db): Promise<CatalogInfo | null> {
  const r = await db.query(
    `select pdf, page_count, size_mb, to_char(updated_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') as updated
       from catalog where id = 1`,
  );
  const x = r.rows[0];
  return x ? { pdf: x.pdf, pages: x.page_count, sizeMb: x.size_mb, updated: x.updated, images: x.pdf === BUILT_PDF } : null;
}

export async function saveCatalog(db: Db, pdf: string, pages: number, sizeMb: number): Promise<void> {
  if (typeof pdf !== 'string' || !/^\/(media|uploads)\/[\w./-]+\.pdf$/.test(pdf) || pdf.includes('..')) {
    throw new InputError('ที่อยู่ไฟล์ PDF ไม่ถูกต้อง');
  }
  if (!Number.isInteger(pages) || pages < 0 || !Number.isInteger(sizeMb) || sizeMb < 1) throw new InputError('ข้อมูลไฟล์ไม่ถูกต้อง');
  await db.query(
    `insert into catalog (id, pdf, page_count, size_mb, updated_at) values (1, $1, $2, $3, now())
     on conflict (id) do update set pdf = excluded.pdf, page_count = excluded.page_count, size_mb = excluded.size_mb, updated_at = now()`,
    [pdf, pages, sizeMb],
  );
}
