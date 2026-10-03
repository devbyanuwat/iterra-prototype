'use client';

// การ์ดบนฉากตอนเจาะดูชิ้นส่วน: ชื่อหมวด ตัวเลือกที่เลือกอยู่ คำอธิบาย จุดสี และปุ่มกลับมุมกว้าง
// ไม่มี three.js ในไฟล์นี้ · data-focus-card ให้ RoomScene หาเจอเพื่อลากเส้นชี้มาที่ขอบการ์ด

import { useEffect, useRef } from 'react';

export type Choice = { id: string; label: string; swatch: string };
// ทรง (ก๊อก ซิงก์) เลือกด้วยปุ่มข้อความ ไม่ใช่จุดสี
export type ShapeChoice = { id: string; label: string };
type Props = {
  part: string; // เปลี่ยนเมื่อย้ายไปเจาะชิ้นอื่น ใช้ย้าย focus
  title: string;
  name: string;
  tag?: string;
  note: string;
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
  shapes?: ShapeChoice[];
  shape?: string;
  onShape?: (id: string) => void;
  back: string;
  onBack: () => void;
};

export default function FocusCard({ part, title, name, tag, note, choices, value, onChange, shapes, shape, onShape, back, onBack }: Props) {
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
      className="absolute inset-x-0 bottom-0 z-10 animate-[card-in_0.5s_cubic-bezier(0.16,1,0.3,1)] border-t border-warm-300 bg-paper px-3 pb-2 pt-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:p-4"
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-xs font-normal text-warm-500 lg:block">
        {title}
        <span className="text-sm text-ink lg:mt-0.5 lg:block">
          {name}
          {tag && <span className="ml-2 text-xs text-warm-500">{tag}</span>}
        </span>
      </p>
      {/* จุดสีกับปุ่มกลับอยู่แถวเดียวกัน ให้แถบบนจอแคบเตี้ยที่สุด */}
      <div className="-ml-2 flex items-center">
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
        <button
          type="button"
          onClick={onBack}
          className="ml-auto min-h-11 shrink-0 border border-warm-300 px-3 text-xs text-ink transition-[border-color,transform] hover:border-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none"
        >
          {back}
        </button>
      </div>
      {shapes && (
        <div className="mt-1 flex flex-wrap gap-1.5 pb-1">
          {shapes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === shape}
              onClick={() => onShape?.(s.id)}
              className={`min-h-11 border px-3 text-xs transition-[color,background-color,border-color,transform] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none ${s.id === shape ? 'border-ink bg-ink text-paper' : 'border-warm-300 text-ink hover:border-ink'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <p aria-live="polite" className="line-clamp-2 text-xs font-normal leading-relaxed text-stone-600 lg:mt-2 lg:line-clamp-none">
        {note}
      </p>
    </div>
  );
}
