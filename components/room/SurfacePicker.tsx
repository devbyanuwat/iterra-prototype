'use client';

// ตัวเลือกของพื้นผิว 1 ชิ้น: ปุ่มวัสดุ · จุดสีสำเร็จ · จุด "กำหนดสีเอง" ที่เปิดตัวเลือกสีของเบราว์เซอร์กับช่องพิมพ์รหัส #rrggbb
// ใช้ทั้งในแผงตัวเลือกและในการ์ดบนฉาก (compact) · ไม่มี three.js ในไฟล์นี้

import { useState } from 'react';
import { HEX } from '@/lib/room';

type Props = {
  materials: { id: string; label: string }[];
  material: string;
  onMaterial: (id: string) => void;
  colours: { hex: string; label: string }[]; // ว่าง = วัสดุนี้ไม่มีสีของตัวเอง (ผนังกันเปื้อนแบบเดียวกับท็อป)
  color: string;
  onColor: (hex: string) => void;
  text: { material: string; colour: string; custom: string; picker: string; hex: string; hexHint: string };
  compact?: boolean;
};

const dot = 'flex h-11 w-11 items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] motion-reduce:transition-none';
const ring = (on: boolean) => `block h-7 w-7 rounded-full border border-warm-300 ${on ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`;

export default function SurfacePicker({ materials, material, onMaterial, colours, color, onColor, text, compact }: Props) {
  const [custom, setCustom] = useState(() => !colours.some((c) => c.hex === color)); // โหมดกำหนดสีเองเปิดอยู่ไหม
  const [draft, setDraft] = useState<string | null>(null); // ข้อความในช่องรหัสสีตอนที่ยังไม่ใช่รหัสที่ใช้ได้
  const type = (raw: string) => {
    const v = raw.trim().toLowerCase();
    const hex = v.startsWith('#') ? v : `#${v}`;
    if (HEX.test(hex)) {
      setDraft(null);
      onColor(hex);
    } else setDraft(raw); // สีในฉากคงเดิมจนกว่าจะพิมพ์ครบ
  };
  const pill = compact ? 'min-h-11 border px-2.5 text-xs' : 'border px-4 py-2.5 text-sm';

  return (
    <>
      <div role="group" aria-label={text.material} className={`flex flex-wrap ${compact ? 'gap-1.5 py-1' : 'gap-2'}`}>
        {materials.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={m.id === material}
            onClick={() => onMaterial(m.id)}
            className={`${pill} transition-[color,background-color,border-color,transform] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none ${m.id === material ? 'border-ink bg-ink text-paper' : 'border-warm-300 text-ink hover:border-ink'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {colours.length > 0 && (
        <div role="group" aria-label={text.colour} className="-ml-2 mt-1 flex flex-wrap items-center">
          {colours.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-pressed={!custom && c.hex === color}
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                setCustom(false);
                setDraft(null);
                onColor(c.hex);
              }}
              className={dot}
            >
              <span aria-hidden className={ring(!custom && c.hex === color)} style={{ background: c.hex }} />
            </button>
          ))}
          <button type="button" aria-pressed={custom} aria-label={text.custom} title={text.custom} onClick={() => setCustom(true)} className={dot}>
            <span aria-hidden className={ring(custom)} style={{ background: 'conic-gradient(#d9534f, #e0c341, #5cb85c, #46b8da, #5b6fd6, #c45bd6, #d9534f)' }} />
          </button>
        </div>
      )}
      {custom && colours.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input type="color" aria-label={text.picker} title={text.picker} value={color} onChange={(e) => type(e.target.value)} className="h-11 w-11 cursor-pointer border border-warm-300 bg-paper p-1" />
          <input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={7}
            aria-label={text.hex}
            aria-invalid={draft !== null}
            value={draft ?? color}
            onChange={(e) => type(e.target.value)}
            onBlur={() => setDraft(null)}
            className={`h-11 w-28 border bg-paper px-3 font-mono text-sm text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink ${draft !== null ? 'border-ink' : 'border-warm-300'}`}
          />
          {draft !== null && (
            <p role="status" className="basis-full text-xs font-normal text-stone-600">
              {text.hexHint}
            </p>
          )}
        </div>
      )}
    </>
  );
}
