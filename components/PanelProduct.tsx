'use client';

// สินค้าที่ลอยอยู่บนแผงกำแพงหนึ่งแผง (spec 2026-09-01-products-as-motion §3)
//
// สองชั้นภาพซ้อนกันแบบเดียวกับ ProductStage และด้วยเหตุผลเดียวกัน:
// ตอนสลับชิ้น รูปเก่าต้องค้างอยู่จนรูปใหม่โหลดเสร็จ ไม่งั้นแผงจะว่างหนึ่งจังหวะ
// ซึ่งบนแผงกว้าง 129px อ่านเป็น "ภาพกระพริบ" ไม่ใช่ crossfade
//
// ตัวที่กำลังแสดงถือ data-panel-front ไว้เสมอ — ตัววัดของ AC ข้อ 5 อ่านจากตรงนั้น
// (ถ้าอ่าน img ทุกใบในแผงจะเจอสองใบและแยกไม่ออกว่าใบไหนคือใบที่เห็นจริง)

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { PanelProduct as Item } from './wall-products';

const FADE_S = 0.42;
const LOAD_WATCHDOG_MS = 1200;

type Props = {
  items: Item[];
  /** ชิ้นที่ต้องแสดง — ผู้เรียกเป็นคนเดินเลข จะได้หยุด timer รวมศูนย์ได้ */
  index: number;
  lang: 'th' | 'en';
  className?: string;
};

export default function PanelProduct({ items, index, lang, className = '' }: Props) {
  const len = items.length;
  const cur = len ? items[((index % len) + len) % len] : undefined;

  // รูปที่ค้างไว้ระหว่าง crossfade — null เมื่อไม่ได้กำลังสลับ
  const [back, setBack] = useState<Item | null>(null);
  const shown = useRef<Item | undefined>(cur);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  // ตั้งรูปเก่าไว้เป็นชั้นหลังทันทีที่ index เปลี่ยน แล้วรอรูปใหม่โหลด
  useEffect(() => {
    if (!cur || shown.current?.src === cur.src) return;
    setBack(shown.current ?? null);
    shown.current = cur;
  }, [cur]);

  const runFade = () => {
    if (!back) return;
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const f = frontRef.current;
    const b = backRef.current;
    const done = () => setBack(null);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !f || !b) {
      gsap.set([f, b].filter(Boolean), { opacity: 1 });
      done();
      return;
    }
    gsap.to(b, { opacity: 0, duration: FADE_S, ease: 'power2.inOut' });
    gsap.fromTo(
      f,
      { opacity: 0 },
      { opacity: 1, duration: FADE_S, ease: 'power2.inOut', onComplete: done },
    );
  };

  // watchdog: รูปเสียหรือโหลดไม่ขึ้นต้องไม่ทำให้แผงค้างที่ opacity 0 ตลอดกาล
  useEffect(() => {
    if (!back) return;
    timer.current = window.setTimeout(runFade, LOAD_WATCHDOG_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [back]);

  if (!cur) return null;

  return (
    <span className={`pointer-events-none block ${className}`}>
      {back && (
        <span ref={backRef} className="absolute inset-0 block" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
          <img
            key={back.src}
            src={back.src}
            alt=""
            decoding="async"
            className="h-full w-full object-contain"
          />
        </span>
      )}
      <span
        ref={frontRef}
        className="absolute inset-0 block"
        style={{ opacity: back ? 0 : 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
        <img
          key={cur.src}
          data-panel-front
          // รูปที่อยู่ใน cache อยู่แล้ว (preloader โหลดไปให้ทั้งชุด) อาจ complete
          // ตั้งแต่ก่อน React ผูก onLoad ทัน ถ้ารอแต่ onLoad จะค้างที่ opacity 0
          ref={(el) => {
            if (el?.complete) runFade();
          }}
          src={cur.src}
          alt={`${cur.name[lang]} — ${cur.finishName[lang]}`}
          decoding="async"
          onLoad={runFade}
          onError={runFade}
          className="h-full w-full object-contain"
        />
      </span>
    </span>
  );
}
