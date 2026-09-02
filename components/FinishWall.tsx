'use client';

// กำแพงผิวเคลือบ = หน้าแรก (spec finish-first §4.1 + products-as-motion §3)
//
// นี่คือกิมมิกของทั้งเว็บ: เว็บนำทางด้วยผิวเคลือบ ไม่ใช่หมวดสินค้า
// หน้าแรกจึงไม่มี hero heading และไม่มี category nav — ผู้ใช้เจอวัสดุก่อนเจอคำ
//
// รอบนี้แผงมีสินค้าอยู่บนนั้น: ลูกค้าบอกว่ากำแพงยังงง เพราะวัสดุ 11 แถบไม่ได้บอก
// ว่าเว็บนี้ขายอะไร ต้องอ่านป้ายถึงจะเข้าใจ — สินค้าจริงในเฉดนั้นตอบคำถามนั้นทันที
//
// ข้อบังคับจากสเปกที่ห้ามละเมิด:
//   - ห้ามมีอะไรบนหน้านี้เด่นแข่งกับกำแพง (จึงไม่มี ModelNumber ที่นี่ §4.3)
//   - แผงต้องเป็น "สนามวัสดุ" เต็มพื้นที่ ไม่ใช่วงกลม chip เล็ก ๆ
//   - scrim คำนวณต่อแผงจากความสว่างของ swatch ตัวเอง ไม่ใช่ค่า overlay ค่าเดียว
//   - รูปสินค้าต้องเป็นเฉดของแผงนั้นจริง (finishOf) ตรวจที่ img src
//
// ── การจัดชั้น transform ────────────────────────────────────────────────────
// สามอย่างขยับสินค้าชิ้นเดียวกัน ถ้าอยู่ element เดียวกันจะแย่ง transform กันเอง
// จึงซ้อนเป็นสามชั้น แต่ละชั้นมีเจ้าของเดียว:
//   [data-parallax] ← ScrollTrigger scrub (เลื่อนออกตอน scroll ความเร็วต่างกันต่อแผง)
//   [data-drift]    ← tween ลอยขึ้นลงวนไม่จบ เฟสต่างกันทุกแผง
//   [data-lift]     ← CSS transition ตอน hover/focus (ลอยขึ้น + ใหญ่ขึ้น)

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from '@/components/Link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PanelProduct from './PanelProduct';
import { useLang } from './LangProvider';
import type { PanelScrim } from './finish-index';
import type { PanelProduct as PanelProductItem } from './wall-products';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type WallPanel = {
  code: string;
  name: { th: string; en: string };
  count: number;
  material: string;
  accent: string;
  scrim: PanelScrim;
  /** สินค้าในเฉดนี้ เรียงมาจาก wall-products — ชิ้นแรกคือชิ้นที่ preloader โชว์ */
  products: PanelProductItem[];
};

// สัดส่วนการขยายตอน hover/focus — แผงที่ถูกเลือกกิน 2.6 ส่วน อีก 10 แผงกิน 1 ส่วน
// ไม่ใช้ fade หรือ modal: แผงอื่นถูกบีบ ไม่ได้หายไป ผู้ใช้ยังเห็นทั้ง 11 เฉดตลอดเวลา
const GROW_ACTIVE = 2.6;
const GROW_IDLE = 1;

/** §3: สลับชิ้นถัดไปทุก ~1.4 วินาทีตอน hover — AC ข้อ 5 ให้เวลาไว้ 3 วินาที */
const CYCLE_MS = 1400;

/** เดสก์ท็อปเท่านั้น: มือถือตัด parallax + การสลับอัตโนมัติทิ้งทั้งคู่ (§3, ความเสี่ยง §5 ข้อ 1) */
const DESKTOP = '(min-width: 768px)';
const NO_REDUCE = '(prefers-reduced-motion: no-preference)';

/**
 * เงา/แสงขอบรอบสินค้า ให้แยกออกจากแผงที่มันลอยอยู่
 *
 * ปัญหาที่เจอตอนวัดจริง: ก๊อกดำด้านบนแผงดำด้านแทบมองไม่เห็น ซึ่งทำลายเหตุผล
 * ทั้งหมดของการเอาสินค้าขึ้นแผง — แผงที่ควรบอกว่า "เฉดนี้มีของแบบไหน" กลับว่างเปล่า
 * ที่สุดในสายตาผู้ใช้ เป็นปัญหาชนิดเดียวกับที่ scrim solver แก้ให้ตัวอักษร
 * แค่คราวนี้เป็นรูปไม่ใช่ตัวหนังสือ
 *
 * ไม่ใช้ threshold ดักเฉพาะแผงดำ (ซึ่งก็คือ hard-code หนึ่งเคสโดยอ้อม):
 * ทิศของเงาสวนทางกับความสว่างของแผงเสมอ แผงมืดได้แสงขอบ แผงสว่างได้เงา
 * ความแรงผันตามระยะห่างจากกลางสเกล ยกกำลัง 1.6 เพื่อให้แผงโทนกลาง (2MB ที่ 0.449)
 * แทบไม่ได้อะไรเลย ส่วนแผงสุดขั้ว (BL 0.014 · NA 0.896) ได้เต็ม
 * ทิศทางแบบนี้ทำให้ contrast แย่ลงไม่ได้ในเชิงนิยาม
 *
 * drop-shadow เดินตามช่องอัลฟาของ PNG จึงได้ขอบตามรูปทรงสินค้าจริง
 * ไม่ใช่กล่องสี่เหลี่ยม (งานลอกพื้นขาวได้ใช้อีกที) และเป็น filter จึงไม่แตะ layout
 */
function productHalo(lum: number): string {
  const distance = Math.abs(lum - 0.5);
  const alpha = Math.min(0.5, Math.max(0.05, Math.pow(distance, 1.6) * 1.15));
  const a = alpha.toFixed(2);
  return lum < 0.5
    ? `drop-shadow(0 0 12px rgba(255,255,255,${a})) drop-shadow(0 4px 16px rgba(255,255,255,${a}))`
    : `drop-shadow(0 8px 20px rgba(0,0,0,${a}))`;
}

type FinishWallProps = {
  panels: WallPanel[];
  /**
   * 'link'   — แผงพาไปหน้า /finish/[code] (พฤติกรรมเดิมสมัยกำแพงเป็นหน้าแรก)
   * 'filter' — แผงเป็นปุ่มกรองของหน้า /products ไม่เปลี่ยนหน้า
   *
   * ลูกค้าบอกว่ากำแพงไม่สวยพอจะเป็นประตูหน้าบ้าน และมันทำหน้าที่ผิด — การเลือก
   * เฉดคือการ "กรอง" ไม่ใช่ทางเข้า กำแพงจึงย้ายมาอยู่หัวหน้าสินค้าในโหมดนี้
   */
  mode?: 'link' | 'filter';
  /** รหัสเฉดที่ถูกเลือกอยู่ (โหมด filter) */
  selected?: string | null;
  onSelect?: (code: string) => void;
  /** 'screen' = เต็มจอเหมือนเดิม · 'band' = แถบเตี้ยสำหรับวางเหนือกริดสินค้า */
  height?: 'screen' | 'band';
};

export default function FinishWall({
  panels,
  mode = 'link',
  selected = null,
  onSelect,
  height = 'screen',
}: FinishWallProps) {
  const { t, lang } = useLang();
  const isFilter = mode === 'filter';
  // แผงเป็น <a> หรือ <button> แล้วแต่โหมด — โครงข้างในเหมือนกันทุกพิกเซล
  const PanelTag = (isFilter ? 'button' : Link) as React.ElementType;
  const [active, setActive] = useState<number | null>(null);
  // roving tabindex: มี anchor เดียวที่ tab เข้าถึงได้ ลูกศรย้ายโฟกัสภายในกำแพง
  // รูปแบบเดียวกับ FinishSwatches เพื่อให้ผู้ใช้คีย์บอร์ดเจอพฤติกรรมเดิมทั้งเว็บ
  const [roving, setRoving] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const section = useRef<HTMLElement>(null);
  const driftRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const parallaxRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /** ชิ้นที่แต่ละแผงกำลังแสดง — เดินเลขเฉพาะแผงที่ hover อยู่ */
  const [cycles, setCycles] = useState<number[]>(() => panels.map(() => 0));

  // เดสก์ท็อป + ไม่ใช่ reduced-motion เท่านั้นถึงจะขยับ
  const [motionOk, setMotionOk] = useState(false);
  // กำแพงยังอยู่ในจอไหม — เลื่อนพ้นแล้วต้องหยุดทุก timer (AC ข้อ 7)
  const [onScreen, setOnScreen] = useState(true);
  const animate = motionOk && onScreen;

  const focusAt = useCallback((i: number) => {
    const n = refs.current.length;
    const next = ((i % n) + n) % n;
    setRoving(next);
    refs.current[next]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      // Enter/Space ปล่อยผ่านให้ anchor จัดการเอง — ไม่ดักไว้เอง
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusAt(i + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusAt(i - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusAt(0);
          break;
        case 'End':
          e.preventDefault();
          focusAt(refs.current.length - 1);
          break;
      }
    },
    [focusAt],
  );

  // ── เงื่อนไขว่าจะขยับไหม ─────────────────────────────────────────────────
  // ฟังการเปลี่ยนแปลงด้วย ไม่ใช่อ่านครั้งเดียวตอน mount: ผู้ใช้ย่อหน้าต่างข้าม
  // breakpoint หรือเปิด reduce motion กลางคันแล้วต้องมีผลทันที ไม่ใช่รอรีโหลด
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const noReduce = window.matchMedia(NO_REDUCE);
    const sync = () => setMotionOk(desktop.matches && noReduce.matches);
    sync();
    desktop.addEventListener('change', sync);
    noReduce.addEventListener('change', sync);
    return () => {
      desktop.removeEventListener('change', sync);
      noReduce.removeEventListener('change', sync);
    };
  }, []);

  // ── หยุดทุกอย่างเมื่อกำแพงพ้นจอ (ความเสี่ยง §5 ข้อ 1) ─────────────────────
  useEffect(() => {
    const el = section.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      // เผื่อความสูง Nav ที่ทับอยู่ ไม่งั้นแถบสุดท้ายของกำแพงยัง "intersect"
      // ทั้งที่ถูกเมนูบังจนมองไม่เห็นแล้ว
      rootMargin: '-64px 0px 0px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── ลอยขึ้นลง เฟสต่างกันทุกแผง (AC ข้อ 4) + parallax ตอน scroll ──────────
  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = section.current;
    if (!root) return;

    const mm = gsap.matchMedia(root);
    mm.add(`${NO_REDUCE} and ${DESKTOP}`, () => {
      const drifts = driftRefs.current.filter(Boolean) as HTMLSpanElement[];
      const n = drifts.length || 1;

      const tweens = drifts.map((el, i) => {
        const tw = gsap.to(el, {
          yPercent: -7,
          // คาบไม่เท่ากันด้วย ไม่ใช่แค่เฟส — ถ้าคาบเท่ากันทั้ง 11 แผงจะค่อย ๆ
          // กลับมาตรงกันเองในที่สุด แล้วก็ดูเป็นหน้าจอค้างอีก
          duration: 3 + i * 0.19,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        // เฟสเริ่มต้นต่างกัน บวก 0.5 เพื่อไม่ให้แผงไหนเริ่มที่ progress 0 พอดี
        // (progress 0 = transform เป็น identity ซึ่งอ่านยากว่าตั้งใจหรือยังไม่เริ่ม)
        tw.progress(((i + 0.5) / n) % 1);
        return tw;
      });

      // parallax รายแผง: เลื่อนออกคนละความเร็ว "ตามคอลัมน์" (§3)
      // ค่า (i * 7) % 11 ให้ลำดับที่ไม่ซ้ำเป็นคาบสั้น ๆ แผงข้างกันจึงไม่ไปด้วยกัน
      const parallax = parallaxRefs.current.filter(Boolean).map((el, i) =>
        gsap.fromTo(
          el,
          { yPercent: 0 },
          {
            yPercent: -(10 + ((i * 7) % 11) * 3),
            ease: 'none',
            scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
          },
        ),
      );

      return () => {
        tweens.forEach((tw) => tw.kill());
        parallax.forEach((p) => {
          p.scrollTrigger?.kill();
          p.kill();
        });
      };
    });

    return () => mm.revert();
  }, [panels.length]);

  // หยุด/เดินต่อ tween ลอย ตามการมองเห็น — kill ไม่ได้เพราะต้องกลับมาเล่นต่อได้
  useEffect(() => {
    const drifts = driftRefs.current.filter(Boolean) as HTMLSpanElement[];
    drifts.forEach((el) => {
      gsap.getTweensOf(el).forEach((tw) => (onScreen ? tw.play() : tw.pause()));
    });
  }, [onScreen]);

  // ── สลับชิ้นตอน hover/focus (AC ข้อ 5) ───────────────────────────────────
  // timer เดียวสำหรับแผงที่ active เท่านั้น ไม่ใช่ 11 timer พร้อมกัน
  useEffect(() => {
    if (active === null || !animate) return;
    const id = window.setInterval(() => {
      setCycles((cs) => {
        const next = [...cs];
        next[active] = (next[active] ?? 0) + 1;
        return next;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [active, animate]);

  return (
    <>
      <section
        ref={section}
        aria-label={t.wall.label}
        // มือถือ: ปล่อยให้หน้าเลื่อนเอง ไม่สร้าง scroll container ซ้อน
        // (เวอร์ชันแรกใส่ overflow-y-auto ที่ ul แล้วได้ scrollbar ของตัวเอง
        //  กินความกว้างไป 31px แผงจึงไม่เต็มจอและมีแถบสว่างค้างขอบขวา)
        className={`relative w-full overflow-clip ${height === 'band' ? 'min-h-[420px] md:h-[58svh]' : 'min-h-[560px] md:h-[100svh]'}`}
      >
        {/* ป้ายบอกวิธีใช้ — micro-caps สั้น ๆ ไม่ใช่พาดหัวโฆษณา ตาม §4.1
            วางใต้ Nav ที่ layout เรนเดอร์ทับอยู่ (สูง ~64px) ไม่ใช่ที่ top-0
            ไม่งั้นข้อความชนโลโก้และเมนู ซึ่งเกิดขึ้นจริงในรอบแรก */}
        {/* โหมด filter: หน้า /products เขียนหัวข้อและวิธีใช้ไว้เหนือกำแพงเองแล้ว
            และคำใบ้เดิม ("ENTER เข้า") ก็ผิดความจริงในโหมดนี้ — Enter สลับตัวกรอง
            ไม่ได้พาไปไหน จึงไม่แสดงแถบนี้ซ้ำ */}
        {!isFilter && (
          <header className="pointer-events-none absolute inset-x-0 top-[64px] z-20 flex items-center justify-between px-6 py-4 md:px-10">
            <span className="micro">{t.wall.hint}</span>
            <span className="micro hidden md:inline">{t.wall.keyHint}</span>
          </header>
        )}

        {/* เดสก์ท็อป: แถวเดียว 11 แผงเต็มจอ · มือถือ: ซ้อนแนวตั้ง แผงละ ~1/3 จอ (§4.1) */}
        <ul className="flex w-full flex-col md:h-full md:flex-row">
          {panels.map((p, i) => {
            const isActive = active === i;
            return (
              <li
                key={p.code}
                // Preloader อ่าน [data-wall-panel] img[data-panel-front] จาก DOM นี้
                // เพื่อประกอบแกลเลอรี — ดูเหตุผลในไฟล์นั้น (AC ข้อ 2)
                data-wall-panel={p.code}
                className="relative min-h-[33svh] shrink-0 md:min-h-0 md:shrink"
                style={{
                  // flex-grow คือตัวขยาย/บีบ — transition อยู่ที่ flex-grow อย่างเดียว
                  // ไม่แตะ width/height จึงไม่เกิด layout thrash ระหว่างทาง
                  flexGrow: isActive ? GROW_ACTIVE : GROW_IDLE,
                  flexBasis: 0,
                  transition: 'flex-grow 620ms cubic-bezier(0.22, 1, 0.36, 1)',
                  borderInlineEnd: `1px solid ${p.scrim.edge}`,
                }}
              >
                {/* โหมด filter ใช้ <button> ไม่ใช่ <a>: มันไม่พาไปไหน มันสลับตัวกรอง
                    ของหน้าเดียวกัน ปุ่มจึงเป็นความหมายที่ถูกต้องและได้ aria-pressed
                    มาให้ฟรี — ส่วน roving tabindex กับลูกศรใช้ตัวเดียวกันทั้งสองโหมด */}
                <PanelTag
                  ref={(el: HTMLElement | null) => {
                    refs.current[i] = el;
                  }}
                  {...(isFilter
                    ? {
                        type: 'button' as const,
                        'aria-pressed': selected === p.code,
                        onClick: () => onSelect?.(p.code),
                      }
                    : {
                        // ต้องมี trailing slash: next.config ตั้ง trailingSlash: true และ
                        // static export เขียนไฟล์เป็น out/finish/<code>/index.html
                        // ลิงก์ที่ไม่มี slash จะ 404 บน static host เหมือนทุกลิงก์อื่นในเว็บนี้
                        href: `/finish/${encodeURIComponent(p.code)}/`,
                      })}
                  tabIndex={roving === i ? 0 : -1}
                  onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, i)}
                  onFocus={() => {
                    setRoving(i);
                    setActive(i);
                  }}
                  onBlur={() => setActive((cur) => (cur === i ? null : cur))}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
                  // .focus-inset, not the global outline: the ring has to read on
                  // both the near-white `0` panel and the near-black `BL` one, and
                  // a single ink outline is 1.02:1 on Matte Black — invisible on
                  // exactly the panel the scrim solver already flagged (AC 4).
                  className={`focus-inset group relative flex h-full w-full flex-col justify-end text-start ${
                    selected === p.code ? 'ring-2 ring-inset ring-ink' : ''
                  }`}
                >
                  {/* สนามวัสดุ: swatch ขยายเต็มแผง ไม่ใช่ chip
                      ขยาย 1.06 ตอน active เพื่อให้วัสดุ "ขยับ" ไม่ใช่แค่ช่องกว้างขึ้น */}
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${p.material})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transform: isActive ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />

                  {/* lift: ชั้น ink บาง ๆ ทาแผงที่จมกับพื้น #E5E5E5 ให้เห็นเป็นวัตถุ
                      ธีมสว่างพลิกทิศ — ตัวที่จมคือแผงขาว (`0`) ไม่ใช่ Matte Black
                      แผงมืดจึงได้ liftAlpha = 0 และไม่มี layer นี้เลย */}
                  {p.scrim.lift !== 'none' && (
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{ backgroundColor: p.scrim.lift }}
                    />
                  )}

                  {/* สินค้าจริงในเฉดนี้ — วางไว้ช่วงบนของแผง ใต้ veil เสมอ
                      ถ้าอยู่เหนือ veil รูปจะทับโซนป้ายแล้วการรับประกัน contrast
                      ที่ solver คำนวณไว้ก็หมดความหมายทันที */}
                  <span
                    data-parallax
                    ref={(el) => {
                      parallaxRefs.current[i] = el;
                    }}
                    aria-hidden
                    className="absolute inset-x-0 top-[10%] bottom-[32%]"
                  >
                    <span
                      data-drift
                      ref={(el) => {
                        driftRefs.current[i] = el;
                      }}
                      className="absolute inset-0 block"
                    >
                      <span
                        data-lift
                        className="absolute inset-0 block origin-center transition-transform duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                          transform: isActive ? 'translateY(-6%) scale(1.16)' : 'none',
                          filter: productHalo(p.scrim.lum),
                        }}
                      >
                        <PanelProduct
                          items={p.products}
                          index={cycles[i] ?? 0}
                          lang={lang}
                          className="absolute inset-0"
                        />
                      </span>
                    </span>
                  </span>

                  {/* veil: ชั้นสีพื้นใต้ป้าย ทึบเต็มที่ตั้งแต่ 74% ลงไป
                      ป้ายจึงนั่งบน alpha เต็มเสมอ ไม่ใช่บนช่วงไล่ที่ contrast ยังไม่ถึง */}
                  {p.scrim.veil !== 'none' && (
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{ backgroundImage: p.scrim.veil }}
                    />
                  )}

                  {/* วงแหวนโฟกัส ต้องเป็น "ลูก" ไม่ใช่ box-shadow ของตัว <a> เอง
                      เงาของ element ถูกวาดในชั้นพื้นหลังของมัน ซึ่งอยู่ใต้ลูกทุกตัวที่
                      position:absolute — สี่ชั้นข้างบน (material/lift/product/veil)
                      จึงกลบมันหมด QA วัดได้ 1.01–1.13:1 บนทั้ง 11 แผง คือไม่มีวงเลย
                      ดู [data-focus-ring] ใน globals.css */}
                  <span aria-hidden data-focus-ring />

                  <span className="relative z-10 flex flex-col gap-1 p-5 md:p-6">
                    {/* เดสก์ท็อป: ชื่อเฉดตั้งฉาก เพราะแผงแคบกว่าชื่อเสมอตอนไม่ active
                        แนวตั้งอ่านได้จริง ต่างจากการย่อฟอนต์จนอ่านไม่ออกหรือ truncate */}
                    <span
                      className="font-display text-label font-semibold uppercase tracking-widest2 md:[writing-mode:vertical-rl] md:group-hover:[writing-mode:horizontal-tb] md:group-focus-visible:[writing-mode:horizontal-tb]"
                      style={{ color: p.scrim.ink }}
                    >
                      {lang === 'th' ? p.name.th : p.name.en}
                    </span>
                    {/* เคยเป็น opacity 0.62 ซึ่งเป็นค่าที่จูนไว้ตอนตัวอักษรเป็นครีมบนพื้นดำ
                        solver รับประกัน contrast ไว้ที่ ink "เต็มค่า" เท่านั้น (LABEL_TARGET = 7)
                        พอหรี่เหลือ 0.62 การรับประกันนั้นหลุดทันที — วัดได้ 4.11:1
                        ลำดับสายตาย้ายไปอยู่ที่น้ำหนัก (ชื่อ 600 / จำนวน 500) แทนความจาง
                        แบบนั้นไม่แลกกับ contrast */}
                    <span className="micro" style={{ color: p.scrim.ink }}>
                      {t.finish.pieces(p.count)}
                    </span>
                  </span>
                </PanelTag>
              </li>
            );
          })}
        </ul>
      </section>

      {/* กำแพงหดเป็นแถบบางค้างบนสุด ทำหน้าที่นำทางต่อหลังเลื่อนผ่าน (§3)
          เดสก์ท็อปเท่านั้น: ที่ 390px กำแพงเป็นแผงเต็มความกว้าง 11 แผงที่เลื่อนผ่าน
          อยู่แล้ว การเอาแถบมาแปะทับอีกชั้นกินความสูงที่มีจำกัดโดยไม่ได้เพิ่มอะไร

          อยู่ในสายเลย์เอาต์ปกติ ไม่ fixed และไม่ sticky
          ของเดิมเป็น fixed จึงไม่กินที่เลย แถบเลยบังเนื้อหาราว 40px ตลอดเวลาและ
          ตัดหัวข้อ "ให้เราช่วยสร้างครัวในฝันของคุณ" ทิ้งครึ่งบรรทัด (shots/l-footer.png)

          ลอง sticky แล้วยังไม่พอ: sticky จองที่ไว้เฉพาะ "ตำแหน่งเดิม" ของมัน
          พอเกาะขอบบนแล้วมันก็ยังลอยทับสิ่งที่เลื่อนผ่านใต้มันอยู่ดี — วัดแล้วยังทับ
          ย่อหน้าในบล็อกจานสีอีก 5 ย่อหน้า แถบบนที่ตรึงไว้ *ต้อง* บังเนื้อหาเสมอ
          นั่นคือธรรมชาติของมัน หน้านี้มี Nav ตรึงอยู่แล้ว 64px การเพิ่มอีก 42px
          ทำให้เนื้อหาถูกบังรวม 106px ซึ่งมากเกินไป

          จึงเลือก "คืนพื้นที่ให้หน้า": แถบกินที่ 42px ของตัวเองใต้กำแพงพอดี เลื่อนไป
          กับหน้า และไม่ทับอะไรเลยสักพิกเซล แลกกับการที่มันไม่ตรึงค้างบนสุดอีกต่อไป
          — ตัวนำทางที่ตรึงจริง ๆ คือ Nav ซึ่งมีอยู่แล้ว ส่วนแถบนี้ทำหน้าที่เป็น
          "กำแพงฉบับย่อ" ที่ผู้ใช้เจอทันทีหลังเลื่อนพ้นกำแพง */}
      {/* แถบย่อเป็นตัวนำทางต่อจากกำแพงเต็มจอ — ในโหมด filter กำแพงเตี้ยอยู่แล้ว
          และอยู่ติดกับกริดที่มันกรอง การซ้ำอีกแถบไม่ได้เพิ่มอะไรนอกจากความสูง */}
      {!isFilter && (
      <>
      {/* หมายเหตุ: ใช้เงื่อนไขเรนเดอร์ ไม่ใช่ attribute `hidden` — คลาส md:block
          ของ Tailwind ชนะ display:none ที่มากับ attribute แถบจึงยังโผล่บนเดสก์ท็อป */}
      <div
        data-condensed-wall
        className="relative z-30 hidden border-y border-line bg-base md:block"
      >
        <ul className="flex h-10 w-full">
          {panels.map((p) => (
            <li key={p.code} className="relative h-full flex-1">
              <Link
                href={`/finish/${encodeURIComponent(p.code)}/`}
                className="focus-inset group relative block h-full w-full"
                style={{
                  backgroundImage: `url(${p.material})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* แถบนี้วางภาพวัสดุไว้บนตัว <a> เอง เงา inset จึงไม่ถูกกลบเหมือนบนกำแพง
                    แต่ป้ายชื่อที่โผล่ตอนโฟกัสเป็น absolute และทับแถบล่างของวงแหวน
                    ใช้ตัวเดียวกับกำแพงจะได้ไม่ต้องจำว่าที่ไหนพึ่งกลไกไหน */}
                <span aria-hidden data-focus-ring />
                <span className="sr-only">
                  {lang === 'th' ? p.name.th : p.name.en} — {t.finish.pieces(p.count)}
                </span>
                {/* ชื่อโผล่ตอน hover เท่านั้น — แถบสูง 40px ใส่ชื่อ 11 ชื่อพร้อมกันไม่ได้
                    แต่ต้องมีทางรู้ว่าแถบไหนคืออะไรโดยไม่ต้องเดาจากสี */}
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center truncate px-1 pb-1 text-center text-label font-semibold uppercase group-hover:flex group-focus-visible:flex"
                  style={{ color: p.scrim.ink }}
                >
                  {lang === 'th' ? p.name.th : p.name.en}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      </>
      )}
    </>
  );
}
