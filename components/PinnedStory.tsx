'use client';

// Section "เรื่องราวแบรนด์" — pinned + scrub
// เดสก์ท็อป: ตรึงจอไว้ แล้วให้ภาพ/ข้อความ 3 ชุดสลับตาม scroll progress
// มือถือ / reduced-motion: แสดงเป็น 3 บล็อกซ้อนกันตามปกติ (markup แยกชุด)
//
// key ของสไลด์ต้องเป็นลำดับ ห้ามใช้ข้อความที่แปลแล้ว
// GSAP เก็บสถานะ opacity ไว้เป็น inline style บน element พวกนี้
// ถ้า key เปลี่ยนตามภาษา React จะสร้าง element ใหม่ที่ไม่มี style นั้น
// แล้วทั้ง 3 สไลด์จะโผล่ทับกันหมด (เคสจริง: สลับ TH เป็น EN)

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Placeholder from './Placeholder';
import { useLang } from './LangProvider';

const IMAGE_LABELS = ['เรื่องราว ภาพ 01 (โชว์รูม)', 'เรื่องราว ภาพ 02 (สัมผัสจริง)', 'เรื่องราว ภาพ 03 (ทีมติดตั้ง)'];

export default function PinnedStory() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useLang();
  const slides = t.home.storySlides;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      const imgs = el.querySelectorAll<HTMLElement>('[data-story-img]');
      const texts = el.querySelectorAll<HTMLElement>('[data-story-text]');
      const bar = el.querySelector<HTMLElement>('[data-story-bar]');

      gsap.set([...imgs, ...texts], { opacity: 0, y: 0 });
      gsap.set([imgs[0], texts[0]], { opacity: 1 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 0.6,
        },
      });

      for (let i = 1; i < slides.length; i++) {
        tl.to(imgs[i - 1], { opacity: 0, duration: 0.35 }, `step${i}`)
          .to(texts[i - 1], { opacity: 0, y: -24, duration: 0.35 }, `step${i}`)
          .fromTo(imgs[i], { opacity: 0 }, { opacity: 1, duration: 0.35 }, `step${i}+=0.18`)
          .fromTo(texts[i], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35 }, `step${i}+=0.18`)
          .to({}, { duration: 0.5 }); // ช่วงพักให้แต่ละสไลด์ค้างจอ
      }
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top',
            scrollTrigger: { trigger: el, start: 'top top', end: '+=220%', scrub: true },
          },
        );
      }
    });

    return () => mm.revert();
  }, [slides.length]);

  return (
    <section className="bg-ink text-paper">
      {/* ── เดสก์ท็อป: pinned ── */}
      <div ref={root} className="relative hidden md:motion-safe:block">
        <div className="flex h-screen items-stretch overflow-hidden">
          <div className="relative w-1/2">
            {IMAGE_LABELS.map((label, i) => (
              <div key={label} data-story-img className="absolute inset-0">
                <Placeholder fill dark label={label} />
              </div>
            ))}
          </div>
          <div className="relative flex w-1/2 items-center px-[6vw]">
            <span
              data-story-bar
              className="absolute left-0 top-[20%] h-[60%] w-px bg-paper/25 will-change-transform"
              aria-hidden
            />
            <div className="relative h-48 w-full">
              {slides.map((s, i) => (
                <div key={i} data-story-text className="absolute inset-0">
                  <p className="mb-4 text-[11px] uppercase tracking-widest2 text-paper/50">
                    {t.home.storyKicker} — 0{i + 1}
                  </p>
                  <h2 className="mb-5 text-3xl font-extralight tracking-wide lg:text-4xl">{s.title}</h2>
                  <p className="max-w-md text-sm font-light leading-relaxed text-paper/70">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── มือถือ: บล็อกซ้อนธรรมดา ── */}
      <div className="space-y-14 px-6 py-20 md:mx-auto md:max-w-3xl md:motion-safe:hidden">
        {slides.map((s, i) => (
          <div key={i}>
            <Placeholder label={IMAGE_LABELS[i]} ratio="3/2" dark className="mb-6" />
            <p className="mb-2 text-[11px] uppercase tracking-widest2 text-paper/50">
              {t.home.storyKicker} — 0{i + 1}
            </p>
            <h2 className="mb-3 text-2xl font-extralight tracking-wide">{s.title}</h2>
            <p className="text-sm font-light leading-relaxed text-paper/70">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
