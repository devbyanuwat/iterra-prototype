'use client';

// หลังบ้าน: ข้อความจากฟอร์มติดต่อ ใหม่สุดก่อน · ยังไม่มีอีเมลแจ้ง (SMTP ทำรอบถัดไป) ต้องเข้ามาดูที่นี่
// ข้อความยาวหลายบรรทัด จึงเป็นการ์ดทุกขนาดจอ ไม่ทำเป็นแถวตั้งแต่ lg แบบหน้าอื่น
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminInquiry } from '@/lib/server/inquiries';
import { markHandledAction } from '@/app/admin/(panel)/inquiries/actions';
import { ghost } from './ui';

export default function InquiriesAdmin({ items }: { items: AdminInquiry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const waiting = items.filter((x) => !x.handled).length;

  async function done(x: AdminInquiry) {
    setBusy(x.id);
    try {
      const r = await markHandledAction(x.id);
      setMsg(r.ok ? `ทำเครื่องหมายข้อความของ ${x.name} ว่าจัดการแล้ว` : r.error);
      if (r.ok) router.refresh();
    } catch {
      setMsg('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ข้อความติดต่อ</h1>
        <p className="mt-1 text-sm text-stone-600">
          ยังไม่จัดการ {waiting} จากทั้งหมด {items.length} ข้อความ · ยังไม่มีอีเมลแจ้ง เข้ามาดูที่หน้านี้
        </p>
      </header>
      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>
      {items.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-14 text-center text-sm">ยังไม่มีข้อความ</div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {items.map((x) => (
            <li key={x.id} className="glass rounded-[24px] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{x.name}</p>
                  <p className="break-all text-xs text-stone-600">
                    {x.email} · {x.created}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${x.handled ? 'border border-ink text-ink' : 'bg-ink text-paper'}`}>
                  {x.handled ? 'จัดการแล้ว' : 'ใหม่'}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{x.message}</p>
              {!x.handled && (
                <button type="button" className={`${ghost} mt-3 bg-white/60`} disabled={busy !== null} onClick={() => done(x)}>
                  {busy === x.id ? 'กำลังบันทึก' : 'ทำเครื่องหมายว่าจัดการแล้ว'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
