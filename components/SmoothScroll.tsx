'use client';

// Smooth scroll ทั้งเว็บด้วย Lenis (lerp 0.08 — หนืดแบบพรีเมียม)
// ผูกกับ gsap.ticker เพื่อให้ ScrollTrigger sync เฟรมเดียวกัน
// เคารพ prefers-reduced-motion: ถ้าผู้ใช้ปิด motion จะไม่สร้าง Lenis เลย

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.08 });
    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
