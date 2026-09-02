'use client';

// Hero หน้าแรก — ภาพถ่ายเต็มจอที่หมุนได้ ไม่ใช่ภาพนิ่งใบเดียว (task B2 ข้อ 1)
//
// ลูกค้าเทียบกับ kohler.co.th ซึ่งเปิดหน้าด้วย hero เต็มจอที่หมุนภาพ แล้วบอกว่า
// ของเรา "ไม่สวย" — เรามีภาพห้อง 88 ใบ ภาพทั้งคลัง 224 ใบ แต่หน้าแรกโชว์ใบเดียว
//
// ── ทำไมเป็นครัวทั้งห้าใบ ────────────────────────────────────────────────────
// พาดหัวของ hero คือ `heroTitle` ใน lib/i18n.ts = "ศิลปะของครัว…" / "The Art of
// the Kitchen…" ตัวอักษรค้างอยู่ทุกสไลด์ ภาพห้องน้ำใต้ประโยคนั้นจึงเป็นคำโกหก
// คลังมีภาพครัวที่กว้าง ≥1440 อยู่ 36 ใบ เลือกด้วยตาจากคอนแทกต์ชีต 9 ใบที่เข้าเกณฑ์
// หมวด room เอาห้าใบที่อ่านเป็น "ครัวพรีเมียม" จริง ๆ ไม่ใช่ครัวสาธิตของแคตตาล็อก
//
// ── ทำไมมือถือหมุนแค่สามใบ ──────────────────────────────────────────────────
// hero บนจอ 390 สูงราว 700px = กรอบแนวตั้ง (อัตราส่วน ~0.56) มาสเตอร์แบบแบนเนอร์
// 1800×800 (อัตราส่วน 2.25) ถูก object-cover ขยายจนต้องใช้ความกว้าง ~1575px เพื่อ
// เติมความสูง ในขณะที่ไฟล์ที่มือถือควรโหลดคือ 900 — ได้ภาพเบลอ 1.75 เท่า
// ใบที่อัตราส่วน ≤1.5 ต้องการแค่ ~933px จึงรอดที่ 900 สไลด์แบนเนอร์เลยถูกข้ามไป
// บนจอเล็ก ไม่ได้ถูกลบ: เดสก์ท็อปยังได้ครบห้าใบ
//
// ── ทำไมสไลด์ที่ 2 เป็นต้นไปยังไม่ถูก mount ตั้งแต่แรก ─────────────────────
// สไลด์ทุกใบวางซ้อนกันที่ inset-0 จึง "อยู่ในจอ" ทั้งหมด `loading="lazy"` ไม่ช่วย
// อะไรเลย (lazy เลื่อนเฉพาะรูปนอกจอ) และ opacity 0 ก็ไม่ได้ห้ามโหลด ถ้า mount
// ครบตั้งแต่เฟรมแรก hero จะดึงไฟล์ ~5×100KB มาแข่งกับ LCP ของตัวมันเอง
// ใบแรกจึงมาก่อนใบเดียว ที่เหลือตามมาหลัง window load (ดู mountRest)

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLang } from '@/components/LangProvider';
import { lifestyleImages, lifestyleSrc, type LifestyleImage } from '@/lib/lifestyle.generated';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** ห้าใบที่หมุนบน hero — เลือกด้วยตา ไม่ใช่ด้วยแฮช (ดูหมายเหตุหัวไฟล์) */
const SLIDE_IDS = [
  'zaa08493', // ครัวหินอ่อน + ไม้ เครื่องชงกาแฟ — ใบแรกเสมอ อัตราส่วน 1.333 รอดทั้งสองจอ
  'zab59998-1800x800-hollywoodhills', // ครัวเปิดโล่งโทนทราย (hero เดิม)
  'aab39432', // ก๊อกดำ ไม้โอ๊ก หน้าต่างเหล็ก
  'zaa98109', // ครัวฟาร์มเฮาส์โทนเทาน้ำเงิน
  'zab64028-1800x800', // ครัวขาวสว่าง
];

/** ภาพรองที่วางคู่กับบล็อกข้อความใต้ hero — ห้องน้ำ คู่กับบล็อกที่พูดถึงสองโลก */
const SECOND_ID = 'zab49013-1800x800';

/** มาสเตอร์ที่กว้างกว่านี้ถูกกรอบแนวตั้งของมือถือขยายจนเบลอ (ดูหมายเหตุหัวไฟล์) */
const PHONE_MAX_ASPECT = 1.6;

/** วินาทีที่สไลด์หนึ่งค้างอยู่ก่อนเปลี่ยน */
const HOLD = 6;
/** วินาทีของการจางไขว้ */
const FADE = 1.1;
/** ขยายช้า ๆ ตลอดอายุสไลด์ — 1.00 → ค่านี้ */
const DRIFT = 1.07;

function pic(id: string): LifestyleImage {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}

const SLIDES = SLIDE_IDS.map(pic);

// ปุ่มควบคุมสไลด์เป็นข้อความ UI ที่ยังไม่มีใน lib/i18n.ts และไฟล์นั้นอยู่นอก
// ขอบเขตงานนี้ (อีกเซสชันถืออยู่) — เก็บไว้ตรงนี้ก่อน ท่าเดียวกับ SPEC_LABEL_EN
// ใน ProductDetail.tsx แล้วค่อยย้ายเข้า i18n เมื่อไฟล์นั้นว่าง
const UI = {
  pause: { th: 'หยุดสไลด์อัตโนมัติ', en: 'Pause the slideshow' },
  play: { th: 'เล่นสไลด์อัตโนมัติต่อ', en: 'Resume the slideshow' },
};

export default function HomeHero() {
  const { lang, t } = useLang();
  const second = pic(SECOND_ID);

  const root = useRef<HTMLElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const bar = useRef<HTMLSpanElement>(null);
  const timer = useRef<gsap.core.Tween | null>(null);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  /**
   * หยุดชั่วคราวเพราะผู้ใช้กำลังยุ่งอยู่กับ hero — ไม่ใช่การกดปุ่มหยุด
   *
   * เกิดสองกรณี: โฟกัสคีย์บอร์ดอยู่ข้างใน (กำลังไล่ปุ่มอยู่ ภาพไม่ควรเปลี่ยนใต้มือ)
   * และเมาส์วางอยู่บนแถบควบคุม — ไม่ใช่ทั้ง hero: hero กินเต็มจอ ถ้าหยุดทุกครั้ง
   * ที่เมาส์อยู่บนภาพ มันก็แทบไม่ได้หมุนเลย ซึ่งคือปัญหาที่งานนี้ตั้งใจแก้
   */
  const [held, setHeld] = useState(false);
  /** จำนวนสไลด์ที่ถูก mount แล้ว — ใบแรกมาก่อน ที่เหลือตามหลัง window load */
  const [mounted, setMounted] = useState(1);
  /** ลำดับที่หมุนได้จริงบนจอนี้ (มือถือข้ามใบแบนเนอร์) — เดิมคือ "ใบแรกใบเดียว" */
  const [cycle, setCycle] = useState<number[]>([0]);
  /** ประตูเข้ายังคลุมจออยู่ — hero ไม่ควรหมุนอยู่หลังฉากที่ไม่มีใครเห็น */
  const [gateUp, setGateUp] = useState(false);

  // ── สไลด์ที่จอนี้หมุนได้ ─────────────────────────────────────────────────
  //
  // ตัดสินหลัง mount เสมอ: static export ส่ง HTML ชุดเดียวให้ทุกเครื่อง ถ้าเรนเดอร์
  // ลำดับต่างกันตั้งแต่รอบแรก hydration จะไม่ตรง — รอบแรกจึงเป็น [0] ทั้งสองฝั่ง
  useIsoLayoutEffect(() => {
    const phone = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      const list = SLIDES.map((_, n) => n).filter(
        (n) => !phone.matches || SLIDES[n].aspect <= PHONE_MAX_ASPECT,
      );
      setCycle(list);
      // ย่อหน้าต่างจนสไลด์ที่กำลังฉายอยู่ตกรอบ — กลับไปใบแรกแทนที่จะค้าง
      setI((cur) => (list.includes(cur) ? cur : list[0]));
    };
    sync();
    phone.addEventListener('change', sync);
    return () => phone.removeEventListener('change', sync);
  }, []);

  // ── ไม่หมุนอยู่หลังประตูเข้า ─────────────────────────────────────────────
  //
  // ประตูเข้า (Preloader) คลุมเต็มจออยู่ 4–6 วินาทีแรก ถ้า hero หมุนอยู่ข้างหลัง
  // สองอย่างพังพร้อมกัน: คนแรกที่เข้าเว็บไม่ได้เห็นสไลด์แรกเลย (ประตูเปิดมาเจอ
  // ใบที่สองหรือสาม) และ **LCP ย้ายไปเป็นใบนั้น** — วัดที่ 1440 ได้ 6.2 วินาที
  // เพราะภาพที่โผล่ทีหลังกลายเป็น contentful paint ก้อนใหญ่ก้อนใหม่หลังประตูเปิด
  //
  // อ่านจาก DOM ไม่ใช่จาก state ร่วม: Preloader อยู่ใน layout ของทุกหน้าและตั้งใจ
  // ไม่ประกาศสถานะออกมา (หมายเหตุในไฟล์นั้นบอกว่า sessionStorage คือแหล่งความจริง
  // เดียว) `[data-preloader]` เป็นสัญญาข้าม DOM แบบเดียวกับ `[data-wall-panel]`
  // ที่ไฟล์นั้นใช้เอง และตัวประตูก็ unmount ตัวเองเมื่อผ่าน จึงตรวจด้วย childList ได้
  useIsoLayoutEffect(() => {
    const sync = () => setGateUp(!!document.querySelector('[data-preloader]'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // ── ใบที่เหลือตามมาหลังหน้าโหลดเสร็จ ────────────────────────────────────
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    let id = 0;
    const mountRest = () => {
      id = window.setTimeout(() => setMounted(SLIDES.length), 400);
    };
    if (document.readyState === 'complete') mountRest();
    else window.addEventListener('load', mountRest, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('load', mountRest);
    };
  }, []);

  const advance = useCallback(() => {
    setI((cur) => {
      const at = cycle.indexOf(cur);
      return cycle[(at + 1) % cycle.length] ?? cur;
    });
  }, [cycle]);

  // ── จางไขว้ + ขยายช้า ๆ ─────────────────────────────────────────────────
  //
  // opacity เป็นของ GSAP ล้วน React ตั้งค่าเริ่มต้นให้ครั้งเดียวตอน mount
  // (`style={{ opacity: n === 0 ? 1 : 0 }}`) แล้วไม่แตะอีก เพราะ props ของ
  // style ไม่เปลี่ยนระหว่างเรนเดอร์ React จึงไม่เขียนทับค่าที่ GSAP ใส่ไว้
  useIsoLayoutEffect(() => {
    const list = imgs.current;
    const active = list[i];
    if (!active) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.forEach((img, n) => {
      if (!img) return;
      if (n === i) {
        gsap.to(img, { opacity: 1, duration: reduced ? 0 : FADE, ease: 'power2.inOut' });
        if (!reduced) {
          // ขยายต่อเนื่องตลอดอายุสไลด์ ไม่ใช่ tween สั้น ๆ ตอนเข้า —
          // ภาพนิ่งค้างหกวินาทีอ่านเป็นภาพนิ่ง ต่อให้มันเพิ่งจางเข้ามา
          gsap.fromTo(
            img,
            { scale: 1 },
            { scale: DRIFT, duration: HOLD + FADE, ease: 'none', overwrite: 'auto' },
          );
        }
      } else {
        gsap.to(img, { opacity: 0, duration: reduced ? 0 : FADE, ease: 'power2.inOut' });
        gsap.set(img, { scale: 1, delay: reduced ? 0 : FADE });
      }
    });

    // killTweensOf ไม่ใช่ ctx.revert(): revert คืนค่า inline ที่ tween เขียนไว้
    // กลับไปเป็นค่าก่อนหน้า ซึ่งแปลว่าสไลด์จะกระโดดกลับทุกครั้งที่เปลี่ยนใบ
    // สิ่งที่ต้องการคือ "หยุดตรงที่ถึง" แล้วให้ tween ชุดใหม่ออกตัวจากตรงนั้น
    return () => gsap.killTweensOf(list.filter(Boolean) as HTMLImageElement[]);
  }, [i]);

  // ── ตัวจับเวลา + แถบความคืบหน้าของสไลด์ปัจจุบัน ─────────────────────────
  //
  // reduced-motion ไม่หมุนเอง (WCAG 2.3.3 + สเปกของโปรเจกต์) และไม่มีอะไรให้
  // หมุนถ้าจอนี้เหลือสไลด์เดียว — ปุ่ม dot ยังกดเปลี่ยนเองได้ทั้งสองกรณี
  useEffect(() => {
    timer.current?.kill();
    timer.current = null;
    const line = bar.current;
    const still =
      paused ||
      held ||
      gateUp ||
      cycle.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // เต็มแถบตอนไม่นับถอยหลัง ไม่ใช่ว่างเปล่า — ขีดของใบที่กำลังฉายต้องอ่านว่า
    // "ใบนี้" เสมอ ถ้าปล่อยว่างไว้ตอนกดหยุด ขีดที่ทำงานอยู่จะจางกว่าขีดที่ไม่ได้ทำงาน
    if (line) gsap.set(line, { scaleX: still ? 1 : 0 });
    if (still) return;

    const p = { v: 0 };
    timer.current = gsap.to(p, {
      v: 1,
      duration: HOLD,
      ease: 'none',
      onUpdate: () => {
        if (line) gsap.set(line, { scaleX: p.v });
      },
      onComplete: advance,
    });
    return () => {
      timer.current?.kill();
      timer.current = null;
    };
  }, [i, paused, held, gateUp, cycle.length, advance]);

  // ── พารัลแลกซ์ตอนเลื่อนออก ──────────────────────────────────────────────
  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    const layer = stack.current;
    if (!el || !layer) return;

    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      gsap.fromTo(
        layer,
        { yPercent: 0 },
        {
          yPercent: 9,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const at = cycle.indexOf(i);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      <section
        ref={root}
        className="relative isolate min-h-[86svh] w-full overflow-clip bg-ink md:min-h-[92svh]"
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={() => setHeld(false)}
      >
        <div ref={stack} className="absolute inset-0">
          {/* ใบที่จอนี้ไม่หมุนถึงไม่ต้อง mount เลย — โทรศัพท์จึงไม่จ่ายค่าไฟล์
              แบนเนอร์สองใบที่มันตัดออกไปตั้งแต่แรก (ดู cycle) ใบแรกอยู่เสมอ
              เพราะเป็นสิ่งที่ HTML ของ static export ส่งมาและ hydrate ต้องตรงกัน */}
          {SLIDES.map((slide, n) =>
            n !== 0 && (n >= mounted || !cycle.includes(n)) ? null : (
            /* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */
            <img
              key={slide.id}
              ref={(el) => {
                imgs.current[n] = el;
              }}
              src={lifestyleSrc(slide, slide.maxWidth)}
              srcSet={slide.sources.map((s) => `${s.src} ${s.width}w`).join(', ')}
              sizes="100vw"
              // เฉพาะใบที่กำลังฉายอยู่ที่มีคำบรรยาย — ใบที่จางอยู่ถูกถอดออกจาก
              // a11y tree ทั้งใบ ไม่งั้นโปรแกรมอ่านหน้าจอจะอ่านห้าห้องรวดเดียว
              alt={n === i ? slide.alt[lang] : ''}
              aria-hidden={n !== i}
              width={slide.width}
              height={slide.height}
              decoding="async"
              fetchPriority={n === 0 ? 'high' : 'low'}
                className="absolute inset-0 h-full w-full object-cover will-change-transform"
                style={{ opacity: n === 0 ? 1 : 0 }}
              />
            ),
          )}
        </div>

        {/* ม่านสองชั้น — และชั้นที่สองมีเพราะ hero หมุนภาพแล้ว
            ชั้นล่าง→บน คุมพื้นที่ปุ่มกับคำโปรยเหมือนเดิม แต่ kicker กับพาดหัวอยู่
            สูงกว่านั้น พอสไลด์เปลี่ยนเป็นครัวที่มีหน้าต่างสว่างตรงนั้นพอดี
            ตัวอักษรขาวจะเหลือ ~1.6:1 — ภาพนิ่งใบเดียวเลือกใบที่มุมนั้นมืดได้
            ห้าใบที่หมุนเลือกไม่ได้ ชั้นซ้าย→ขวาจึงรับประกันคอลัมน์ตัวอักษรแทน
            หยุดที่ 58% ครึ่งขวาของภาพยังสว่างเต็มและยังอ่านออกว่าเป็นครัว
            ทั้งสองใบอยู่นอก stack ที่ขยับพารัลแลกซ์ ม่านจึงไม่เลื่อนหนีตัวอักษร */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(12,12,12,0.82) 0%, rgba(12,12,12,0.55) 38%, rgba(12,12,12,0.15) 70%, rgba(12,12,12,0.05) 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(12,12,12,0.72) 0%, rgba(12,12,12,0.5) 28%, rgba(12,12,12,0.16) 58%, rgba(12,12,12,0) 82%)',
          }}
        />

        <div className="relative z-10 flex min-h-[86svh] flex-col justify-end px-6 pb-16 pt-36 md:min-h-[92svh] md:px-[8vw] md:pb-20">
          <p className="micro !text-white/80">{t.home.heroKicker}</p>
          {/* text-hero คือโทเคนของสเกลนี้ (d78dd9d) — clamp(48px, 7.5vw, 108px)
              พร้อม line-height 1.6 ในตัว ไม่ต้องมี md:text-[72px] มาทับอีกชั้น
              และไม่ต้องพึ่ง .leading-thai เพื่อกู้ความสูงบรรทัดคืนอีกต่อไป */}
          {/* max-w-[76rem] ไม่ใช่ max-w-4xl: ที่ 108px พาดหัวอังกฤษบรรทัดแรก
              ("The Art of the Kitchen,") กว้าง ~1160px กรอบ 896px เดิมจึงหักมัน
              เป็นสามบรรทัด = 518px สูงกว่าที่ hero มีให้ทั้งบล็อก คำโปรยกับปุ่ม
              เลยตกจอ วัดที่ 1440: ช่องระหว่าง px-[8vw] กว้าง 1210px พอดีสองบรรทัด */}
          <h1 className="mt-4 max-w-[76rem] whitespace-pre-line font-display text-hero font-normal tracking-wide text-white">
            {t.home.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-body font-normal leading-relaxed text-white/85">
            {t.home.heroSub}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/products/"
              className="border border-white/70 px-8 py-4 text-label uppercase tracking-widest2 text-white transition-colors duration-300 hover:bg-white hover:text-ink"
            >
              {t.nav.products}
            </Link>
            <Link
              href="/contact/"
              className="border border-transparent px-8 py-4 text-label uppercase tracking-widest2 text-white/85 underline underline-offset-8 transition-colors duration-300 hover:text-white"
            >
              {t.home.ctaBtn}
            </Link>
          </div>

          {/* ── ตัวควบคุมสไลด์ ─────────────────────────────────────────────
              เนื้อในโผล่เฉพาะตอนที่จอนี้มีมากกว่าหนึ่งใบให้หมุนจริง ๆ (มือถือได้สามใบ)
              ป้ายของ dot คือคำบรรยายภาพจริงของใบนั้น ไม่ใช่ "สไลด์ 3" ลอย ๆ

              แต่ **กล่องมีตั้งแต่ HTML ที่ static export ส่งมา** และสูง h-9 คงที่:
              จำนวนสไลด์ที่จอนี้หมุนได้รู้ได้หลัง mount เท่านั้น ถ้ากล่องเกิดขึ้น
              ตอนนั้น เนื้อหาที่ justify-end อยู่จะถูกดันขึ้น 36px ทั้งก้อน
              วัดแล้วเป็น CLS 0.0206 ที่ t=165ms — ค่าเดียวที่หน้าแรกมี */}
          <div
            className="mt-12 flex h-9 items-center gap-5"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
          >
            {cycle.length > 1 && (
              <>
              <p className="micro !text-white/70 tabular-nums">
                {pad(at + 1)} / {pad(cycle.length)}
              </p>
              <div className="flex items-center gap-2">
                {cycle.map((n) => (
                  <button
                    key={SLIDES[n].id}
                    type="button"
                    onClick={() => setI(n)}
                    aria-label={SLIDES[n].alt[lang]}
                    aria-current={n === i}
                    className="group py-3"
                  >
                    <span
                      className={`block h-px w-10 transition-colors duration-300 ${
                        n === i ? 'bg-white/35' : 'bg-white/40 group-hover:bg-white/80'
                      }`}
                    >
                      {/* แถบความคืบหน้าอยู่บนขีดของใบที่กำลังฉาย ตัวเดียว
                          สีขาวไม่ใช่ accent: accent ของหน้าแรกเป็นทองซึ่งไม่มีที่
                          ไหนอีกใน hero — ขีดทองเส้นเดียวอ่านเป็นของหลุดมา */}
                      {n === i && (
                        <span
                          ref={bar}
                          aria-hidden
                          className="block h-px w-full origin-left bg-white"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {/* WCAG 2.2.2: อะไรที่ขยับเองเกินห้าวินาทีต้องมีปุ่มหยุดให้จริง ๆ
                  ไม่ใช่หยุดตอนเมาส์ผ่านอย่างเดียว */}
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? UI.play[lang] : UI.pause[lang]}
                aria-pressed={paused}
                // พื้นทึบของตัวเอง ไม่ใช่ขอบลอย ๆ บนภาพ: วัดแล้วขอบ white/45 บน
                // สไลด์ที่ตรงนั้นเป็นตู้ครัวสีขาวเหลือ 2.1:1 ซึ่งต่ำกว่าเกณฑ์ 3:1
                // ของ non-text ปุ่มเดียวที่ต้องยืนได้บนภาพห้าใบจึงต้องพกพื้นมาเอง
                className="ml-1 flex h-9 w-9 items-center justify-center border border-white/70 bg-[rgba(12,12,12,0.5)] text-white transition-colors duration-300 hover:border-white"
              >
                <span aria-hidden className="block text-[11px] leading-none">
                  {paused ? '▶' : '❙❙'}
                </span>
              </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* แถบภาพที่สองต่อจาก hero — ให้จอแรกไม่ใช่ทั้งหมดที่หน้าแรกมี */}
      <section className="grid items-stretch gap-0 border-b border-line-6 bg-base md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-6 py-16 md:order-1 md:px-[6vw] md:py-24">
          <p className="micro mb-3">{t.home.featuredKicker}</p>
          <h2 className="max-w-md font-display text-section font-normal text-ink">
            {t.home.featuredTitle}
          </h2>
          <p className="mt-4 max-w-md text-body text-dim">{t.home.catSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products/?cat=kitchen"
              className="border border-line-12 px-6 py-3 text-label uppercase tracking-widest2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              {t.home.catKitchen}
            </Link>
            <Link
              href="/products/?cat=bath"
              className="border border-line-12 px-6 py-3 text-label uppercase tracking-widest2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              {t.home.catBath}
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
          {/* srcSet ไม่ใช่ src ค่าเดียว: ช่องนี้กว้างครึ่งจอบนเดสก์ท็อป (ต้องการ
              1800) แต่เต็มความกว้างบนมือถือ ซึ่ง 900 พอ — เดิมส่งไฟล์ 1800 ให้
              โทรศัพท์ทุกเครื่องเพราะ lifestyleSrc คิดจาก dpr 2 ตายตัว */}
          <img
            src={lifestyleSrc(second, 720, 2)}
            srcSet={second.sources.map((s) => `${s.src} ${s.width}w`).join(', ')}
            sizes="(max-width: 767px) 100vw, 50vw"
            alt={second.alt[lang]}
            width={second.width}
            height={second.height}
            className="h-full min-h-[320px] w-full object-cover md:min-h-[520px]"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>
    </>
  );
}
