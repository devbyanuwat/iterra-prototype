'use client';

// Hero: วิดีโอครัวเล่นวน (ไม่มีเสียง) เป็นพื้นหลัง + parallax/scale ตาม scroll
// มือถือ: ตัด parallax เหลือ intro fade · reduced-motion: แสดง poster นิ่ง ไม่เล่นวิดีโอ · เลื่อนพ้นจอแล้วหยุดเล่น

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLang } from './LangProvider';

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { t } = useLang();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);
    const v = video.current;

    // วิดีโอ: เล่นเฉพาะตอนอนุญาต motion และฮีโร่อยู่บนจอ
    // ใช้ ScrollTrigger (เช็กสถานะตอนสร้าง/refresh) แทน IntersectionObserver ที่ไม่ยิงถ้าเริ่มบนจออยู่แล้ว
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (!v) return;
      const sync = (self: ScrollTrigger) => (self.isActive ? v.play().catch(() => {}) : v.pause());
      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: sync, onRefresh: sync });
      return () => v.pause();
    });

    // intro: ตัวหนังสือ fade-up ทีละบรรทัด
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        el.querySelectorAll('[data-hero-fade]'),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, delay: 0.2 },
      );
    });

    // parallax หลายชั้น: เดสก์ท็อปเท่านั้น
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: true } as const;
      el.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || '0');
        gsap.to(layer, { yPercent: depth * 42, ease: 'none', scrollTrigger: { ...st } });
      });
      gsap.fromTo(
        el.querySelector('[data-hero-scale]'),
        { scale: 1 },
        { scale: 1.08, ease: 'none', scrollTrigger: { ...st } },
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink">
      {/* ชั้น 1: วิดีโอพื้นหลังเต็มจอ */}
      <div data-depth="0.15" className="absolute inset-0 will-change-transform">
        <div data-hero-scale className="absolute inset-0 origin-center will-change-transform">
          <video
            ref={video}
            className="absolute inset-0 h-full w-full object-cover"
            poster="/media/hero/hero.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          >
            <source src="/media/hero/hero.webm" type="video/webm" />
            <source src="/media/hero/hero.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/25" aria-hidden />
        {/* ม่านซ้ายหลังบล็อกตัวหนังสือ ให้อ่านออกแม้เฟรมสว่าง */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" aria-hidden />
        {/* ม่านบน ให้ nav (mix-blend-difference) อ่านออกแม้เฟรมสว่าง */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 via-black/45 to-transparent" aria-hidden />
      </div>

      {/* ชั้น 2: ตัวหนังสือ */}
      <div
        data-depth="0.75"
        className="relative z-10 flex h-full flex-col items-start justify-end px-6 pb-28 text-white will-change-transform md:px-[8vw]"
      >
        <p data-hero-fade className="mb-5 text-[11px] uppercase tracking-widest2 text-white/70">
          {t.home.heroKicker}
        </p>
        <h1
          data-hero-fade
          className="mb-6 whitespace-pre-line text-4xl font-extralight leading-[1.15] tracking-wide md:text-6xl"
        >
          {t.home.heroTitle}
        </h1>
        <p data-hero-fade className="mb-10 max-w-xl text-sm font-light leading-relaxed text-white/75 md:text-base">
          {t.home.heroSub}
        </p>
        <div data-hero-fade>
          <Link
            href="/products/"
            className="inline-block border border-white/60 px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-white hover:text-ink"
          >
            {t.common.explore}
          </Link>
        </div>
      </div>

      {/* scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/60" aria-hidden>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest2">{t.common.scroll}</span>
          <span className="block h-8 w-px animate-pulse bg-white/50" />
        </div>
      </div>
    </section>
  );
}
