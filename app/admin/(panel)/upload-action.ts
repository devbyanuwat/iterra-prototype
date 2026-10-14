'use server';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/admin';
import { MAX_IMAGE, imageExt, newName, toWebp, type UploadResult } from '@/lib/server/uploads';

// อัปโหลดรูปทีละไฟล์ไปเก็บใน UPLOAD_DIR · คืน URL ใต้ /uploads/ ให้ฟอร์มเก็บลง DB ตอนกดบันทึก
export async function uploadImageAction(form: FormData): Promise<UploadResult> {
  await requireAdmin();
  const root = process.env.UPLOAD_DIR;
  if (!root) throw new Error('ยังไม่ได้ตั้ง UPLOAD_DIR ใน .env');
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'ไม่พบไฟล์' };
  if (file.size > MAX_IMAGE) return { ok: false, error: 'ไฟล์ใหญ่เกิน 5 MB' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageExt(bytes)) return { ok: false, error: 'รับเฉพาะไฟล์ JPG, PNG หรือ WebP' };
  let webp: Uint8Array;
  try {
    webp = await toWebp(bytes);
  } catch (e) {
    if (e instanceof Error && e.name === 'InputError') return { ok: false, error: e.message };
    throw e;
  }
  const name = newName('webp');
  const full = path.join(root, name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, webp);
  return { ok: true, url: `/uploads/${name}` };
}
