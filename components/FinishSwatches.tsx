'use client';

// แถวสวอตช์ผิวเคลือบ
//
// กติกาสำคัญ (สเปก AC ข้อ 2 + ข้อ 7):
// - **finish น้อยกว่า 2 เฉด = ไม่ render อะไรเลย** ปุ่มเดียวที่กดไปก็ไม่มีอะไรเกิดขึ้น
//   อ่านว่าเสีย ผู้เรียกไปแสดงชื่อ finish เป็น label แทน (ดู <FinishLabel />)
//   แคตตาล็อกส่วนใหญ่มีเฉดเดียว เคสนี้จึงเป็นเคสปกติ ไม่ใช่ edge case
// - roving tabindex: ทั้งแถวกิน Tab ช่องเดียว ลูกศรเดินระหว่างชิป
// - aria-pressed บอกตัวที่เลือกอยู่
// - ชื่อที่ screen reader อ่าน = ชื่อเฉด ไม่ใช่รหัส ("โครเมี่ยม" ไม่ใช่ "CP")
// - focus ring ต้องเห็นบนชิปที่เกือบขาว จึงใช้วงแหวนสองชั้น (ดำชิดขอบ + ครีมวงนอก)
//   ถ้าใช้ ring สีเดียวตาม :focus-visible กลางของ globals.css จะจมหายบนชิปโครเมี่ยม

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useFinish } from './FinishProvider';
import { useLang } from './LangProvider';

type Props = {
  className?: string;
  /** ป้ายกำกับกลุ่มสำหรับ screen reader */
  label?: string;
  /** ขนาดชิปเป็น px */
  size?: number;
};

export default function FinishSwatches({ className = '', label, size = 44 }: Props) {
  const { finishes, selected, selectedIndex, select, hasChoice } = useFinish();
  const { lang, t } = useLang();

  // ชิปที่ "รับ Tab" อยู่ตอนนี้ — ปกติคือตัวที่เลือก แต่ลูกศรย้ายได้โดยยังไม่เลือก
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shouldFocus = useRef(false);

  useEffect(() => {
    setFocusIndex(selectedIndex);
  }, [selectedIndex]);

  // ย้ายโฟกัสจริงเฉพาะตอนที่ผู้ใช้กดลูกศร ไม่ใช่ตอน re-render ทั่วไป
  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    refs.current[focusIndex]?.focus();
  }, [focusIndex]);

  // ต้องอยู่หลัง hooks ทั้งหมด — hooks ห้ามอยู่หลัง early return
  if (!hasChoice) return null;

  const move = (next: number) => {
    const i = (next + finishes.length) % finishes.length;
    shouldFocus.current = true;
    setFocusIndex(i);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(i + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(i - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(finishes.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="group"
      aria-label={label ?? t.common.chooseFinish}
      // p-1 เผื่อที่ให้วงแหวนโฟกัสวงนอก (box-shadow 4px) ไม่ให้โดนตัด
      // ถ้า caller ครอบด้วย overflow-hidden หรือชนขอบคอนเทนเนอร์
      className={`flex flex-wrap items-center gap-3 p-1 ${className}`}
    >
      {finishes.map((f, i) => {
        const isOn = f.code === selected?.code;
        return (
          <button
            key={f.code}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            // roving tabindex: มีแค่ตัวเดียวที่ค่าเป็น 0
            tabIndex={i === focusIndex ? 0 : -1}
            aria-pressed={isOn}
            // ชื่อที่อ่านออกเสียงคือชื่อเฉด ไม่ใช่รหัส
            aria-label={f.name[lang]}
            title={f.name[lang]}
            onClick={() => select(f.code)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onFocus={() => setFocusIndex(i)}
            style={{ width: size, height: size }}
            className={[
              'relative shrink-0 overflow-hidden rounded-full transition-transform duration-300',
              'hover:scale-110',
              // วงแหวนสองชั้นตอนโฟกัส: เส้นดำชิดขอบชิปกันชิปขาวกลืนกับวงนอก
              'focus-visible:outline-none',
              'focus-visible:shadow-[0_0_0_2px_#08090A,0_0_0_4px_#EDE9E3]',
              isOn ? 'ring-2 ring-cream ring-offset-2 ring-offset-base' : 'ring-1 ring-line-12',
            ].join(' ')}
          >
            <Image
              src={f.swatch}
              alt=""
              width={size}
              height={size}
              sizes={`${size}px`}
              className="h-full w-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * ชื่อเฉดที่เลือกอยู่ — แสดงเสมอ ทั้งสินค้าเฉดเดียวและหลายเฉด
 *
 * เดิมคืน null เมื่อมีหลายเฉด ทำให้สินค้า 67 ชิ้นที่มีสวอตช์ ผู้ใช้ที่มองเห็น
 * ไม่มีทางรู้ว่าเฉดที่เลือกอยู่ชื่ออะไร — ชื่อมีอยู่แค่ใน aria-label กับ title
 * (screen reader ได้ยิน, เมาส์ต้องรอ tooltip, ที่เหลือไม่ได้เลย)
 */
export function FinishLabel({ className = '' }: { className?: string }) {
  const { selected } = useFinish();
  const { lang } = useLang();
  if (!selected) return null;
  return <span className={className}>{selected.name[lang]}</span>;
}
