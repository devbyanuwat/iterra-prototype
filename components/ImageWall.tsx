'use client';

// หน้าแรก: ผนังภาพจากแคตตาล็อก แต่ละคอลัมน์เลื่อนด้วยความเร็วไม่เท่ากันตาม scroll (ไม่มี pin)
// เดสก์ท็อป 3 คอลัมน์: ซ้ายช้า กลางเร็ว ขวากลาง · มือถือ 1 คอลัมน์ภาพนิ่ง · reduced-motion = grid นิ่ง

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLang } from './LangProvider';
import { GALLERY, type GalleryItem } from '@/lib/gallery';

// ระยะเลื่อนต่อคอลัมน์ (px ต่อความสูงจอ 1000px) เดินจาก +d ไป -d จึงตรงกันพอดีตอนกลาง section
const TRAVEL = [60, 180, 110];

// แจกภาพวนเข้าแต่ละคอลัมน์: ภาพที่ i ไปคอลัมน์ i % n
const split = (items: GalleryItem[], n: number) =>
  Array.from({ length: n }, (_, c) => items.filter((_, i) => i % n === c));

function Tile({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  return (
    <figure>
      <img src={item.src} width={item.w} height={item.h} alt="" loading="lazy" className="h-auto w-full" />
      <figcaption className="mt-3 text-[12px] font-light text-paper/70">{item.caption[lang]}</figcaption>
    </figure>
  );
}

export default function ImageWall() {
  const root = useRef<HTMLElement>(null);
  const { lang, t } = useLang();
  const items = GALLERY;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      // เหตุผล: ความลึก คอลัมน์ที่เลื่อนเร็วกว่าดูใกล้กว่า เหมือนคลิปอ้างอิงที่เจ้าของส่งมา
      gsap.utils.toArray<HTMLElement>('[data-col]', el).forEach((col, i) => {
        const d = () => (TRAVEL[i] * window.innerHeight) / 1000;
        gsap.fromTo(
          col,
          { y: d },
          {
            y: () => -d(),
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
          },
        );
      });
    });
    return () => mm.revert();
  }, []);

  return (
    // overflow-hidden: คอลัมน์ที่เลื่อนเกินขอบจะไม่ทับ section ถัดไป
    <section ref={root} className="overflow-hidden bg-ink text-paper">
      <div className="px-6 pb-12 pt-24 md:px-[8vw] md:pb-16 md:pt-32">
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.galleryTitle}</h2>
      </div>
      {/* เดสก์ท็อป: 3 คอลัมน์ parallax */}
      <div className="hidden grid-cols-3 items-start gap-8 px-[8vw] pb-40 md:grid">
        {split(items, 3).map((col, c) => (
          <div key={c} data-col className="space-y-8">
            {col.map((item) => (
              <Tile key={item.src} item={item} lang={lang} />
            ))}
          </div>
        ))}
      </div>
      {/* มือถือ: คอลัมน์เดียว ภาพนิ่ง */}
      <div className="space-y-8 px-6 pb-20 md:hidden">
        {items.map((item) => (
          <Tile key={item.src} item={item} lang={lang} />
        ))}
      </div>
    </section>
  );
}
