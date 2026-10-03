'use client';

// จุดสีให้เลือกสีผิวสินค้า · md = หน้า detail (จุด 28px ในปุ่ม 44px) · sm = การ์ด (จุด 16px ในปุ่ม 32px)
// มีสีเดียว = จุดบอกสีเฉย ๆ ไม่ใช่ปุ่ม

import { useLang } from './LangProvider';
import type { Finish } from '@/lib/finishes';

type Props = {
  finishes: Finish[];
  value: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
};

export default function FinishDots({ finishes, value, onChange, size = 'md', className = '' }: Props) {
  const { lang, t } = useLang();
  const hit = size === 'md' ? 'h-11 w-11' : 'h-8 w-8';
  const dot = size === 'md' ? 'h-7 w-7' : 'h-4 w-4';
  const name = (f: Finish) => (f.demo ? `${f.name[lang]} (${t.products.finishDemo})` : f.name[lang]);
  const circle = (f: Finish, on: boolean) => (
    <span
      aria-hidden
      className={`block rounded-full border border-warm-300 ${dot} ${on ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
      style={{ background: f.swatch }}
    />
  );

  // ปุ่มกว้างกว่าตัวจุดข้างละ 8px → ดึงซ้าย 8px ให้ขอบจุดแรกตรงกับข้อความ
  if (finishes.length === 1) {
    const f = finishes[0];
    return (
      <div className={`-ml-2 flex ${className}`}>
        <span role="img" aria-label={name(f)} title={name(f)} className={`flex items-center justify-center ${hit}`}>
          {circle(f, false)}
        </span>
      </div>
    );
  }
  return (
    <div role="group" aria-label={t.products.finish} className={`-ml-2 flex ${className}`}>
      {finishes.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={f.id === value}
          aria-label={name(f)}
          title={name(f)}
          onClick={() => onChange(f.id)}
          className={`flex items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] ${hit}`}
        >
          {circle(f, f.id === value)}
        </button>
      ))}
    </div>
  );
}
