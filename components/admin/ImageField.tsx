'use client';

// รายการรูป: รูปแรกคือรูปหลัก · อัปโหลดทีละไฟล์ ไฟล์ขึ้น server ทันที แต่ลง DB ตอนกดบันทึกฟอร์ม
import { useState } from 'react';
import { uploadImageAction } from '@/app/admin/(panel)/upload-action';
import { danger, ghost } from './ui';

export default function ImageField({
  value,
  onChange,
  multiple = true,
  max = Infinity,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
  max?: number; // จำนวนรูปสูงสุดเมื่อ multiple · ครบแล้วซ่อนช่องอัปโหลด
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('ไฟล์ใหญ่เกิน 5 MB');
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await uploadImageAction(fd);
      if (r.ok) onChange(multiple ? [...value, r.url] : [r.url]);
      else setError(r.error);
    } catch {
      setError('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {value.map((src, i) => (
            <li key={src} className="text-center">
              <img src={src} alt={i === 0 ? 'รูปหลัก' : `รูปที่ ${i + 1}`} className="h-24 w-24 rounded-xl bg-white object-contain" />
              <button type="button" className={`${ghost} ${danger} text-xs`} onClick={() => onChange(value.filter((x) => x !== src))}>
                ลบรูป
              </button>
            </li>
          ))}
        </ul>
      )}
      {(multiple ? value.length < max : value.length === 0) && (
        <label className="block cursor-pointer rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-6 text-center text-sm transition focus-within:border-ink hover:border-ink">
          {busy ? 'กำลังอัปโหลด' : 'กดเพื่อเลือกรูป'}
          <span className="mt-1 block text-xs text-stone-600">JPG, PNG หรือ WebP ไม่เกิน 5 MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={pick} />
        </label>
      )}
      <p role="alert" className={`min-h-5 pt-1 text-sm ${danger}`}>
        {error}
      </p>
    </div>
  );
}
