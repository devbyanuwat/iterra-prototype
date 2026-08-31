'use client';

// Hero AD-1 "โชว์รูมตอนดึก": สินค้าเป็นวัตถุลอยในห้องมืด spotlight รับสี --accent
//
// เดสก์ท็อป: pin + scrub — สินค้า scale ขึ้นและลอยขึ้น · พาดหัวยืดออกด้านข้าง
// ด้วย scaleX 1 → 1.16 · spotlight หรี่ลง
// มือถือ / reduced-motion: ไม่ pin ไม่ parallax — เห็นเนื้อหาครบนิ่ง ๆ
//
// ข้อมูลทุกอย่างรับเป็น prop และมีค่า default จาก i18n เพื่อให้ HomeContent
// ที่เรียก <Hero /> เปล่า ๆ ยัง compile ได้ · task E จะส่งรูปสินค้าจริงเข้ามา

import { useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitReveal from './SplitReveal';
import { useLang } from './LangProvider';

type Props = {
  /** path รูปสินค้าพื้นโปร่ง — task E ส่งของจริงเข้ามา */
  image?: string;
  imageAlt?: string;
  kicker?: string;
  title?: string;
  sub?: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** ล็อกสี accent ของ section นี้ (ปกติปล่อยให้ FinishProvider คุม --accent) */
  accent?: string;
};

// ScrollTrigger ที่ pin จะย้าย element ของเราไปอยู่ใต้ .pin-spacer ที่มันสร้างเอง
// React ไม่รู้เรื่องนี้ พอ unmount จะสั่ง removeChild จาก parent เดิม → NotFoundError
// แล้วหน้าถัดไปพังทั้งหน้า cleanup ต้องรันใน layout phase (ก่อน React ลบ DOM)
// ไม่ใช่ passive phase ของ useEffect
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const HEAD_SCALE_TO = 1.16;

export default function Hero({
  image,
  imageAlt = '',
  kicker,
  title,
  sub,
  ctaHref = '/products/',
  ctaLabel,
  accent,
}: Props) {
  const root = useRef<HTMLElement>(null);
  const { t } = useLang();

  const heroKicker = kicker ?? t.home.heroKicker;
  const heroTitle = title ?? t.home.heroTitle;
  const heroSub = sub ?? t.home.heroSub;
  const heroCta = ctaLabel ?? t.common.explore;

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);

    // intro: kicker / sub / ปุ่ม fade ขึ้น (พาดหัวเป็นหน้าที่ของ SplitReveal)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(el.querySelectorAll('[data-hero-fade]'), {
        opacity: 0,
        y: 28,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.1,
        delay: 0.35,
      });
    });

    // pin + scrub: เดสก์ท็อปเท่านั้น
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=110%',
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      const product = el.querySelector<HTMLElement>('[data-hero-product]');
      const spot = el.querySelector<HTMLElement>('[data-hero-spot]');
      const heading = el.querySelector<HTMLElement>('[data-hero-title]');
      const hint = el.querySelector<HTMLElement>('[data-hero-hint]');

      if (product) tl.to(product, { scale: 1.22, yPercent: -14 }, 0);
      if (spot) tl.to(spot, { opacity: 0.18, scale: 1.35 }, 0);
      // พาดหัวยืดออกด้านข้างตาม progress (สเปก §5)
      // DM Sans ไม่มีแกน wdth เหมือน Archivo เดิม จึงยืดด้วย scaleX แทน
      // ได้ผลตรงตามเจตนาเดิม (พาดหัวล้นเฟรม) และเป็น transform ล้วน
      // ไม่เกิด reflow ต่างจากการ animate font-variation-settings
      // origin ซ้ายเพื่อให้ยืดไปทางขอบขวา ไม่ใช่บานออกสองข้าง
      if (heading) tl.fromTo(heading, { scaleX: 1 }, { scaleX: HEAD_SCALE_TO }, 0);
      if (hint) tl.to(hint, { opacity: 0, duration: 0.25 }, 0);
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex h-[100svh] min-h-[560px] flex-col justify-end overflow-hidden bg-base text-cream"
      style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}
    >
      {/* spotlight: แสงในห้องมืด รับสีจาก --accent */}
      <div
        data-hero-spot
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[110vmax] w-[110vmax] -translate-x-1/2 -translate-y-1/2 will-change-transform"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%)',
        }}
      />

      {/* สินค้า: วัตถุลอยกลางห้อง */}
      <div
        data-hero-product
        className="pointer-events-none absolute left-1/2 top-1/2 h-[62vh] w-[70vw] max-w-[520px] -translate-x-1/2 -translate-y-[54%] will-change-transform md:w-[34vw]"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export + รูปพื้นโปร่งจาก scraper, ไม่ต้องผ่าน optimizer
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.65)]"
          />
        ) : (
          <div className="h-full w-full rounded-sm border border-line-12 bg-surface/40" aria-hidden />
        )}
      </div>

      {/* ตัวหนังสือ */}
      <div className="relative z-10 px-6 pb-24 md:px-[8vw] md:pb-28">
        <p data-hero-fade className="micro mb-5">
          {heroKicker}
        </p>

        <SplitReveal
          as="h1"
          trigger="mount"
          mask={false}
          data-hero-title
          className="mb-6 max-w-[16ch] origin-left whitespace-pre-line font-display text-[13vw] font-extralight leading-[0.92] text-cream will-change-transform md:text-[7.5vw]"
        >
          {heroTitle}
        </SplitReveal>

        <p
          data-hero-fade
          className="mb-10 max-w-xl text-sm font-light leading-relaxed text-dim md:text-base"
        >
          {heroSub}
        </p>

        <div data-hero-fade>
          <Link
            href={ctaHref}
            className="inline-block border border-line-12 px-9 py-3.5 text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">{heroCta}</span>
          </Link>
        </div>
      </div>

      <div
        data-hero-hint
        className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <span className="micro">{t.common.scroll}</span>
          <span className="block h-8 w-px bg-line-12" />
        </div>
      </div>
    </section>
  );
}
