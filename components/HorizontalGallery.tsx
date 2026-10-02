'use client';

// แถบสินค้าเด่น: scroll แนวตั้งขับการ์ดให้ไหลแนวนอน (pin + scrub)
// + perspective depth — การ์ดที่ไกลจากกลางจอจะเล็กลง จางลง และเอียงเข้าหากลาง
// มือถือ / reduced-motion: เปลี่ยนเป็น scroll แนวนอนแบบ native (snap) เพื่อความลื่นและเบา

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Placeholder from './Placeholder';
import { useLang } from './LangProvider';
import type { Product } from '@/lib/products';

export default function HorizontalGallery({ items }: { items: Product[] }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const rootEl = root.current;
    const trackEl = track.current;
    if (!rootEl || !trackEl) return;

    const mm = gsap.matchMedia(rootEl);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const cards = Array.from(trackEl.querySelectorAll<HTMLElement>('[data-gcard]'));
      const amount = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);

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

  const Card = ({ p, className = '' }: { p: Product; className?: string }) => (
    <Link
      href={`/products/${p.slug}/`}
      data-gcard
      className={`group block shrink-0 will-change-transform ${className}`}
    >
      <div className="overflow-hidden">
        <div className="transition-transform duration-700 ease-out group-hover:scale-105">
          <Placeholder label={p.images[0]} ratio="4/5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest2 text-warm-500">
            {t.common.category[p.category]}
          </p>
          <h3 className="mt-1 text-base font-light tracking-wide">{p.name[lang]}</h3>
        </div>
        <span className="whitespace-nowrap text-[11px] text-warm-500">{p.price[lang]}</span>
      </div>
    </Link>
  );

  return (
    <section aria-label={t.home.featuredTitle}>
      {/* ── เดสก์ท็อป: pinned horizontal ── */}
      <div ref={root} className="hidden md:motion-safe:block">
        <div className="flex h-screen flex-col justify-center overflow-hidden">
          <div className="px-[8vw] pb-10">
            <p className="mb-3 text-[11px] uppercase tracking-widest2 text-warm-500">
              {t.home.featuredKicker}
            </p>
            <div className="flex items-end justify-between">
              <h2 className="text-3xl font-extralight tracking-wide lg:text-4xl">{t.home.featuredTitle}</h2>
              <p className="text-[11px] uppercase tracking-widest2 text-warm-400">{t.home.featuredHint}</p>
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
                className="flex w-[24vw] min-w-[280px] max-w-sm shrink-0 items-center justify-center border border-warm-300 text-center will-change-transform"
                style={{ aspectRatio: '4 / 5' }}
              >
                <span className="text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline">
                  {t.common.viewAll} →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── มือถือ: native horizontal snap ── */}
      <div className="py-16 md:motion-safe:hidden">
        <div className="mb-8 px-6">
          <p className="mb-2 text-[11px] uppercase tracking-widest2 text-warm-500">{t.home.featuredKicker}</p>
          <h2 className="text-2xl font-extralight tracking-wide">{t.home.featuredTitle}</h2>
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
