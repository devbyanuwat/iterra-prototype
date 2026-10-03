// ── จุดเปลี่ยนเป็นของจริง #4 ──
// ไม่มี src = กล่อง placeholder มีป้ายชื่อ (จุดที่ยังรอภาพจริง)
// มี src = ภาพจริงในกรอบสัดส่วนเดิม · label ใช้เป็น alt ('' = ภาพประกอบ ข้อความข้าง ๆ บอกครบแล้ว)
// fit="contain" สำหรับภาพสินค้าตัดพื้นหลัง: วางกลางกรอบ เว้นขอบ 18% บนพื้น warm-100 (dark = ink)
// (ParallaxImage ขยายภาพ 1.18 เท่าและเลื่อน ±7% ขอบน้อยกว่านี้สินค้าจะชนขอบกรอบ)

type Props = {
  label?: string;
  src?: string;
  fit?: 'cover' | 'contain';
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  fill?: boolean;
  dark?: boolean;
  className?: string;
};

export default function Placeholder({
  label = '',
  src,
  fit = 'cover',
  ratio = '4/5',
  fill = false,
  dark = false,
  className = '',
}: Props) {
  const box = fill ? 'absolute inset-0 h-full w-full' : 'relative w-full';
  const style = fill ? undefined : { aspectRatio: ratio.replace('/', ' / ') };

  if (src) {
    const contain = fit === 'contain';
    const surface = dark ? 'bg-ink' : contain ? 'bg-warm-100' : 'bg-warm-200';
    return (
      <div className={`${box} overflow-hidden ${surface} ${className}`} style={style}>
        <img
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          className={
            contain
              ? 'absolute left-[18%] top-[18%] h-[64%] w-[64%] object-contain'
              : 'absolute inset-0 h-full w-full object-cover'
          }
        />
      </div>
    );
  }

  const tone = dark
    ? 'from-stone-700 via-stone-800 to-stone-900 text-stone-400'
    : 'from-stone-200 via-stone-300 to-stone-400 text-stone-600';
  return (
    <div
      className={`${box} overflow-hidden bg-gradient-to-br ${tone} ${className}`}
      style={style}
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
