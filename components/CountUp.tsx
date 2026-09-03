'use client';

// ตัวเลขสถิติ count-up ตอนเข้าจอ
// ค่าใน DOM ตั้งต้นคือค่าจริง (SEO เห็นเลขจริง) แล้วค่อยวิ่งจาก 0 เมื่อเข้าจอ

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { groupedNumber } from '@/lib/date';

type Props = { to: number; suffix?: string; className?: string };

export default function CountUp({ to, suffix = '', className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: to,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onStart: () => {
        el.textContent = `0${suffix}`;
      },
      onUpdate: () => {
        el.textContent = `${groupedNumber(obj.v)}${suffix}`;
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [to, suffix]);

  return (
    <span ref={ref} className={className}>
      {groupedNumber(to)}
      {suffix}
    </span>
  );
}
