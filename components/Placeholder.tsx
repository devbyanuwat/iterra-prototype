// ── จุดเปลี่ยนเป็นของจริง #4 ──
// ทุกตำแหน่งที่เห็น <Placeholder label="..." /> คือจุดที่รอภาพจริง
// ตอนนี้วาดภาพจำลองด้วย SVG (components/artwork.tsx) แทนกล่องเปล่า
// เมื่อได้ภาพแล้ว แทนที่ component นี้ด้วย <Image /> ของ next/image แล้วลบ artwork.tsx ทิ้ง
// (สัดส่วนภาพถูกล็อกไว้แล้ว: hero 16:9, สินค้า 4:5, บทความ 16:9)

import { Artwork } from './artwork';

type Props = {
  label: string;
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  fill?: boolean;
  dark?: boolean;
  className?: string;
  /** ซ่อนป้ายชื่อภาพ — ใช้ตอนพรีวิวให้ลูกค้าดูโดยไม่มีข้อความกำกับ */
  hideLabel?: boolean;
};

export default function Placeholder({
  label,
  ratio = '4/5',
  fill = false,
  dark = false,
  className = '',
  hideLabel = false,
}: Props) {
  return (
    <div
      className={`${fill ? 'absolute inset-0 h-full w-full' : 'relative w-full'} overflow-hidden ${className}`}
      style={fill ? undefined : { aspectRatio: ratio.replace('/', ' / ') }}
      role="img"
      aria-label={`ภาพประกอบ: ${label}`}
    >
      <Artwork label={label} dark={dark} />

      {!hideLabel && (
        <span
          className={`pointer-events-none absolute bottom-3 left-3 text-[9px] uppercase tracking-widest2 ${
            dark ? 'text-stone-400/50' : 'text-stone-600/45'
          }`}
          aria-hidden
        >
          {label}
        </span>
      )}
    </div>
  );
}
