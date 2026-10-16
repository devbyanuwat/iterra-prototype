'use client';

// หลังบ้าน: วิดีโอ hero หน้าแรก · อัปโหลดผ่าน POST /api/hero-video/ (ไฟล์ดิบเป็น body) แล้วระบบแปลงเบื้องหลัง
// ใช้ XMLHttpRequest เพราะ fetch ไม่บอกความคืบหน้าตอนส่งไฟล์ · ระหว่างแปลงถาม GET ทุก 4 วินาที
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HeroAdmin } from '@/lib/server/hero-video';
import { danger, ghost } from './ui';

// ตรงกับ MAX_VIDEO และ MAX_SECONDS ใน lib/server/hero-video.ts (ไม่ import ไฟล์นั้นเข้า bundle ฝั่ง client)
const MAX = 100 * 1024 * 1024;

export default function HeroVideoAdmin({ hero }: { hero: HeroAdmin }) {
  const router = useRouter();
  const [state, setState] = useState(hero);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => setState(hero), [hero]);

  const processing = state.job.status === 'processing';
  const poll = useCallback(async () => {
    const res = await fetch('/api/hero-video/', { cache: 'no-store' });
    if (!res.ok) return;
    const next = (await res.json()) as HeroAdmin;
    setState(next);
    if (next.job.status === 'idle') {
      setMsg('แปลงเสร็จแล้ว หน้าแรกใช้วิดีโอใหม่ทันที');
      router.refresh();
    } else if (next.job.status === 'failed') setMsg('');
  }, [router]);
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [processing, poll]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    if (file.size > MAX) return setError('ไฟล์ใหญ่เกิน 100 MB');
    setError('');
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/hero-video/');
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let r: { ok: boolean; error?: string } = { ok: false, error: 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง' };
      try {
        r = JSON.parse(xhr.responseText);
      } catch {}
      if (!r.ok) return setError(r.error ?? 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
      setState((s) => ({ ...s, job: { status: 'processing', error: null, started: null } }));
      setMsg('อัปโหลดแล้ว กำลังแปลงไฟล์ ใช้เวลาราว 1 ถึง 2 นาที ปิดหน้านี้ได้ หน้าแรกยังใช้วิดีโอเดิมจนกว่าจะเสร็จ');
    };
    xhr.onerror = () => {
      setProgress(null);
      setError('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
    };
    xhr.send(file);
  }

  async function reset() {
    if (!confirm('กลับไปใช้วิดีโอตั้งต้นของเว็บ? ไฟล์ที่อัปโหลดไว้ยังเก็บอยู่ แต่หน้าแรกจะไม่ใช้แล้ว')) return;
    setError('');
    const res = await fetch('/api/hero-video/', { method: 'DELETE' });
    if (!res.ok) return setError('เปลี่ยนไม่สำเร็จ ลองใหม่อีกครั้ง');
    setMsg('หน้าแรกกลับไปใช้วิดีโอตั้งต้นแล้ว');
    router.refresh();
  }

  const m = state.media;
  const busy = progress !== null || processing;
  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">วิดีโอหน้าแรก</h1>
        <p className="mt-1 text-sm text-stone-600">วิดีโอพื้นหลังที่เล่นวนแบบไม่มีเสียงบนหน้าแรก</p>
      </header>
      <section className="glass space-y-5 rounded-[28px] p-5 md:p-6">
        <h2 className="text-xl font-light">วิดีโอปัจจุบัน</h2>
        {/* key ให้ video โหลดไฟล์ใหม่เมื่อเปลี่ยน source */}
        <video key={m.webm} className="aspect-video w-full rounded-2xl bg-ink object-cover" poster={m.poster} muted loop playsInline controls preload="metadata">
          <source src={m.webm} type="video/webm" />
          <source src={m.mp4} type="video/mp4" />
        </video>
        <p className="text-sm text-stone-600">
          {state.custom ? `วิดีโอที่อัปโหลด เปลี่ยนล่าสุด ${state.updated}` : 'วิดีโอตั้งต้นของเว็บ'}
        </p>
        {processing && (
          <p role="status" className="text-sm">
            กำลังแปลงไฟล์{state.job.started ? ` (เริ่ม ${state.job.started.slice(11)})` : ''} หน้าแรกยังใช้วิดีโอเดิมจนกว่าจะเสร็จ
          </p>
        )}
        {state.job.status === 'failed' && state.job.error && <p className={`text-sm ${danger}`}>{state.job.error}</p>}
        <label className={`block rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-6 text-center text-sm transition focus-within:border-ink ${busy ? 'opacity-60' : 'cursor-pointer hover:border-ink'}`}>
          {progress !== null ? `กำลังอัปโหลด ${progress}%` : processing ? 'รอให้แปลงไฟล์เสร็จก่อน' : 'กดเพื่อเลือกวิดีโอใหม่'}
          <span className="mt-1 block text-xs text-stone-600">
            MP4, MOV หรือ WebM ไม่เกิน 100 MB ยาวไม่เกิน 30 วินาที · ระบบตัดเสียงและแปลงเป็น WebM กับ MP4 ให้ ด้านยาวไม่เกิน 1920 px
          </span>
          <input type="file" accept="video/*" className="sr-only" disabled={busy} onChange={pick} />
        </label>
        {state.custom && !busy && (
          <button type="button" onClick={reset} className={ghost}>
            กลับไปใช้วิดีโอตั้งต้น
          </button>
        )}
        <p role="alert" className={`min-h-5 text-sm ${danger}`}>
          {error}
        </p>
        <p role="status" className="min-h-5 text-sm">
          {msg}
        </p>
      </section>
    </>
  );
}
