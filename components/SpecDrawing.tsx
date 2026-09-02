'use client';

// แบบแปลนบอกระยะ — วาดจากค่าที่มีอยู่แล้วใน specs ไม่ฝัง PDF ของ Kohler
//
// ข้อมูลจริงจาก scraper อยู่ในรูป "H 368 มิลลิเมตร, W 60 มิลลิเมตร" เป็นส่วนใหญ่
// บางชิ้นเป็น "ขนาด: 700x500 มม." หรือ "(L x W x H) 686 X 423 X 213 mm"
// และบางชิ้นไม่มีตัวเลขเลย (เจอค่าเป็น "Installation Instruction")
//
// **ไม่มีระยะ = ไม่ render อะไรเลย** ไม่ใช่กรอบเปล่า — สเปกสั่งไว้ตรง ๆ
//
// เส้นวาดตัวเองตอน scroll ด้วย strokeDashoffset · reduced-motion = ขึ้นครบทันที

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLang } from './LangProvider';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type Dimensions = { w: number; h: number; d?: number };

type Spec = { label: string; value: string };

/**
 * ดึงกว้าง/สูง/ลึก (มม.) ออกจาก specs
 * คืน null เมื่อหาไม่เจอ ผู้เรียกจะได้ไม่ render section ทิ้งไว้
 */
export function parseDimensions(specs: Spec[]): Dimensions | null {
  for (const s of specs) {
    const v = s.value;

    // รูปแบบหลัก: "H 368 มิลลิเมตร, W 60 มิลลิเมตร" (อาจมี D ด้วย)
    const h = v.match(/\bH\s*([\d.]+)/i);
    const w = v.match(/\bW\s*([\d.]+)/i);
    const d = v.match(/\bD\s*([\d.]+)/i);
    if (h && w) {
      const dims = { w: parseFloat(w[1]), h: parseFloat(h[1]), d: d ? parseFloat(d[1]) : undefined };
      if (dims.w > 0 && dims.h > 0) return dims;
    }

    // รูปแบบรอง: "700x500 มม." หรือ "686 X 423 X 213 mm"
    const x = v.match(/([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*[x×]\s*([\d.]+))?/i);
    if (x) {
      const a = parseFloat(x[1]);
      const b = parseFloat(x[2]);
      const c = x[3] ? parseFloat(x[3]) : undefined;
      // สองตัวแรกคือกว้าง x ลึก/สูง — ถ้ามีสามตัวถือว่า L x W x H
      if (a > 0 && b > 0) return c ? { w: a, h: c, d: b } : { w: a, h: b };
    }
  }
  return null;
}

type Props = {
  specs: Spec[];
  title?: string;
  className?: string;
};

// ── ป้ายของแบบแปลนเป็น "ข้อความอินเทอร์เฟซ" ไม่ใช่ข้อมูลสินค้า (task E1) ──────
//
// ทั้งบล็อกนี้เคยเป็นภาษาเดียว และเป็นคนละภาษากันเองด้วย: หน่วยเป็นไทยฝังไว้เป็น
// ค่า default ของ prop (`unit = 'มม.'` ซึ่งไม่มีใครส่งค่าอื่นมาเลยสักที่)
// aria-label เป็นประโยคไทยเต็มประโยค ส่วนหัวคอลัมน์ WIDTH/HEIGHT/DEPTH เป็น
// อังกฤษฝังไว้ ผลคือหน้าอังกฤษพิมพ์ "454 มม." ใต้หัวข้อ "DIMENSIONS" — QA-F5
// นับได้ 288 ช่วงข้อความไทยกับ aria-label ไทยอีก 122 อัน ทั้งหมดจากบล็อกเดียวนี้
//
// "มม." กับ "mm" เป็นคำเดียวกันที่มีฉบับอังกฤษอยู่จริง จึงเป็นบั๊ก ไม่ใช่ fallback
// ที่ยอมรับได้ — ไม่มีอะไรให้ติดป้าย lang มีแต่คำที่ต้องเลือกให้ถูกภาษา
const UNIT = { th: 'มม.', en: 'mm' } as const;
const AXES = {
  th: { w: 'กว้าง', h: 'สูง', d: 'ลึก' },
  en: { w: 'WIDTH', h: 'HEIGHT', d: 'DEPTH' },
} as const;
const DRAWING_LABEL = {
  th: (w: number, h: number, d: number | undefined, u: string) =>
    `ขนาดโดยประมาณ กว้าง ${w} สูง ${h}${d ? ` ลึก ${d}` : ''} ${u}`,
  en: (w: number, h: number, d: number | undefined, u: string) =>
    `Approximate dimensions: ${w} wide, ${h} high${d ? `, ${d} deep` : ''}, in ${u}`,
} as const;

export default function SpecDrawing({ specs, title, className = '' }: Props) {
  const { lang } = useLang();
  const unit = UNIT[lang];
  const root = useRef<HTMLDivElement>(null);
  const dims = parseDimensions(specs);

  useIsoLayoutEffect(() => {
    if (!dims) return;
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const strokes = el.querySelectorAll<SVGGeometryElement>('[data-draw]');
      const labels = el.querySelectorAll<SVGTextElement>('[data-draw-label]');

      strokes.forEach((s) => {
        const len = s.getTotalLength();
        gsap.set(s, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.set(labels, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top 78%', once: true },
      });
      tl.to(strokes, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: 'power2.inOut',
        stagger: 0.08,
      }).to(labels, { opacity: 1, duration: 0.4, stagger: 0.06 }, '-=0.4');
    });

    return () => mm.revert();
  }, [dims?.w, dims?.h, dims?.d]);

  // ไม่มีระยะ = ไม่ต้องมี section
  if (!dims) return null;

  // กล่องวาดตามสัดส่วนจริง สูงสุด 320 หน่วยในแกนที่ยาวกว่า
  const MAX = 320;
  const scale = MAX / Math.max(dims.w, dims.h);
  const bw = Math.round(dims.w * scale);
  const bh = Math.round(dims.h * scale);

  // ขอบขวากว้างกว่าด้านอื่น เพราะต้องวางตัวเลขความสูงต่อจากเส้นบอกระยะ
  // ถ้าใช้ค่าเท่ากันทุกด้าน ตัวเลขจะถูก viewBox ตัด (เจอจริง: "286 ม." แหว่ง)
  const PAD = 78;
  const PAD_R = 128;
  const vbW = bw + PAD + PAD_R;
  const vbH = bh + PAD * 2;
  const x0 = PAD;
  const y0 = PAD;
  const x1 = x0 + bw;
  const y1 = y0 + bh;

  const dimY = y1 + 34; // เส้นบอกระยะแนวนอน อยู่ใต้กล่อง
  const dimX = x1 + 34; // เส้นบอกระยะแนวตั้ง อยู่ขวากล่อง
  const TICK = 5;

  return (
    <section ref={root} className={`border-t border-line-6 ${className}`}>
      <p className="micro mb-8">{title ?? 'DIMENSIONS'}</p>

      {/* คุมด้วยความสูง ไม่ใช่ความกว้าง — สินค้าทรงสูงแคบ (เช่น 810 x 60 มม.)
          ถ้าปล่อย w-full ภาพจะยืดสูงเป็นพันพิกเซล (วัดได้ 576x1306) */}
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="h-[340px] w-auto max-w-full"
        role="img"
        // aria-label ติดป้าย lang ไม่ได้ (มันเป็น attribute) ภาษาของมันจึงต้อง
        // ตรงกับเอกสารตั้งแต่ตอนเลือกคำ ไม่ใช่ตอนมาร์กอัป
        aria-label={DRAWING_LABEL[lang](dims.w, dims.h, dims.d, unit)}
      >
        {/* กรอบตัววัตถุ */}
        <rect
          data-draw
          x={x0}
          y={y0}
          width={bw}
          height={bh}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          opacity="0.85"
        />

        {/* เส้นต่อออกมาหาเส้นบอกระยะ */}
        <path data-draw d={`M ${x0} ${y1} L ${x0} ${dimY + 8}`} stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${x1} ${y1} L ${x1} ${dimY + 8}`} stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${x1} ${y0} L ${dimX + 8} ${y0}`} stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${x1} ${y1} L ${dimX + 8} ${y1}`} stroke="rgba(0,0,0,0.22)" strokeWidth="1" fill="none" />

        {/* เส้นบอกระยะกว้าง */}
        <path data-draw d={`M ${x0} ${dimY} L ${x1} ${dimY}`} stroke="#232323" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${x0} ${dimY - TICK} L ${x0} ${dimY + TICK}`} stroke="#232323" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${x1} ${dimY - TICK} L ${x1} ${dimY + TICK}`} stroke="#232323" strokeWidth="1" fill="none" />

        {/* เส้นบอกระยะสูง */}
        <path data-draw d={`M ${dimX} ${y0} L ${dimX} ${y1}`} stroke="#232323" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${dimX - TICK} ${y0} L ${dimX + TICK} ${y0}`} stroke="#232323" strokeWidth="1" fill="none" />
        <path data-draw d={`M ${dimX - TICK} ${y1} L ${dimX + TICK} ${y1}`} stroke="#232323" strokeWidth="1" fill="none" />

        <text
          data-draw-label
          x={(x0 + x1) / 2}
          y={dimY + 20}
          textAnchor="middle"
          fill="#232323"
          fontSize="15"
        >
          {dims.w} {unit}
        </text>
        <text
          data-draw-label
          x={dimX + 16}
          y={(y0 + y1) / 2}
          dominantBaseline="middle"
          fill="#232323"
          fontSize="15"
        >
          {dims.h} {unit}
        </text>
      </svg>

      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="micro">{AXES[lang].w}</dt>
          <dd className="mt-1 text-body-sm font-normal text-ink">{dims.w} {unit}</dd>
        </div>
        <div>
          <dt className="micro">{AXES[lang].h}</dt>
          <dd className="mt-1 text-body-sm font-normal text-ink">{dims.h} {unit}</dd>
        </div>
        {dims.d ? (
          <div>
            <dt className="micro">{AXES[lang].d}</dt>
            <dd className="mt-1 text-body-sm font-normal text-ink">{dims.d} {unit}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
