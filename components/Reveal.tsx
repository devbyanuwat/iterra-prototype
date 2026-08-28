'use client';

// Reveal ตอนเข้า viewport: clip-path เปิดจากล่าง + fade + เลื่อนขึ้นเล็กน้อย
// เนื้อหาอยู่ใน DOM ตั้งแต่ SSR (ไม่ inject ทีหลัง) — ปลอดภัยต่อ crawler
// prefers-reduced-motion → แสดงทันทีไม่มีแอนิเมชัน

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export default function Reveal({ children, className = '', delay = 0, y = 36 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        el,
        { opacity: 0, y, clipPath: 'inset(100% 0% 0% 0%)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.1,
          delay,
          ease: 'power3.out',
          clearProps: 'clipPath,willChange',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      );
    });

    return () => mm.revert();
  }, [delay, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
