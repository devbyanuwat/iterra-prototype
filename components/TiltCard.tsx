'use client';

// การ์ด 3D tilt ตามเมาส์ (±6deg) + เงา soft ขยับสวนทาง
// ใช้ transform เท่านั้น · ปิดบน touch device และ prefers-reduced-motion

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

type Props = { children: React.ReactNode; className?: string };

export default function TiltCard({ children, className = '' }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outer.current;
    const card = inner.current;
    if (!el || !card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return; // มือถือ: ไม่ tilt

    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    const lift = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3' });

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 12); // ±6deg
      rx(-py * 12);
      lift(-4);
      card.style.setProperty('--sx', `${-px * 20}px`);
      card.style.setProperty('--sy', `${8 - py * 20}px`);
    };
    const onLeave = () => {
      rx(0);
      ry(0);
      lift(0);
      card.style.setProperty('--sx', '0px');
      card.style.setProperty('--sy', '0px');
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      // quickTo สร้าง tween ค้างไว้กับ card — ถอด listener อย่างเดียวไม่พอ
      gsap.killTweensOf(card);
    };
  }, []);

  return (
    <div ref={outer} className={className}>
      <div ref={inner} className="relative will-change-transform [transform-style:preserve-3d]">
        {/* เงาบนพื้นสว่าง: ดำ 60% เบลอ บนพื้น #E5E5E5 กลายเป็นก้อนมืดทึบ
            ไม่ใช่เงา — ลดเหลือ 18% ให้อ่านเป็นเงาจริงตามธีมใหม่ */}
        <div
          aria-hidden
          className="absolute inset-3 -z-10 bg-black/[0.18] blur-2xl transition-transform duration-300"
          style={{ transform: 'translate(var(--sx, 0px), var(--sy, 0px))' }}
        />
        {children}
      </div>
    </div>
  );
}
