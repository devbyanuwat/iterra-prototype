'use client';

// Hero parallax 3 ชั้น: พื้นหลัง (depth 0.15) → ภาพสินค้า (0.4) → ตัวหนังสือ (0.75)
// + พื้นหลัง scale 1.0 → 1.08 ตาม scroll
// มือถือ: ตัด parallax เหลือ intro fade · reduced-motion: นิ่งทั้งหมด

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Placeholder from './Placeholder';
import { useLang } from './LangProvider';

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { t } = useLang();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);

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
      {/* ชั้น 1: ภาพพื้นหลังเต็มจอ */}
      <div data-depth="0.15" className="absolute inset-0 will-change-transform">
        <div data-hero-scale className="absolute inset-0 origin-center will-change-transform">
          <Placeholder fill dark label="ภาพครัว HERO 16:9" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/25" aria-hidden />
      </div>

      {/* ชั้น 2: ภาพสินค้าลอย */}
      <div
        data-depth="0.4"
        className="absolute bottom-[16vh] right-[7vw] hidden w-[24vw] max-w-sm will-change-transform md:block"
      >
        <Placeholder label="ภาพสินค้า HERO 4:5" ratio="4/5" className="shadow-2xl shadow-black/40" />
      </div>

      {/* ชั้น 3: ตัวหนังสือ */}
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
