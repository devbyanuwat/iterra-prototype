'use client';

// รูปของการ์ดผลงาน: วางเมาส์แล้วสุ่มรูปถัดไปกับทิศเลื่อน รูปเก่าเลื่อนออก รูปใหม่เลื่อนเข้าในกรอบเดิม ทุก 2 วินาที
// ตอนชี้ รูปขยายและส่วนอื่นของหน้ามืดลง (.spot ใน globals.css)
// เอาเมาส์ออก = หยุดที่รูปปัจจุบัน · จอสัมผัสและ reduced motion ไม่เลื่อน · รูปถัดไปโหลดตอนจะใช้

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const DIRS = [
  [100, 0],
  [-100, 0],
  [0, 100],
  [0, -100],
];
const img = 'absolute inset-0 h-full w-full object-cover';

// สุ่มเลข 0..n-1 ที่ไม่ใช่ not
const pick = (n: number, not: number) => {
  const i = Math.floor(Math.random() * (n - 1));
  return i >= not ? i + 1 : i;
};

export default function ProjectSlides({ images, alt }: { images: string[]; alt: string }) {
  const [s, setS] = useState({ cur: 0, prev: -1, dir: 0, n: 0 });
  const timer = useRef<number | undefined>(undefined);
  const cur = useRef(0);

  const step = () => {
    const next = pick(images.length, cur.current);
    const im = new Image();
    im.src = images[next];
    im.decode()
      .catch(() => {})
      .then(() => {
        if (timer.current === undefined) return; // เมาส์ออกไปแล้วระหว่างโหลด
        const prev = cur.current;
        cur.current = next;
        setS((o) => ({ cur: next, prev, dir: Math.floor(Math.random() * DIRS.length), n: o.n + 1 }));
      });
  };
  const stop = () => {
    window.clearInterval(timer.current);
    timer.current = undefined;
  };
  const start = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || images.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stop();
    timer.current = window.setInterval(step, 2000);
    step();
  };
  useEffect(() => stop, []);

  const [dx, dy] = DIRS[s.dir];
  const vars = { '--dx': `${dx}%`, '--dy': `${dy}%` } as CSSProperties;

  return (
    <div onPointerEnter={start} onPointerLeave={stop} className="spot">
      <div className="relative w-full overflow-hidden bg-warm-200" style={{ aspectRatio: '3 / 2' }}>
        {s.prev >= 0 && <img key={`out${s.n}`} src={images[s.prev]} alt="" aria-hidden className={`${img} animate-[slide-out_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]`} style={vars} />}
        <img key={`in${s.n}`} src={images[s.cur]} alt={alt} loading="lazy" decoding="async" className={`${img} ${s.prev >= 0 ? 'animate-[slide-in_0.7s_cubic-bezier(0.16,1,0.3,1)]' : ''}`} style={vars} />
      </div>
    </div>
  );
}
