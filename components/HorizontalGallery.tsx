'use client';

// แถบสินค้าเด่น: scroll แนวตั้งขับการ์ดให้ไหลแนวนอน (pin + scrub)
// + perspective depth — การ์ดที่ไกลจากกลางจอจะเล็กลง จางลง และเอียงเข้าหากลาง
// มือถือ: เปลี่ยนเป็น scroll แนวนอนแบบ native (snap) เพื่อความลื่นและเบา
//
// ไม่ import type จาก lib/products — ประกาศ GalleryItem เป็นโครงหลวม ๆ
// ที่ Product ทั้งของเดิมและของ generated สวมเข้าได้แบบ structural
// ไม่มีราคาในการ์ด (สเปก §1 non-goals) — ช่องขวาใช้ `meta` เท่าที่ส่งมา

import { useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLang } from './LangProvider';

// ScrollTrigger ที่ pin จะย้าย element ของเราไปอยู่ใต้ .pin-spacer ที่มันสร้างเอง
// React ไม่รู้เรื่องนี้ พอ unmount จะสั่ง removeChild จาก parent เดิม → NotFoundError
// แล้วหน้าถัดไปพังทั้งหน้า cleanup ต้องรันใน layout phase (ก่อน React ลบ DOM)
// ไม่ใช่ passive phase ของ useEffect
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type GalleryItem = {
  slug: string;
  category: 'kitchen' | 'bath';
  name: { th: string; en: string };
  /** path รูปสินค้าพื้นโปร่ง — task E ส่งของจริงเข้ามา */
  image?: string;
  /** ข้อความมุมขวาของการ์ด เช่น จำนวนเฉดผิวเคลือบ */
  meta?: { th: string; en: string } | string;
};

type Props = { items: GalleryItem[] };

export default function HorizontalGallery({ items }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const rootEl = root.current;
    const trackEl = track.current;
    if (!rootEl || !trackEl) return;

    const mm = gsap.matchMedia(rootEl);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const cards = Array.from(trackEl.querySelectorAll<HTMLElement>('[data-gcard]'));
      const amount = () => trackEl.scrollWidth - window.innerWidth;

      const updateDepth = () => {
        const mid = window.innerWidth / 2;
        cards.forEach((card) => {
          const r = card.getBoundingClientRect();
          const center = r.left + r.width / 2;
          const d = Math.min(Math.abs(center - mid) / mid, 1);
          gsap.set(card, {
            scale: 1 - d * 0.12,
            opacity: 1 - d * 0.45,
            rotationY: (center < mid ? 1 : -1) * d * 7,
          });
        });
      };

      gsap.to(trackEl, {
        x: () => -amount(),
        ease: 'none',
        scrollTrigger: {
          trigger: rootEl,
          start: 'top top',
          end: () => `+=${amount()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: updateDepth,
          onRefresh: updateDepth,
        },
      });
      updateDepth();
    });

    return () => mm.revert();
  }, [items.length]);

  const Card = ({ p, className = '' }: { p: GalleryItem; className?: string }) => {
    const meta = typeof p.meta === 'string' ? p.meta : p.meta?.[lang];
    return (
      <Link
        href={`/products/${p.slug}/`}
        data-gcard
        className={`group block shrink-0 will-change-transform ${className}`}
      >
        <div className="overflow-hidden border border-line-6 bg-surface">
          <div className="transition-transform duration-700 ease-out group-hover:scale-105">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper
              <img src={p.image} alt="" className="aspect-[4/5] w-full object-contain" />
            ) : (
              <div className="aspect-[4/5] w-full" aria-hidden />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="micro">{t.common.category[p.category]}</p>
            <h3 className="mt-1 text-base font-light tracking-wide text-cream">{p.name[lang]}</h3>
          </div>
          {meta ? <span className="whitespace-nowrap text-[11px] text-dim">{meta}</span> : null}
        </div>
      </Link>
    );
  };

  return (
    <section aria-label={t.home.featuredTitle} className="bg-base text-cream">
      {/* ── เดสก์ท็อป: pinned horizontal ── */}
      <div ref={root} className="hidden md:block">
        <div className="flex h-screen flex-col justify-center overflow-hidden">
          <div className="px-[8vw] pb-10">
            <p className="micro mb-3">{t.home.featuredKicker}</p>
            <div className="flex items-end justify-between">
              <h2 className="font-display text-3xl font-extralight tracking-wide lg:text-4xl">
                {t.home.featuredTitle}
              </h2>
              <p className="micro">{t.home.featuredHint}</p>
            </div>
          </div>
          <div style={{ perspective: '1200px' }}>
            <div ref={track} className="flex w-max gap-[3.5vw] px-[8vw] will-change-transform">
              {items.map((p) => (
                <Card key={p.slug} p={p} className="w-[24vw] min-w-[280px] max-w-sm" />
              ))}
              {/* การ์ดปิดท้าย: ดูสินค้าทั้งหมด */}
              <Link
                href="/products/"
                data-gcard
                className="flex w-[24vw] min-w-[280px] max-w-sm shrink-0 items-center justify-center border border-line-12 text-center will-change-transform hover:border-accent"
                style={{ aspectRatio: '4 / 5' }}
              >
                <span className="micro underline-offset-8 hover:underline">{t.common.viewAll} →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── มือถือ: native horizontal snap ── */}
      <div className="py-16 md:hidden">
        <div className="mb-8 px-6">
          <p className="micro mb-2">{t.home.featuredKicker}</p>
          <h2 className="font-display text-2xl font-extralight tracking-wide">{t.home.featuredTitle}</h2>
        </div>
        <div className="snap-gallery flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4">
          {items.map((p) => (
            <div key={p.slug} className="w-64 shrink-0 snap-start">
              <Card p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
