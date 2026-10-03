'use client';

// การ์ดบนฉากตอนเจาะดูชิ้นส่วน: แถวหัว (ชื่อหมวด ตัวเลือกที่เลือกอยู่ ปุ่มย่อ ปุ่มปิด) จุดสี ปุ่มทรง คำอธิบาย
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
  // ย่อการ์ดเหลือแถวหัว เมื่อการ์ดบังชิ้นที่กำลังดู · กล้องยังอยู่มุมใกล้
  open: boolean;
  collapse: string;
  expand: string;
  onToggle: () => void;
};

export default function FocusCard({ part, title, name, tag, note, choices, value, onChange, shapes, shape, onShape, back, onBack, open, collapse, expand, onToggle }: Props) {
  const root = useRef<HTMLDivElement>(null);
  // เข้าโหมดเจาะดู หรือย้ายไปชิ้นอื่น: ย้าย focus มาที่ตัวเลือกที่เลือกอยู่
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }, [part]);

  const icon =
    'flex h-11 w-9 items-center justify-center text-base text-ink transition-[color,transform] hover:text-warm-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] motion-reduce:transition-none';

  return (
    <div
      ref={root}
      data-focus-card
      role="group"
      aria-label={title}
      className={`absolute inset-x-0 bottom-0 z-10 animate-[card-in_0.5s_cubic-bezier(0.16,1,0.3,1)] border-t border-warm-300 bg-paper pl-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:border lg:pl-4 ${open ? 'pb-2 lg:w-[264px] lg:pb-4' : ''}`}
    >
      {/* แถวหัว: ชื่อหมวดกับตัวเลือก · ปุ่มย่อ/กาง · ปุ่มปิด (กลับมุมกว้าง) */}
      <div className="flex items-center gap-1">
        <p className="mr-auto flex flex-wrap items-baseline gap-x-2 py-2 pr-3 text-xs font-normal text-warm-500">
          {title}
          <span className="text-sm text-ink">
            {name}
            {tag && <span className="ml-2 text-xs text-warm-500">{tag}</span>}
          </span>
        </p>
        <button type="button" aria-expanded={open} aria-label={open ? collapse : expand} title={open ? collapse : expand} onClick={onToggle} className={icon}>
          <span aria-hidden>{open ? '−' : '+'}</span>
        </button>
        <button type="button" aria-label={back} title={back} onClick={onBack} className={`${icon} mr-1`}>
          <span aria-hidden>×</span>
        </button>
      </div>
      {open && (
        <div className="pr-3 lg:pr-4">
          {choices.length > 0 && (
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
            </div>
          )}
          {shapes && (
            <div className="flex flex-wrap gap-1.5 py-1">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === shape}
                  onClick={() => onShape?.(s.id)}
                  className={`min-h-11 border px-2.5 text-xs transition-[color,background-color,border-color,transform] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none ${s.id === shape ? 'border-ink bg-ink text-paper' : 'border-warm-300 text-ink hover:border-ink'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <p aria-live="polite" className="mt-1 line-clamp-2 text-xs font-normal leading-relaxed text-stone-600 lg:line-clamp-none">
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
