'use client';

// หลังบ้าน: แคตตาล็อก PDF · อัปโหลดผ่าน POST /api/catalog-pdf/ (Route Handler) เพราะไฟล์ใหญ่เกินเพดานของ Server Function
// ไฟล์ใหม่แทนไฟล์เดิมทันที · ไฟล์ที่ไม่ใช่ชุดเดิมไม่มีภาพรายหน้า หน้าเว็บจึงให้เปิด PDF ตรง
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogInfo } from '@/lib/server/catalog';
import type { UploadResult } from '@/lib/server/uploads';
import { danger } from './ui';

// ตรงกับ MAX_PDF ใน lib/server/catalog.ts (ไม่ import ไฟล์นั้นเข้า bundle ฝั่ง client)
const MAX = 30 * 1024 * 1024;

export default function CatalogAdmin({ catalog }: { catalog: CatalogInfo | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    if (file.size > MAX) return setError('ไฟล์ใหญ่เกิน 30 MB');
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/catalog-pdf/', { method: 'POST', body: fd });
      const r = (await res.json()) as UploadResult;
      if (!r.ok) return setError(r.error);
      setMsg('เปลี่ยนแคตตาล็อกแล้ว หน้าเว็บใช้ไฟล์ใหม่ทันที');
      router.refresh();
    } catch {
      setError('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">แคตตาล็อก</h1>
        <p className="mt-1 text-sm text-stone-600">ไฟล์ PDF ที่หน้าเว็บให้เปิดดูและดาวน์โหลด</p>
      </header>
      <section className="glass space-y-5 rounded-[28px] p-5 md:p-6">
        <h2 className="text-xl font-light">ไฟล์ปัจจุบัน</h2>
        {catalog ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-stone-600">ไฟล์</dt>
            <dd className="min-w-0 break-all">
              <a href={catalog.pdf} target="_blank" rel="noopener" className="underline underline-offset-4">
                {catalog.pdf}
              </a>
            </dd>
            <dt className="text-stone-600">จำนวนหน้า</dt>
            <dd>{catalog.pages > 0 ? `${catalog.pages} หน้า` : 'นับจากไฟล์ไม่ได้ หน้าเว็บจึงไม่แสดงจำนวนหน้า'}</dd>
            <dt className="text-stone-600">ขนาด</dt>
            <dd>{catalog.sizeMb} MB</dd>
            <dt className="text-stone-600">เปลี่ยนล่าสุด</dt>
            <dd>{catalog.updated}</dd>
            <dt className="text-stone-600">ภาพตัวอย่างรายหน้า</dt>
            <dd>{catalog.images ? 'มี (ชุดที่สร้างจากไฟล์นี้)' : 'ไม่มี หน้าเว็บให้เปิด PDF ตรง'}</dd>
          </dl>
        ) : (
          <p className="text-sm">ยังไม่มีแคตตาล็อก</p>
        )}
        <label className="block cursor-pointer rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-6 text-center text-sm transition focus-within:border-ink hover:border-ink">
          {busy ? 'กำลังอัปโหลด อาจใช้เวลาสักครู่' : 'กดเพื่อเลือกไฟล์ PDF ใหม่'}
          <span className="mt-1 block text-xs text-stone-600">PDF ไม่เกิน 30 MB · ไฟล์ใหม่แทนไฟล์เดิมทันที</span>
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={pick} />
        </label>
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
