'use client';

// Smooth scroll ทั้งเว็บด้วย Lenis (lerp 0.08 — หนืดแบบพรีเมียม)
// ผูกกับ gsap.ticker เพื่อให้ ScrollTrigger sync เฟรมเดียวกัน
// เคารพ prefers-reduced-motion: ถ้าผู้ใช้ปิด motion จะไม่สร้าง Lenis เลย

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const instance = new Lenis({ lerp: 0.08 });
    lenis.current = instance;
    instance.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // ── เปลี่ยนหน้าแล้วต้องขึ้นบนสุด ────────────────────────────────────────
  //
  // Next เลื่อนขึ้นบนสุดให้เองอยู่แล้วตอนเปลี่ยน route โดยเขียน scrollTop ของ
  // เอกสาร แต่ Lenis ไม่ได้อ่านค่านั้น มันถือตำแหน่งของตัวเองไว้ใน animatedScroll
  // และเขียนทับกลับลงไปในเฟรมถัดมา ผลคือหน้าใหม่ถูกวาดที่ตำแหน่งเลื่อนของหน้าเก่า
  // — กดเมนูตอนอยู่กลางหน้าแล้วหน้าใหม่เปิดมากลางหน้า
  //
  // สั่ง Lenis เองจึงเป็นทางเดียวที่ได้ผล และต้องเป็น immediate: การ tween ขึ้น
  // บนสุดคือให้ผู้อ่านนั่งดูหน้าใหม่ไหลผ่านตาไปหนึ่งวินาที ซึ่งไม่ใช่การเปลี่ยนหน้า
  //
  // ตอน mount รอบแรก pathname ก็เปลี่ยนจาก undefined เป็นค่าแรกด้วย แต่ตอนนั้น
  // ตำแหน่งเป็น 0 อยู่แล้ว การสั่งซ้ำจึงไม่ทำอะไร — ยกเว้นกรณีเดียวที่เบราว์เซอร์
  // คืนตำแหน่งเดิมให้ตอน refresh กลางหน้า ซึ่ง Lenis เองก็ไม่รู้จักอยู่ดี
  useEffect(() => {
    if (!lenis.current) return;
    // มี #hash คือผู้อ่านตั้งใจไปที่จุดนั้น ไม่ใช่บนสุด — อย่าไปแย่ง
    if (window.location.hash) return;
    lenis.current.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
