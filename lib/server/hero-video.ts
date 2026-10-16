// วิดีโอ hero หน้าแรก: ตรวจไฟล์ด้วย ffprobe แปลงด้วย ffmpeg และอ่าน/เขียนแถว hero_video (แถวเดียว id = 1)
// import แค่ node: กับ sharp เพื่อให้ scripts/check-db.mjs รันได้ตรง ๆ · ต้องมี ffmpeg และ ffprobe บนเครื่อง (Dockerfile ลงให้)
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

// 100 MB พอสำหรับคลิป 1080p 30 วินาทีจากมือถือ (ราว 60 MB) · proxy ต้องตั้ง client_max_body_size 101m เฉพาะ /api/hero-video/
export const MAX_VIDEO = 100 * 1024 * 1024;
export const MAX_SECONDS = 30;
// ไฟล์ที่ได้: ด้านยาวไม่เกิน 1920 px ไม่เกิน 30 fps ไม่มีเสียง (hero เล่นแบบปิดเสียงอยู่แล้ว)
export const VIDEO_EDGE = 1920;
// งานแปลงค้างนานกว่านี้ (server restart กลางทาง) ถือว่าล้ม · คลิป 30 วินาทีบนเครื่อง 4 core ใช้ราว 1 ถึง 2 นาที
export const STALE_MIN = 15;
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

export const DEFAULT_HERO = { webm: '/media/hero/hero.webm', mp4: '/media/hero/hero.mp4', poster: '/media/hero/hero.jpg' };
export type HeroMedia = typeof DEFAULT_HERO;
export type HeroJob = { status: 'idle' | 'processing' | 'failed'; error: string | null; started: string | null };
export type HeroAdmin = { media: HeroMedia; custom: boolean; updated: string | null; job: HeroJob };

const TH = (col: string) => `to_char(${col} at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI')`;

export async function getHeroVideo(db: Db): Promise<HeroMedia & { custom: boolean }> {
  const x = (await db.query('select webm, mp4, poster from hero_video where id = 1 and webm is not null')).rows[0];
  return x ? { webm: x.webm, mp4: x.mp4, poster: x.poster, custom: true } : { ...DEFAULT_HERO, custom: false };
}

export async function getHeroAdmin(db: Db): Promise<HeroAdmin> {
  const x = (
    await db.query(
      `select webm, mp4, poster, ${TH('updated_at')} as updated, job_status, job_error, ${TH('job_started_at')} as started,
              job_status = 'processing' and job_started_at < now() - make_interval(mins => $1) as stale
         from hero_video where id = 1`,
      [STALE_MIN],
    )
  ).rows[0];
  const custom = Boolean(x?.webm);
  const media = custom ? { webm: x.webm, mp4: x.mp4, poster: x.poster } : { ...DEFAULT_HERO };
  if (!x) return { media, custom, updated: null, job: { status: 'idle', error: null, started: null } };
  const job: HeroJob = x.stale
    ? { status: 'failed', error: `การแปลงค้างเกิน ${STALE_MIN} นาที อาจเพราะระบบเริ่มใหม่ระหว่างแปลง อัปโหลดใหม่อีกครั้ง`, started: x.started }
    : { status: x.job_status, error: x.job_error, started: x.started };
  return { media, custom, updated: custom ? x.updated : null, job };
}

// จองงานแปลง · คืน false ถ้ามีงานกำลังแปลงอยู่ (ที่ยังไม่ค้าง)
export async function startHeroJob(db: Db): Promise<boolean> {
  const r = await db.query(
    `insert into hero_video (id, job_status, job_started_at) values (1, 'processing', now())
     on conflict (id) do update set job_status = 'processing', job_error = null, job_started_at = now()
       where hero_video.job_status <> 'processing' or hero_video.job_started_at < now() - make_interval(mins => $1)`,
    [STALE_MIN],
  );
  return r.rowCount === 1;
}

const MEDIA_URL = { webm: /\.webm$/, mp4: /\.mp4$/, poster: /\.webp$/ } as const;

export async function finishHeroJob(db: Db, m: HeroMedia): Promise<void> {
  for (const k of ['webm', 'mp4', 'poster'] as const) {
    const u = m[k];
    if (typeof u !== 'string' || !/^\/uploads\/[\w/-]+\.\w+$/.test(u) || !MEDIA_URL[k].test(u)) throw new InputError('ที่อยู่ไฟล์วิดีโอไม่ถูกต้อง');
  }
  await db.query(
    `update hero_video set webm = $1, mp4 = $2, poster = $3, updated_at = now(), job_status = 'idle', job_error = null where id = 1`,
    [m.webm, m.mp4, m.poster],
  );
}

export async function failHeroJob(db: Db, error: string): Promise<void> {
  await db.query(`update hero_video set job_status = 'failed', job_error = $1 where id = 1`, [error.slice(0, 300)]);
}

// กลับไปใช้ไฟล์ตั้งต้น · ponytail: ไฟล์ที่เคยอัปโหลดไม่ลบ (การลบข้อมูลต้องได้อนุมัติ) เหมือนแคตตาล็อก
export async function resetHero(db: Db): Promise<void> {
  await db.query(`update hero_video set webm = null, mp4 = null, poster = null, updated_at = now() where id = 1`);
}

// รันคำสั่ง เก็บ stdout เป็น Buffer · ล้ม/เกินเวลา = Error ที่มีท้าย stderr
function run(cmd: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)));
    const timer = setTimeout(() => p.kill('SIGKILL'), RUN_TIMEOUT_MS);
    p.on('error', (e) => (clearTimeout(timer), reject(e)));
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`${cmd} exit ${code}: ${err.trim()}`));
    });
  });
}

// ดูชนิดจากเนื้อไฟล์ด้วย ffprobe ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์ส่งมา
export async function probeVideo(file: string): Promise<{ seconds: number; width: number; height: number }> {
  let info: any;
  try {
    info = JSON.parse((await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file])).toString());
  } catch {
    throw new InputError('ไม่ใช่ไฟล์วิดีโอ หรืออ่านไฟล์ไม่ได้');
  }
  // ภาพนิ่ง (เช่น png ที่ ffprobe อ่านได้) มี codec แบบภาพแต่ไม่มีความยาว
  const v = (info.streams ?? []).find((s: any) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
  if (!v) throw new InputError('ไม่พบภาพวิดีโอในไฟล์นี้');
  const seconds = Number(info.format?.duration ?? v.duration);
  if (!(seconds > 0)) throw new InputError('ไม่ใช่ไฟล์วิดีโอ หรืออ่านความยาวไม่ได้');
  if (seconds > MAX_SECONDS + 0.5) throw new InputError(`วิดีโอยาวเกิน ${MAX_SECONDS} วินาที`);
  const width = Number(v.width);
  const height = Number(v.height);
  if (!(width > 0 && height > 0)) throw new InputError('อ่านขนาดภาพวิดีโอไม่ได้');
  return { seconds, width, height };
}

const newBase = (now = new Date()) =>
  `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomBytes(12).toString('hex')}`;

// ย่อด้านยาวไม่เกิน VIDEO_EDGE (ไม่ขยาย) ด้านสั้นตามสัดส่วนเป็นเลขคู่ · หมุนตาม metadata ให้ ffmpeg ทำเอง
const SCALE = `scale='if(gte(iw,ih),min(${VIDEO_EDGE},iw),-2)':'if(gte(iw,ih),-2,min(${VIDEO_EDGE},ih))':flags=lanczos`;
// nice ลดลำดับความสำคัญ ให้หน้าเว็บยังตอบเร็วระหว่างแปลง · จำกัด 2 thread บนเครื่อง 4 core
const ffmpeg = (args: string[]) => run('nice', ['-n', '10', 'ffmpeg', '-nostdin', '-v', 'error', '-y', ...args]);

// แปลงเป็น WebM (VP9) + MP4 (H.264 สำหรับเบราว์เซอร์ที่เล่น WebM ไม่ได้) + ภาพปก WebP จากเฟรมแรก
// เขียนลง root/ปี/เดือน/ชื่อสุ่ม.* · คืน URL ใต้ /uploads/
export async function convertVideo(src: string, root: string): Promise<HeroMedia> {
  const base = newBase();
  const full = (ext: string) => path.join(root, `${base}.${ext}`);
  await mkdir(path.dirname(full('x')), { recursive: true });
  const common = ['-i', src, '-map', '0:v:0', '-an', '-sn', '-dn', '-vf', SCALE, '-fpsmax', '30', '-t', String(MAX_SECONDS), '-threads', '2', '-pix_fmt', 'yuv420p'];
  await ffmpeg([...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', full('webm')]);
  await ffmpeg([...common, '-c:v', 'libx264', '-crf', '26', '-preset', 'medium', '-movflags', '+faststart', full('mp4')]);
  const png = await ffmpeg(['-i', src, '-map', '0:v:0', '-vf', SCALE, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-']);
  await writeFile(full('webp'), await sharp(png).webp({ quality: 82 }).toBuffer());
  const url = (ext: string) => `/uploads/${base}.${ext}`;
  return { webm: url('webm'), mp4: url('mp4'), poster: url('webp') };
}
