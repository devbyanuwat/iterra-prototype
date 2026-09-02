'use client';

// Section"เรื่องราวแบรนด์" — pinned + scrub
// เดสก์ท็อป: ตรึงจอไว้ แล้วให้ภาพ/ข้อความ 3 ชุดสลับตาม scroll progress
// มือถือ / reduced-motion: แสดงเป็นบล็อกซ้อนกันตามปกติ (markup แยกชุด)
//
// รูปรับเป็น prop `images` — ยังไม่มีของจริงตอนนี้ ถ้าไม่ส่งมาจะ render
// กรอบ surface เปล่าตาม token ไม่ผูกกับ lib/products

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitReveal from './SplitReveal';
import { useLang } from './LangProvider';

// ScrollTrigger ที่ pin จะย้าย element ของเราไปอยู่ใต้ .pin-spacer ที่มันสร้างเอง
// React ไม่รู้เรื่องนี้ พอ unmount จะสั่ง removeChild จาก parent เดิม → NotFoundError
// แล้วหน้าถัดไปพังทั้งหน้า cleanup ต้องรันใน layout phase (ก่อน React ลบ DOM)
// ไม่ใช่ passive phase ของ useEffect
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type StorySlide = { title: string; body: string };

type Props = {
 slides?: StorySlide[];
 kicker?: string;
 /** path รูปเรียงตาม slide — ช่องที่ว่างจะเป็นกรอบเปล่า */
 images?: (string | undefined)[];
};

function Frame({ src, className = '' }: { src?: string; className?: string }) {
 if (!src) {
 return <div className={`border border-line-12 bg-surface ${className}`} aria-hidden />;
 }
 return (
 // eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper
 <img src={src} alt="" className={`object-cover ${className}`} />
 );
}

export default function PinnedStory({ slides, kicker, images = [] }: Props) {
 const root = useRef<HTMLDivElement>(null);
 const { t } = useLang();

 const items = slides ?? t.home.storySlides;
 const storyKicker = kicker ?? t.home.storyKicker;

 // ลายเซ็นของเนื้อหา ไม่ใช่ตัว array — ผู้เรียกที่ส่ง slides เป็น literal inline
 // จะได้ reference ใหม่ทุก render ถ้า dep เป็น [items] เอฟเฟกต์จะสร้าง
 // ScrollTrigger ใหม่ทุกครั้ง
 const signature = items.map((s) => s.title).join('|');

 useIsoLayoutEffect(() => {
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

 for (let i = 1; i < items.length; i++) {
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
 // ต้องผูกกับตัว items จริง ไม่ใช่แค่ความยาว: สลับ TH/EN แล้วจำนวนสไลด์เท่าเดิม (3)
 // แต่เนื้อหาเปลี่ยนทั้งชุด ถ้า dep เป็น items.length เอฟเฟกต์จะไม่รันใหม่
 // timeline เดิมจะถือ node ที่ถูกถอดไปแล้ว แล้ว section ค้าง pin อยู่ 220%
 // โดยที่ข้อความสามชุดซ้อนทับกันอ่านไม่ออก (แก้ได้ด้วยการรีโหลดอย่างเดียว)
 }, [signature]);

 return (
 <section className="bg-base text-ink">
 {/* ── เดสก์ท็อป: pinned ── */}
 <div ref={root} className="relative hidden md:block">
 <div className="flex h-screen items-stretch overflow-hidden">
 <div className="relative w-1/2">
 {items.map((_s, i) => (
 <div key={i} data-story-img className="absolute inset-0">
 <Frame src={images[i]} className="h-full w-full" />
 </div>
 ))}
 </div>
 <div className="relative flex w-1/2 items-center px-[6vw]">
 <span
 data-story-bar
 className="absolute left-0 top-[20%] h-[60%] w-px bg-line-12 will-change-transform"
 aria-hidden
 />
 <div className="relative h-48 w-full">
 {items.map((s, i) => (
 <div key={i} data-story-text className="absolute inset-0">
 <p className="micro mb-4">
 {storyKicker} — 0{i + 1}
 </p>
 <h2 className="mb-5 font-display text-section font-normal tracking-wide text-section">
 {s.title}
 </h2>
 <p className="max-w-md text-body-sm font-normal leading-relaxed text-dim">{s.body}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* ── มือถือ: บล็อกซ้อนธรรมดา ── */}
 <div className="space-y-14 px-6 py-20 md:hidden">
 {items.map((s, i) => (
 <div key={i}>
 <Frame src={images[i]} className="mb-6 aspect-[3/2] w-full" />
 <p className="micro mb-2">
 {storyKicker} — 0{i + 1}
 </p>
 <SplitReveal as="h2" className="mb-3 font-display text-2xl font-normal tracking-wide">
 {s.title}
 </SplitReveal>
 <p className="text-body-sm font-normal leading-relaxed text-dim">{s.body}</p>
 </div>
 ))}
 </div>
 </section>
 );
}
