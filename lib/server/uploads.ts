// ตรวจไฟล์อัปโหลด แปลงเป็น WebP และหา path ปลอดภัย · import แค่ node: กับ sharp (แพ็กเกจ npm ล้วน) เพื่อให้ scripts/check-db.mjs รันได้ตรง ๆ
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

export const MAX_IMAGE = 5 * 1024 * 1024;
export type UploadResult = { ok: true; url: string } | { ok: false; error: string };
// webm/mp4 คือวิดีโอ hero (lib/server/hero-video.ts) · route นี้ส่งทั้งไฟล์ ไม่รองรับ Range บนเครื่องจริงต้องให้ proxy ส่ง /uploads/ ตรง
export const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', webm: 'video/webm', mp4: 'video/mp4',
};

// ดูชนิดจากไบต์แรกของไฟล์ ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์ส่งมา
export function imageExt(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

// ตั้งชื่อใหม่แบบสุ่ม ไม่ใช้ชื่อไฟล์จากผู้ใช้ · แยกโฟลเดอร์ตามปีและเดือน
export function newName(ext: string, now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}/${month}/${randomBytes(12).toString('hex')}.${ext}`;
}

// path จาก URL ต้องอยู่ใต้ root เท่านั้น ไม่งั้นได้ null
export function resolveInside(root: string, parts: string[]): string | null {
  if (parts.length === 0) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, ...parts);
  return full.startsWith(base + path.sep) ? full : null;
}

// เพดานพิกเซลกันไฟล์เล็กที่ขยายแล้วกินแรม (decompression bomb): 50 ล้านพิกเซล ราว 8660 x 5770
export const MAX_PIXELS = 50_000_000;
export const MAX_EDGE = 2560;

class InputError extends Error {
  name = 'InputError';
}

// แปลงทุกรูปเป็น WebP: หมุนตาม EXIF ย่อด้านยาวไม่เกิน MAX_EDGE (ไม่ขยาย) ตัด metadata ทั้งหมดรวมพิกัด GPS
export async function toWebp(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const out = await sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    throw new InputError('อ่านรูปนี้ไม่ได้ หรือรูปใหญ่เกินไป');
  }
}
