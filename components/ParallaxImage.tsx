'use client';

// ภาพ parallax ในเนื้อหา: ภาพขยับสวนทิศกับ scroll เล็กน้อย
// เดสก์ท็อปเท่านั้น (มือถือ = ภาพนิ่ง ประหยัดแรงเครื่อง) + เคารพ reduced-motion

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Placeholder from './Placeholder';

type Props = {
  label: string;
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  speed?: number; // yPercent สุทธิ; ค่าลบ = เลื่อนสวนทาง
  dark?: boolean;
  className?: string;
};

export default function ParallaxImage({
  label,
  ratio = '3/2',
  speed = -8,
  dark = false,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current;
    if (!el) return;
    const img = el.firstElementChild as HTMLElement | null;
    if (!img) return;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      gsap.fromTo(
        img,
        { yPercent: -speed },
        {
          yPercent: speed,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });

    return () => mm.revert();
  }, [speed]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div className="scale-[1.18] will-change-transform">
        <Placeholder label={label} ratio={ratio} dark={dark} />
      </div>
    </div>
  );
}
