'use client';

// ภาพ parallax ในเนื้อหา: ภาพขยับสวนทิศกับ scroll เล็กน้อย
// เดสก์ท็อปเท่านั้น (มือถือ = ภาพนิ่ง ประหยัดแรงเครื่อง) + เคารพ reduced-motion
//
// เดิมรับ `label` แล้ววาดกล่องจำลองสีเทา — component ตัวนั้นถูกลบไปแล้ว (สเปก §4)
// ตอนนี้รับ `src` จริง ถ้าไม่ส่งมา (ภาพบทความ/ภาพโปรยที่ยังไม่มีของจริง)
// จะได้กรอบ surface ตาม token แทน ไม่ใช่กล่องเทาที่หลุดธีม

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Ratio = '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';

type Props = {
  /** path รูปจริง — ไม่ส่ง = กรอบเปล่าตาม token */
  src?: string;
  alt?: string;
  ratio?: Ratio;
  speed?: number; // yPercent สุทธิ; ค่าลบ = เลื่อนสวนทาง
  sizes?: string;
  className?: string;
};

export default function ParallaxImage({
  src,
  alt = '',
  ratio = '3/2',
  speed = -8,
  sizes = '(max-width: 768px) 100vw, 50vw',
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = ref.current;
    if (!el) return;
    const img = el.firstElementChild as HTMLElement | null;
    if (!img) return;

    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      gsap.fromTo(
        img,
        { yPercent: -speed },
        {
          yPercent: speed,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });

    return () => mm.revert();
  }, [speed]);

  return (
    <div
      ref={ref}
      className={`overflow-hidden border border-line-6 bg-surface ${className}`}
      style={{ aspectRatio: ratio.replace('/', ' / ') }}
    >
      <div className="h-full w-full scale-[1.18] will-change-transform">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, รูป local
          <img src={src} alt={alt} sizes={sizes} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" aria-hidden />
        )}
      </div>
    </div>
  );
}
