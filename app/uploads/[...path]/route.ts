import { readFile } from 'node:fs/promises';
import { TYPES, resolveInside } from '@/lib/server/uploads';

// ส่งไฟล์ที่อัปโหลดจาก UPLOAD_DIR · next start ไม่ส่งไฟล์ที่เพิ่มเข้า public/ หลัง build จึงต้องมี route นี้
// บนเครื่องจริงให้ nginx ส่งโฟลเดอร์นี้ตรงได้ route นี้เป็นทางสำรองและใช้ตอนพัฒนา
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = process.env.UPLOAD_DIR;
  const file = root ? resolveInside(root, parts) : null;
  const type = TYPES[parts.at(-1)?.split('.').pop() ?? ''];
  if (!file || !type) return new Response('Not found', { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
