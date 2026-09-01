'use client';

// กำแพงผิวเคลือบ = หน้าแรก (spec finish-first §4.1)
//
// นี่คือกิมมิกของทั้งเว็บ: เว็บนำทางด้วยผิวเคลือบ ไม่ใช่หมวดสินค้า
// หน้าแรกจึงไม่มี hero heading และไม่มี category nav — ผู้ใช้เจอวัสดุก่อนเจอคำ
//
// ข้อบังคับจากสเปกที่ห้ามละเมิด:
//   - ห้ามมีอะไรบนหน้านี้เด่นแข่งกับกำแพง (จึงไม่มี ModelNumber ที่นี่ §4.3)
//   - แผงต้องเป็น "สนามวัสดุ" เต็มพื้นที่ ไม่ใช่วงกลม chip เล็ก ๆ
//   - scrim คำนวณต่อแผงจากความสว่างของ swatch ตัวเอง ไม่ใช่ค่า overlay ค่าเดียว
//     (ความเสี่ยง §6 ข้อ 1 — แผงขาวกับแผงดำพังคนละทาง)

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import type { PanelScrim } from './finish-index';

export type WallPanel = {
  code: string;
  name: { th: string; en: string };
  count: number;
  material: string;
  accent: string;
  scrim: PanelScrim;
};

// สัดส่วนการขยายตอน hover/focus — แผงที่ถูกเลือกกิน 2.6 ส่วน อีก 10 แผงกิน 1 ส่วน
// ไม่ใช้ fade หรือ modal: แผงอื่นถูกบีบ ไม่ได้หายไป ผู้ใช้ยังเห็นทั้ง 11 เฉดตลอดเวลา
const GROW_ACTIVE = 2.6;
const GROW_IDLE = 1;

export default function FinishWall({ panels }: { panels: WallPanel[] }) {
  const { t, lang } = useLang();
  const [active, setActive] = useState<number | null>(null);
  // roving tabindex: มี anchor เดียวที่ tab เข้าถึงได้ ลูกศรย้ายโฟกัสภายในกำแพง
  // รูปแบบเดียวกับ FinishSwatches เพื่อให้ผู้ใช้คีย์บอร์ดเจอพฤติกรรมเดิมทั้งเว็บ
  const [roving, setRoving] = useState(0);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

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

  return (
    <section
      aria-label={t.wall.label}
      // มือถือ: ปล่อยให้หน้าเลื่อนเอง ไม่สร้าง scroll container ซ้อน
      // (เวอร์ชันแรกใส่ overflow-y-auto ที่ ul แล้วได้ scrollbar ของตัวเอง
      //  กินความกว้างไป 31px แผงจึงไม่เต็มจอและมีแถบสว่างค้างขอบขวา)
      className="relative min-h-[560px] w-full overflow-clip md:h-[100svh]"
    >
      {/* ป้ายบอกวิธีใช้ — micro-caps สั้น ๆ ไม่ใช่พาดหัวโฆษณา ตาม §4.1
          วางใต้ Nav ที่ layout เรนเดอร์ทับอยู่ (สูง ~64px) ไม่ใช่ที่ top-0
          ไม่งั้นข้อความชนโลโก้และเมนู ซึ่งเกิดขึ้นจริงในรอบแรก */}
      <header className="pointer-events-none absolute inset-x-0 top-[64px] z-20 flex items-center justify-between px-6 py-4 md:px-10">
        <span className="micro">{t.wall.hint}</span>
        <span className="micro hidden md:inline">{t.wall.keyHint}</span>
      </header>

      {/* เดสก์ท็อป: แถวเดียว 11 แผงเต็มจอ · มือถือ: ซ้อนแนวตั้ง แผงละ ~1/3 จอ (§4.1) */}
      <ul className="flex w-full flex-col md:h-full md:flex-row">
        {panels.map((p, i) => {
          const isActive = active === i;
          return (
            <li
              key={p.code}
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
              <Link
                ref={(el) => {
                  refs.current[i] = el;
                }}
                href={`/finish/${encodeURIComponent(p.code)}`}
                tabIndex={roving === i ? 0 : -1}
                onKeyDown={(e) => onKeyDown(e, i)}
                onFocus={() => {
                  setRoving(i);
                  setActive(i);
                }}
                onBlur={() => setActive((cur) => (cur === i ? null : cur))}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
                className="group relative flex h-full w-full flex-col justify-end outline-offset-[-4px]"
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

                {/* lift: แผงที่มืดจนจมกับพื้น #08090A ถูกยกขึ้นให้เห็นเป็นวัตถุ
                    แผงสว่างได้ liftAlpha = 0 จึงไม่มี layer นี้เลย */}
                {p.scrim.lift !== 'none' && (
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{ backgroundColor: p.scrim.lift }}
                  />
                )}

                {/* veil: ชั้นมืดใต้ป้าย ทึบเต็มที่ตั้งแต่ 74% ลงไป
                    ป้ายจึงนั่งบน alpha เต็มเสมอ ไม่ใช่บนช่วงไล่ที่ contrast ยังไม่ถึง */}
                {p.scrim.veil !== 'none' && (
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{ backgroundImage: p.scrim.veil }}
                  />
                )}

                <span className="relative z-10 flex flex-col gap-1 p-5 md:p-6">
                  {/* เดสก์ท็อป: ชื่อเฉดตั้งฉาก เพราะแผงแคบกว่าชื่อเสมอตอนไม่ active
                      แนวตั้งอ่านได้จริง ต่างจากการย่อฟอนต์จนอ่านไม่ออกหรือ truncate */}
                  <span
                    className="font-display text-[11px] font-medium uppercase tracking-widest2 md:[writing-mode:vertical-rl] md:group-hover:[writing-mode:horizontal-tb] md:group-focus-visible:[writing-mode:horizontal-tb]"
                    style={{ color: p.scrim.ink }}
                  >
                    {lang === 'th' ? p.name.th : p.name.en}
                  </span>
                  <span className="micro" style={{ color: p.scrim.ink, opacity: 0.62 }}>
                    {t.finish.pieces(p.count)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
