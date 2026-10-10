'use client';

// Smooth scroll ทั้งเว็บด้วย Lenis (lerp 0.08 — หนืดแบบพรีเมียม)
// ผูกกับ gsap.ticker เพื่อให้ ScrollTrigger sync เฟรมเดียวกัน
// เคารพ prefers-reduced-motion: ถ้าผู้ใช้ปิด motion จะไม่สร้าง Lenis เลย

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let lenis: Lenis | null = null;

// Lenis ไม่ถูกสร้างเมื่อผู้ใช้ปิด motion: ตกไปใช้การเลื่อนของเบราว์เซอร์
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else window.scrollTo(0, 0);
}

export default function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const instance = new Lenis({ lerp: 0.08 });
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
