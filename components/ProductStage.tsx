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
import { inkFitStyle, inkFor } from '@/lib/ink-fit';

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
  /**
   * สัดส่วนของเวที (กว้าง/สูง) — ผู้เรียกเป็นคนรู้ เพราะเวทีเป็น `h-full w-full`
   * ของกล่องที่ผู้เรียกกำหนด ส่งมาแล้วเวทีจะขยายเนื้อสินค้าให้เต็มกรอบตาม
   * กรอบอัลฟาที่ build ไว้ (ดู lib/ink-fit.ts) ไม่ส่ง = เรนเดอร์แบบเดิม
   */
  fitAspect?: number;
};

/**
 * เวทีขยายน้อยกว่าการ์ดในกริด
 *
 * การ์ดในกริดมีเวลาของผู้ใช้แค่ครึ่งวินาที เนื้อยิ่งใหญ่ยิ่งอ่านออก แต่เวทีคือ
 * ที่ที่คนตั้งใจมาดูของชิ้นนี้ มี spotlight กับเงาอยู่รอบ ๆ และมีสวอตช์ให้กดข้าง ๆ
 * เนื้อที่ชนขอบเวทีทำให้ทั้งบล็อกอึดอัดโดยไม่ได้ช่วยให้เห็นสินค้าชัดขึ้น
 */
// 0.58 ไม่ใช่ 0.72 — วัดจากของจริง: กล่องเวทีเป็น `aspect-[4/5]` ของคอลัมน์ซ้าย
// ที่ 1440 กว้าง ~700px จึงสูง ~875px แต่มันเริ่มที่ y≈210 บนจอสูง 900
// เหลือให้เห็นจริงราว 690px เท่านั้น ที่ 0.72 สุขภัณฑ์สูง ~630px ล้นพ้นขอบจอ
// ตั้งแต่เฟรมแรก (ดู a1-pdp-after.png รอบแรก) — เวทีติด sticky ก็จริง แต่เฟรมแรก
// ของหน้าสินค้าควรเห็นของทั้งชิ้น ไม่ใช่ครึ่งบน
const STAGE_INK_TARGET = 0.58;

export default function ProductStage({
  name,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 90vw, 40vw',
  spotlight = true,
  fitAspect,
}: Props) {
  const { selected } = useFinish();

  // transform ต่อเลเยอร์ — คำนวณจากข้อมูลที่ build ไว้ ไม่มีการวัด DOM
  const fitFor = (src: string) =>
    fitAspect ? inkFitStyle(inkFor(src), fitAspect, STAGE_INK_TARGET) : undefined;

  // front = รูปที่กำลังจะเป็นตัวจริง · back = รูปเดิมที่ยังค้างไว้ระหว่าง crossfade
  const [front, setFront] = useState<Layer | null>(
    selected ? { key: selected.code, src: selected.image, src700: selected.image700 } : null,
  );
  const [back, setBack] = useState<Layer | null>(null);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const faded = useRef(true); // รูปปัจจุบันแสดงเต็มแล้วหรือยัง
  const timer = useRef<number | null>(null);

  /**
   * เฟรมแรกผ่านไปแล้วหรือยัง
   *
   * `?finish=` บนหน้าสินค้าเลือกเฉดให้ตั้งแต่ก่อน paint (ดู FinishFromQuery ใน
   * ProductDetail) การเปลี่ยนครั้งนั้นไม่ใช่การกระทำของผู้ใช้ — มันคือการแก้ค่า
   * เริ่มต้นให้ตรงกับเฉดที่เขาเดินทางมา ถ้าปล่อยให้ crossfade ตามปกติ ผู้ใช้จะเห็น
   * เฉดที่ไม่ได้ขอค้างอยู่ 420ms แล้วค่อยจางไปเฉดที่ถูก ซึ่งอ่านว่าเว็บเลือกผิดแล้วแก้
   * สลับทันทีในเฟรมนั้นแทน แล้วค่อยเปิด crossfade ให้การกดสวอตช์จริง ๆ หลังจากนั้น
   *
   * ประกาศ effect นี้ไว้ "หลัง" effect เปลี่ยน finish โดยตั้งใจ — effect ในคอมโพเนนต์
   * เดียวกันรันตามลำดับที่ประกาศ รอบแรกจึงยังอ่าน ready เป็น false ได้
   */
  const ready = useRef(false);

  // เปลี่ยน finish → ดันรูปเดิมไปเป็น back แล้วรอรูปใหม่โหลด
  useEffect(() => {
    if (!selected) return;
    setFront((prev) => {
      if (prev?.key === selected.code) return prev;
      if (prev && ready.current) {
        setBack(prev);
        faded.current = false;
      } else {
        // ก่อนเฟรมแรก: สลับดิบ ๆ ไม่มีชั้นค้าง ไม่มี fade
        setBack(null);
        faded.current = true;
      }
      return { key: selected.code, src: selected.image, src700: selected.image700 };
    });
  }, [selected]);

  useEffect(() => {
    ready.current = true;
  }, []);

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
            style={{ transform: fitFor(back.src), transformOrigin: 'center' }}
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
          // เงาเดิมเป็น 0_40px_80px rgba(0,0,0,.65) ซึ่งจูนไว้ตอนเวทีอยู่บนพื้น #08090A
          // บนพื้น #E5E5E5 ค่านั้นไม่ใช่เงาแต่เป็นก้อนดำใต้สินค้า — เบาลงเป็น 16%
          // (สเปก 2026-09-01 ความเสี่ยงข้อ 2 อนุญาตให้ใส่เงาด้วย CSS ได้ ไม่ใช่เงาที่อบมากับรูป)
          className="h-full w-full object-contain drop-shadow-[0_24px_44px_rgba(0,0,0,0.16)]"
          // transform บนตัว <img> เอง ไม่ใช่ชั้นครอบ: ชั้นครอบเป็นตัวที่ gsap
          // tween opacity อยู่ ถ้าใส่ transform ไว้ตรงนั้นด้วย ทั้งสองจะเขียนทับ
          // style เดียวกันคนละรอบ (เคยเจอมาแล้วในกำแพง — สามอย่างขยับของชิ้นเดียว)
          style={{ transform: fitFor(front.src), transformOrigin: 'center' }}
        />
      </div>
    </div>
  );
}
