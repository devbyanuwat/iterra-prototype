import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { after } from 'next/server';
import { db, DEMO } from '@/lib/db';
import { currentAdmin, inTx } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import {
  MAX_VIDEO, convertVideo, failHeroJob, finishHeroJob, getHeroAdmin, probeVideo, resetHero, startHeroJob,
} from '@/lib/server/hero-video';

// วิดีโอ hero หน้าแรก · Route Handler แทน Server Function เพราะไฟล์ใหญ่ถึง 100 MB (เหตุผลเดียวกับ /api/catalog-pdf/)
// POST รับไฟล์ดิบเป็น body (ไม่ใช่ multipart) เขียนลงไฟล์ชั่วคราวทีละช่วง ไม่ถือทั้งก้อนในหน่วยความจำ
// แปลงด้วย ffmpeg หลังตอบกลับแล้ว (after) เพราะใช้เวลาเกินกว่าจะให้ request รอ · หน้าหลังบ้านถาม GET ทุกไม่กี่วินาที
// บน server proxy ต้องตั้ง client_max_body_size 101m เฉพาะ path นี้ (deploy/nginx.conf)
type Result = { ok: true } | { ok: false; error: string };
const json = (r: Result | object, status = 200) => Response.json(r, { status });

async function guard(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return { res: json({ ok: false, error: 'กรุณาเข้าสู่ระบบใหม่' }, 401) };
  // cookie เป็น SameSite=lax อยู่แล้ว ด่านนี้กันซ้ำ: เบราว์เซอร์บอกว่าคำขอมาจากเว็บอื่น = ไม่รับ
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return { res: json({ ok: false, error: 'ไม่รับคำขอจากเว็บอื่น' }, 403) };
  return { admin };
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  return json(await getHeroAdmin(db));
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const admin = g.admin;
  // โหมดนำเสนอบน Vercel ไม่มี ffmpeg
  if (DEMO) return json({ ok: false, error: 'โหมดนำเสนออัปโหลดวิดีโอไม่ได้' }, 400);
  const length = Number(req.headers.get('content-length'));
  if (!length || !req.body) return json({ ok: false, error: 'ไม่พบไฟล์' }, 411);
  if (length > MAX_VIDEO) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 100 MB' }, 413);
  const root = process.env.UPLOAD_DIR;
  if (!root) throw new Error('ยังไม่ได้ตั้ง UPLOAD_DIR ใน .env');

  // ไฟล์ชั่วคราวอยู่นอก UPLOAD_DIR เพราะ /uploads/ เปิดให้คนนอกอ่านได้
  const dir = await mkdtemp(path.join(tmpdir(), 'iterra-hero-'));
  const src = path.join(dir, 'upload');
  const cleanup = () => rm(dir, { recursive: true, force: true });
  let seen = 0;
  const limit = new Transform({
    transform(chunk, _enc, done) {
      seen += chunk.length;
      done(seen > MAX_VIDEO ? new Error('too big') : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as import('node:stream/web').ReadableStream), limit, createWriteStream(src));
  } catch {
    await cleanup();
    return json({ ok: false, error: seen > MAX_VIDEO ? 'ไฟล์ใหญ่เกิน 100 MB' : 'อัปโหลดไม่ครบ ลองใหม่อีกครั้ง' }, seen > MAX_VIDEO ? 413 : 400);
  }

  try {
    await probeVideo(src);
  } catch (e) {
    await cleanup();
    if (e instanceof Error && e.name === 'InputError') return json({ ok: false, error: e.message }, 400);
    throw e;
  }
  if (!(await startHeroJob(db))) {
    await cleanup();
    return json({ ok: false, error: 'กำลังแปลงวิดีโอก่อนหน้าอยู่ รอให้เสร็จก่อน' }, 409);
  }

  after(async () => {
    try {
      const media = await convertVideo(src, root);
      await inTx(async (tx) => {
        await finishHeroJob(tx, media);
        await audit(tx, admin.id, 'replace', 'hero_video', 1, media);
      });
    } catch (e) {
      console.error('hero video convert failed', e);
      await failHeroJob(db, 'แปลงวิดีโอไม่สำเร็จ ลองไฟล์อื่น หรือส่งเป็น MP4 แบบ H.264');
    } finally {
      await cleanup();
    }
  });
  return json({ ok: true }, 202);
}

// กลับไปใช้วิดีโอตั้งต้นของเว็บ
export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const admin = g.admin;
  await inTx(async (tx) => {
    await resetHero(tx);
    await audit(tx, admin.id, 'reset', 'hero_video', 1);
  });
  return json({ ok: true });
}
