import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { currentAdmin, inTx } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { MAX_PDF, isPdf, pdfPageCount, pdfSizeMb, saveCatalog } from '@/lib/server/catalog';
import { newName, type UploadResult } from '@/lib/server/uploads';

// เปลี่ยนไฟล์แคตตาล็อก PDF (ไม่เกิน 30 MB) · ใช้ Route Handler แทน Server Function เพราะ
// 1) Server Function รับได้ไม่เกิน serverActions.bodySizeLimit 6 MB ใน next.config.mjs (ไฟล์ protected ไม่แก้)
// 2) proxy.ts ทำงานกับ /admin/* และพักข้อมูลได้แค่ 10 MB (proxyClientMaxBodySize) เกินนั้นตัดทิ้งเงียบ ๆ ไม่ error
// route นี้อยู่นอก /admin จึงไม่ผ่าน proxy และต้องตรวจ session เองทุกครั้ง
// บน server nginx ต้องตั้ง client_max_body_size 31m
const json = (r: UploadResult, status = 200) => Response.json(r, { status });

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return json({ ok: false, error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
  // cookie เป็น SameSite=lax อยู่แล้ว ด่านนี้กันซ้ำ: เบราว์เซอร์บอกว่าคำขอมาจากเว็บอื่น = ไม่รับ
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return json({ ok: false, error: 'ไม่รับคำขอจากเว็บอื่น' }, 403);
  // ดูขนาดจาก header ก่อนอ่านเนื้อ ไม่ให้ไฟล์ใหญ่เข้าหน่วยความจำ · เผื่อส่วนหัว multipart 64 KB
  const length = Number(req.headers.get('content-length'));
  if (!length) return json({ ok: false, error: 'ไม่พบไฟล์' }, 411);
  if (length > MAX_PDF + 64 * 1024) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 30 MB' }, 413);
  const root = process.env.UPLOAD_DIR;
  if (!root) throw new Error('ยังไม่ได้ตั้ง UPLOAD_DIR ใน .env');
  const file = (await req.formData()).get('file');
  if (!(file instanceof File) || file.size === 0) return json({ ok: false, error: 'ไม่พบไฟล์' }, 400);
  if (file.size > MAX_PDF) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 30 MB' }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return json({ ok: false, error: 'รับเฉพาะไฟล์ PDF' }, 400);
  const name = newName('pdf');
  const full = path.join(root, name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  const url = `/uploads/${name}`;
  const pages = pdfPageCount(bytes);
  const sizeMb = pdfSizeMb(bytes.length);
  // ponytail: ไฟล์เก่าไม่ลบ (การลบข้อมูลต้องได้อนุมัติ) ถ้าดิสก์เริ่มเต็มค่อยทำสคริปต์ล้างไฟล์ที่ไม่มีแถวไหนอ้าง
  await inTx(async (tx) => {
    await saveCatalog(tx, url, pages, sizeMb);
    await audit(tx, admin.id, 'replace', 'catalog', 1, { pdf: url, pages, sizeMb });
  });
  return json({ ok: true, url });
}
