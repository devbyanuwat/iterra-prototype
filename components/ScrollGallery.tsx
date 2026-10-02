'use client';

// แกลเลอรีภาพจากแคตตาล็อก: pin แล้วเผยภาพทีละภาพด้วย clip-path + scale 1.15 → 1 (scrub บน Lenis)
// มือถือ / reduced-motion: เรียงภาพลงมาธรรมดา ไม่ pin
// key ใช้ src (ไม่ใช่ข้อความแปล) — ดู PinnedStory เรื่อง GSAP inline style หายตอน remount
// refreshPriority 1: section นี้อยู่บนสุดในบรรดา pin ของหน้าแรก ต้องวัดก่อน pin ด้านล่าง

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { useScope } from '@/lib/scope';
import { galleryFor, type GalleryItem } from '@/lib/gallery';

function Frame({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  const small = item.group === 'flooring';
  return (
    <div data-frame className="absolute inset-0 overflow-hidden bg-ink">
      {small ? (
        <div className="flex h-full items-center justify-center">
          <img data-img src={item.src} alt={item.caption[lang]} className="w-[40vw] max-w-md shadow-2xl shadow-black/50" />
        </div>
      ) : (
        <img data-img src={item.src} alt={item.caption[lang]} className="h-full w-full object-cover will-change-transform" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden />
      <p data-cap className="absolute bottom-12 left-[8vw] text-sm font-light tracking-wide text-paper/85">
        {item.caption[lang]}
      </p>
    </div>
  );
}

export default function ScrollGallery() {
  const root = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();
  const scope = useScope();
  const items = galleryFor(scope);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const frames = gsap.utils.toArray<HTMLElement>('[data-frame]', el);
      const imgs = frames.map((f) => f.querySelector<HTMLElement>('[data-img]')!);
      const caps = frames.map((f) => f.querySelector<HTMLElement>('[data-cap]')!);

      gsap.set(frames.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(imgs.slice(1), { scale: 1.15 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${(frames.length - 1) * window.innerHeight}`,
          pin: true,
          scrub: 1,
          refreshPriority: 1,
          invalidateOnRefresh: true,
        },
      });
      for (let i = 1; i < frames.length; i++) {
        tl.to(frames[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i - 1)
          .to(imgs[i], { scale: 1, duration: 1 }, i - 1)
          .to(imgs[i - 1], { scale: 1.06, duration: 1 }, i - 1)
          .to(caps[i - 1], { opacity: 0, y: -30, duration: 0.5 }, i - 1)
          .fromTo(caps[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, i - 0.5);
      }
    });
    // ?scope= เปลี่ยนจำนวนภาพหลัง mount → pin นี้ถูกสร้างใหม่ทีหลัง pin ด้านล่าง
    // สั่ง refresh ทั้งหน้า (เรียงตาม refreshPriority) ให้ start ของ pin ล่างนับ pin-spacing ใหม่
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [items.length]);

  return (
    <section className="bg-ink text-paper">
      <div className="px-6 pb-12 pt-24 md:px-[8vw] md:pt-32">
        <Reveal>
          <p className="mb-3 text-[11px] uppercase tracking-widest2 text-paper/50">{t.home.galleryKicker}</p>
          <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.home.galleryTitle}</h2>
        </Reveal>
      </div>
      {/* เดสก์ท็อป: pinned (reduced-motion → ซ่อน แล้วใช้รายการเรียงลงมาด้านล่างแทน) */}
      <div ref={root} className="relative hidden h-screen md:motion-safe:block">
        {items.map((item) => (
          <Frame key={item.src} item={item} lang={lang} />
        ))}
      </div>
      {/* มือถือ + reduced-motion: เรียงลงมา */}
      <div className="space-y-6 px-6 pb-20 md:mx-auto md:max-w-3xl md:motion-safe:hidden">
        {items.map((item) => (
          // ภาพ flooring ต้นฉบับ 375px — จำกัดความกว้างไว้ ไม่ขยายเต็มจอ
          <Reveal key={item.src} className={item.group === 'flooring' ? 'mx-auto max-w-[375px]' : undefined}>
            <img
              src={item.src}
              width={item.w}
              height={item.h}
              alt={item.caption[lang]}
              loading="lazy"
              className="h-auto w-full"
            />
            <p className="mt-3 text-[12px] font-light text-paper/70">{item.caption[lang]}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
