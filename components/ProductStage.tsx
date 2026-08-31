'use client';

// เวทีสินค้า: รูปสินค้าพื้นโปร่งลอยในห้องมืด + crossfade ตอนเปลี่ยนผิวเคลือบ
//
// สเปก §5: crossfade 420ms power2.inOut พร้อมกับ tween --accent (FinishProvider เป็นคนทำ)
//
// สองเรื่องที่ทำให้ไม่กระพริบ:
// 1. รูปเก่ายังอยู่ใน DOM ตลอดช่วงเปลี่ยน — ไม่มีจังหวะที่เวทีว่าง
// 2. เริ่ม fade ต่อเมื่อรูปใหม่โหลดเสร็จจริง (onLoad ของ next/image ซึ่งยิงให้ด้วย
//    แม้รูปจะอยู่ใน cache แล้ว) ถ้า fade ทันทีตอน cache เย็น จะเห็นช่องว่าง
//    มี watchdog กันรูปเสีย/โหลดไม่ขึ้น ไม่ให้เวทีค้างที่ opacity 0
//
// เรื่องขนาดรูป — ทำไมถึงไม่ใช้ next/image ตรงนี้:
// next.config ตั้ง `images: { unoptimized: true }` (static export) และใน
// next/dist/shared/lib/get-img-props.js บรรทัด ~284 เขียนไว้ว่า
//   if (config.unoptimized) { unoptimized = true }
// คือ config ทับ prop เสมอ ส่ง unoptimized={false} รายรูปก็ไม่ช่วย
// ผลคือ next/image ตัด srcset และ sizes ทิ้งทั้งคู่ (ยืนยันจาก DOM จริง: img
// ไม่มี srcset เลย และโหลดไฟล์ 1400 แม้บนจอเล็ก) ไฟล์ 700 ที่ scraper ทำไว้
// จึงไม่มีวันถูกใช้ ถ้าดันใช้ next/image ต่อ
// เขียน srcSet/sizes เองบน <img> จึงเป็นทางเดียวที่ไฟล์ 700 ได้ทำงานจริง
// โดยไม่ต้องแตะ next.config (อยู่นอกขอบเขต task C)
// ถ้าวันหลังเอา unoptimized ออกจาก config แล้ว สลับกลับไปใช้ next/image ได้เลย

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useFinish } from './FinishProvider';

const FADE_S = 0.42; // 420ms ตามสเปก §5
const LOAD_WATCHDOG_MS = 1500;

/**
 * เดิมประกอบ URL ตัวเล็กเองด้วย regex (`.webp` → `-700.webp`) แล้วประกาศ 700w/1400w ตายตัว
 * ซึ่งผิดกับสินค้าที่ master จาก Scene7 เล็กกว่า 700px — key-white.py ไม่อัปสเกล
 * ไฟล์ `-700.webp` จึงไม่มีจริง (taut-21370t-4cd, july-72821x-4, patio-22586x-s)
 * เบราว์เซอร์เลือก candidate 700w แล้วได้ 404 เวทีเลยขึ้นเป็น alt text บนพื้นดำ
 *
 * generated data มี `image700` ที่ชี้ไปยังไฟล์ที่ถูกต้องอยู่แล้ว และจะเท่ากับ `image`
 * เมื่อไม่มีไฟล์ครึ่งขนาด — ใช้ค่านั้นแทน และใส่ srcSet เฉพาะตอนที่มีสองไฟล์จริง
 * (ถ้ามีไฟล์เดียว srcSet ที่มี candidate เดียวไม่ได้ช่วยอะไร แถมยังต้องโกหกความกว้าง)
 */
function srcSetFor(src: string, src700: string) {
  if (!src700 || src700 === src) return undefined;
  return `${src700} 700w, ${src} 1400w`;
}

type Layer = { key: string; src: string; src700: string };

type Props = {
  /** ชื่อสินค้าไว้ทำ alt — ควรเป็นชื่อในภาษาที่กำลังแสดง */
  name: string;
  className?: string;
  /** hero/above the fold ให้ true */
  priority?: boolean;
  /** ใส่ค่า sizes ให้ตรงกับความกว้างจริงของเวทีในแต่ละ breakpoint */
  sizes?: string;
  /** ปิด spotlight เมื่อวางบนพื้นที่มีแสงอยู่แล้ว */
  spotlight?: boolean;
};

export default function ProductStage({
  name,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 90vw, 40vw',
  spotlight = true,
}: Props) {
  const { selected } = useFinish();

  // front = รูปที่กำลังจะเป็นตัวจริง · back = รูปเดิมที่ยังค้างไว้ระหว่าง crossfade
  const [front, setFront] = useState<Layer | null>(
    selected ? { key: selected.code, src: selected.image, src700: selected.image700 } : null,
  );
  const [back, setBack] = useState<Layer | null>(null);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const faded = useRef(true); // รูปปัจจุบันแสดงเต็มแล้วหรือยัง
  const timer = useRef<number | null>(null);

  // เปลี่ยน finish → ดันรูปเดิมไปเป็น back แล้วรอรูปใหม่โหลด
  useEffect(() => {
    if (!selected) return;
    setFront((prev) => {
      if (prev?.key === selected.code) return prev;
      if (prev) setBack(prev);
      faded.current = false;
      return { key: selected.code, src: selected.image, src700: selected.image700 };
    });
  }, [selected]);

  // รูปใหม่พร้อมแล้ว → crossfade
  const runFade = () => {
    if (faded.current) return;
    faded.current = true;
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }

    const f = frontRef.current;
    const b = backRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !f) {
      gsap.set(f, { opacity: 1 });
      gsap.set(b, { opacity: 0 });
      setBack(null);
      return;
    }

    gsap.to(f, { opacity: 1, duration: FADE_S, ease: 'power2.inOut' });
    if (b) {
      gsap.to(b, {
        opacity: 0,
        duration: FADE_S,
        ease: 'power2.inOut',
        onComplete: () => setBack(null),
      });
    }
  };

  // watchdog: รูปเสียหรือโหลดไม่ขึ้น ก็ต้องไม่ทิ้งเวทีไว้ที่ opacity 0
  useEffect(() => {
    if (faded.current) return;
    timer.current = window.setTimeout(runFade, LOAD_WATCHDOG_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.key]);

  if (!front) return null;

  // h-full w-full: เลเยอร์รูปเป็น absolute/inset-0 ทั้งหมด ถ้า root สูงเป็น auto
  // มันจะยุบเหลือ 0 แล้วรูปหายทั้งเวที (เจอจริงตอนทดสอบ: parent 420x0)
  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* spotlight อยู่ใน inset-0 พอดีกรอบ ไม่ล้นออกนอกเวที
          เดิมทำไว้ 130% แล้วเลื่อนกลับ ซึ่งกินพื้นที่นอกกรอบ ถ้า caller วางเวที
          ไว้ในคอนเทนเนอร์ที่ไม่ได้ overflow-hidden จะดัน horizontal overflow
          บนมือถือ (ขัด AC ข้อ 6) · gradient จางหมดที่ 72% อยู่แล้ว ขอบจึงไม่คม
          อยากได้แสงฟุ้งกว้างกว่านี้ ให้ caller วาง glow ของตัวเองไว้ข้างหลัง */}
      {spotlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 30%, transparent), transparent 72%)',
          }}
        />
      )}

      {/* รูปเดิม: ค้างไว้จนกว่า crossfade จะจบ เวทีจึงไม่เคยว่าง */}
      {back && (
        <div ref={backRef} className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- ดูหมายเหตุ srcset ด้านบน */}
          <img
            key={back.key}
            src={back.src}
            srcSet={srcSetFor(back.src, back.src700)}
            sizes={srcSetFor(back.src, back.src700) ? sizes : undefined}
            alt=""
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      {/* รูปใหม่: เริ่มที่ opacity 0 แล้ว fade เข้าเมื่อโหลดเสร็จ
          ถ้าไม่มีรูปเก่าค้างอยู่ (โหลดครั้งแรก) ให้แสดงเต็มไปเลย ไม่ต้อง fade */}
      <div
        ref={frontRef}
        className="absolute inset-0"
        style={{ opacity: back ? 0 : 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ดูหมายเหตุ srcset ด้านบน */}
        <img
          key={front.key}
          // ref callback: รูปที่อยู่ใน cache แล้วอาจ complete ตั้งแต่ก่อน React
          // ผูก onLoad ทัน ถ้ารอแต่ onLoad อย่างเดียวจะค้างที่ opacity 0
          ref={(el) => {
            if (el?.complete) runFade();
          }}
          src={front.src}
          srcSet={srcSetFor(front.src, front.src700)}
          sizes={srcSetFor(front.src, front.src700) ? sizes : undefined}
          alt={name}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={runFade}
          onError={runFade}
          className="h-full w-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.65)]"
        />
      </div>
    </div>
  );
}
