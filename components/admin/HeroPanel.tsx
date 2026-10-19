'use client';

// แผงวิดีโอหน้าแรกบนหน้าเว็บจริง (โหมดแก้ไขของ AdminBar) · ใช้ HeroVideoAdmin ตัวเดียวกับหลังบ้าน
// ข้อมูลจาก GET /api/hero-video/ ที่ตรวจสิทธิ์แอดมินเอง · วิดีโอยังไม่มีร่างและประวัติ (spec 2026-10-19) แปลงเสร็จแล้วขึ้นหน้าแรกทันที
import { useEffect, useRef, useState } from 'react';
import type { HeroAdmin } from '@/lib/server/hero-video';
import HeroVideoAdmin from './HeroVideoAdmin';

export default function HeroPanel({ onClose }: { onClose: () => void }) {
  const [hero, setHero] = useState<HeroAdmin | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.show();
    fetch('/api/hero-video/', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setHero, () => setError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง'));
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={(e) => e.key === 'Escape' && ref.current?.close()}
      aria-label="วิดีโอหน้าแรก"
      className="glass fixed inset-x-0 bottom-0 top-auto z-[47] !m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-b-none rounded-t-[28px] p-3 text-ink shadow-xl md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[min(94vw,560px)] md:rounded-none md:rounded-l-[28px]"
    >
      <div className="flex justify-end">
        <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => ref.current?.close()}>
          ปิด
        </button>
      </div>
      <div className="space-y-4">
        {hero ? (
          <HeroVideoAdmin hero={hero} />
        ) : (
          <p role="status" className="p-3 text-sm">
            {error || 'กำลังโหลด'}
          </p>
        )}
      </div>
    </dialog>
  );
}
