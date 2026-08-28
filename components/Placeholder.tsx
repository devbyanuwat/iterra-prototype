// ── จุดเปลี่ยนเป็นของจริง #4 ──
// ทุกตำแหน่งที่เห็น <Placeholder label="..." /> คือจุดที่รอภาพจริง
// เมื่อได้ภาพแล้ว แทนที่ component นี้ด้วย <Image /> ของ next/image
// (สัดส่วนภาพถูกล็อกไว้แล้ว: hero 16:9, สินค้า 4:5, บทความ 16:9)

type Props = {
  label: string;
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  fill?: boolean;
  dark?: boolean;
  className?: string;
};

export default function Placeholder({
  label,
  ratio = '4/5',
  fill = false,
  dark = false,
  className = '',
}: Props) {
  const tone = dark
    ? 'from-stone-700 via-stone-800 to-stone-900 text-stone-400'
    : 'from-stone-200 via-stone-300 to-stone-400 text-stone-600';
  return (
    <div
      className={`${fill ? 'absolute inset-0 h-full w-full' : 'relative w-full'} overflow-hidden bg-gradient-to-br ${tone} ${className}`}
      style={fill ? undefined : { aspectRatio: ratio.replace('/', ' / ') }}
      role="img"
      aria-label={`ภาพประกอบ: ${label}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-current opacity-10" aria-hidden />
      <div className="absolute inset-y-0 left-1/2 w-px bg-current opacity-10" aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="border border-current px-3 py-1.5 text-[10px] font-normal uppercase tracking-widest2 opacity-60">
          {label}
        </span>
      </div>
    </div>
  );
}
