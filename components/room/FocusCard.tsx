'use client';

// การ์ดบนฉากตอนเจาะดูชิ้นส่วน: ชื่อหมวด ตัวเลือกที่เลือกอยู่ คำอธิบาย จุดสี และปุ่มกลับมุมกว้าง
// ไม่มี three.js ในไฟล์นี้ · data-focus-card ให้ RoomScene หาเจอเพื่อลากเส้นชี้มาที่ขอบการ์ด

import { useEffect, useRef } from 'react';

export type Choice = { id: string; label: string; swatch: string };
type Props = {
  part: string; // เปลี่ยนเมื่อย้ายไปเจาะชิ้นอื่น ใช้ย้าย focus
  title: string;
  name: string;
  tag?: string;
  note: string;
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
  back: string;
  onBack: () => void;
};

export default function FocusCard({ part, title, name, tag, note, choices, value, onChange, back, onBack }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // เข้าโหมดเจาะดู หรือย้ายไปชิ้นอื่น: ย้าย focus มาที่ตัวเลือกที่เลือกอยู่
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }, [part]);

  return (
    <div
      ref={root}
      data-focus-card
      role="group"
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-10 border-t border-warm-300 bg-paper px-3 pb-2 pt-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-normal text-warm-500">
          {title}
          <span className="mt-0.5 block text-sm text-ink">
            {name}
            {tag && <span className="ml-2 text-xs text-warm-500">{tag}</span>}
          </span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 border border-warm-300 px-3 py-2 text-xs text-ink transition-[border-color,transform] hover:border-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none"
        >
          {back}
        </button>
      </div>
      <div className="-ml-2 mt-1 flex">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === value}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.id)}
            className="flex h-11 w-11 items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className={`block h-7 w-7 rounded-full border border-warm-300 ${c.id === value ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
              style={{ background: c.swatch }}
            />
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-1 line-clamp-2 text-xs font-normal leading-relaxed text-stone-600 lg:mt-2 lg:line-clamp-none">
        {note}
      </p>
    </div>
  );
}
