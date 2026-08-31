'use client';

// พาดหัวเผยทีละบรรทัดด้วย GSAP SplitText (ฟรีตั้งแต่ 3.13)
//
// ค่าเริ่มต้นคือ split แบบ 'lines' ไม่ใช่ 'words' — ภาษาไทยไม่มีช่องว่างระหว่างคำ
// การ split เป็นคำจะได้ก้อนเดียวทั้งบรรทัดหรือแตกสระ/วรรณยุกต์ออกจากพยัญชนะ
//
// กติกา:
// - ไม่ซ่อนข้อความใน markup — ซ่อนด้วย JS เท่านั้น ถ้า JS ไม่รันหรือ reduced-motion
//   ข้อความต้องอ่านได้ครบ
// - revert() ทุกครั้งตอน unmount ไม่งั้น DOM เหลือ <div> ครอบบรรทัดค้างไว้
//   แล้วข้อความไทยจะเสียการตัดบรรทัด
// - autoSplit: true ให้ split ใหม่เมื่อฟอนต์โหลดเสร็จหรือจอเปลี่ยนขนาด
//   (ฟอนต์โหลดทีหลัง → บรรทัดขยับ)
//
// ทำไมต้อง dangerouslySetInnerHTML แทนการส่ง children ตรง ๆ:
// SplitText เอา text node ที่ React เป็นเจ้าของออกแล้วใส่ <div> บรรทัดแทน
// พอเปลี่ยน route React จะสั่ง removeChild กับ text node ที่หายไปแล้ว
// → NotFoundError ตอน commit แล้วหน้าถัดไปพังทั้งหน้า ("This page couldn't load")
// วิธีแก้คือไม่ให้ React มี child fiber อยู่ข้างในเลย React จะลบเฉพาะตัว element
// ซึ่งยังอยู่ใน DOM จริง · cleanup ยังเรียก revert() ไว้คืน DOM ตามปกติ

import { createElement, useEffect, useLayoutEffect, useRef } from 'react';
import type { ElementType, HTMLAttributes } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// cleanup ของ SplitText ต้องรันก่อน React ลบ DOM เช่นเดียวกับ ScrollTrigger pin
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Props = {
  /** ข้อความล้วนเท่านั้น — ดูเหตุผลเรื่อง innerHTML ด้านบน */
  children: string;
  /** แท็กที่จะ render จริง — h1/h2/p ... */
  as?: ElementType;
  /** 'lines' คือค่าเริ่มต้นและเป็นค่าที่ปลอดภัยกับภาษาไทย */
  type?: 'lines' | 'words';
  /** เผยตอน scroll ถึง หรือเผยทันทีที่ mount (ใช้กับ hero หลัง preloader) */
  trigger?: 'scroll' | 'mount';
  /** ครอบแต่ละบรรทัดด้วย overflow:hidden ให้บรรทัดเลื่อนขึ้นจากใต้เส้น
   *  ปิดเมื่อ element นั้นจะถูก scaleX ทีหลัง ไม่งั้นโดน clip ด้านข้าง */
  mask?: boolean;
  stagger?: number;
  duration?: number;
  delay?: number;
  /** ระยะเลื่อนขึ้นของแต่ละบรรทัด */
  y?: number | string;
  /** ค่า start ของ ScrollTrigger */
  start?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    // ให้ผู้เรียกแปะ data-* เป็นจุดเกาะให้ GSAP ได้ (Hero ใช้ data-hero-title)
    [key: `data-${string}`]: string | number | boolean | undefined;
  };

export default function SplitReveal({
  children,
  as = 'h2',
  type = 'lines',
  trigger = 'scroll',
  mask = true,
  stagger = 0.09,
  duration = 0.9,
  delay = 0,
  y = '110%',
  start = 'top 82%',
  ...rest
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    // reduced-motion: ไม่ split ไม่ animate — ปล่อยข้อความไว้อย่างที่ server ส่งมา
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      let split: SplitText | null = null;

      // onSplit ถูกเรียกใหม่ทุกครั้งที่ autoSplit re-split (ฟอนต์โหลด / resize)
      // ต้อง return tween กลับไป GSAP จะได้ kill ตัวเก่าให้เอง
      split = SplitText.create(el, {
        type,
        // mask ใช้ชนิดเดียวกับ type เสมอ
        mask: mask ? type : undefined,
        // aria:'auto' ใส่ aria-label ข้อความเต็มไว้ที่ตัวแม่ และ aria-hidden ที่ชิ้นที่ถูกหั่น
        // สำคัญกับไทย เพราะ screen reader ไม่ควรอ่านทีละบรรทัดที่ถูกหั่น
        aria: 'auto',
        autoSplit: true,
        onSplit(self) {
          const parts = type === 'lines' ? self.lines : self.words;
          if (!parts.length) return;
          return gsap.from(parts, {
            yPercent: typeof y === 'string' ? parseFloat(y) : undefined,
            y: typeof y === 'number' ? y : undefined,
            opacity: mask ? 1 : 0,
            duration,
            delay,
            ease: 'power3.out',
            stagger,
            scrollTrigger:
              trigger === 'scroll'
                ? { trigger: el, start, once: true }
                : undefined,
          });
        },
      });

      return () => {
        // คืน DOM กลับเป็นข้อความเดิม — ห้ามปล่อยให้ไทยค้างเป็นบรรทัดที่ถูกหั่น
        split?.revert();
        split = null;
      };
    });

    return () => mm.revert();
  }, [type, trigger, mask, stagger, duration, delay, y, start, children]);

  return createElement(as, {
    ...rest,
    ref,
    dangerouslySetInnerHTML: { __html: escapeHtml(children) },
  });
}
