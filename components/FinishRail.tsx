'use client';

// แถบสลับเฉดที่ติดขอบจอ (spec finish-first §4.2)
//
// ต้องเป็น <a href> จริง ไม่ใช่ <button>: หน้าเฉดทั้ง 11 หน้ามีอยู่จริงใน static export
// ทำเป็นปุ่มจะทำให้ครอว์เลอร์มองไม่เห็นเส้นทางระหว่างเฉด และ middle-click / เปิดแท็บใหม่
// ก็จะพัง ผู้เรียกจึงดัก onClick แล้ว preventDefault เพื่อสลับแบบไม่โหลดหน้า (AC 5)
// ส่วนคลิกที่มี modifier ปล่อยผ่านให้เบราว์เซอร์จัดการตามปกติ
//
// roving tabindex เหมือน FinishWall กับ FinishSwatches — ทั้งเว็บใช้รูปแบบเดียวกัน
// ผู้ใช้คีย์บอร์ดจึงเจอพฤติกรรมเดิมทุกที่ที่มีแถวสวอตช์

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import type { FinishEntry } from './finish-index';

type Props = {
  entries: FinishEntry[];
  activeCode: string;
  /** คืน true เมื่อรับงานไปทำเองแล้ว (ผู้เรียกจะ preventDefault ให้) */
  onSelect: (code: string) => void;
};

export default function FinishRail({ entries, activeCode, onSelect }: Props) {
  const { lang, t } = useLang();
  const activeIndex = Math.max(
    0,
    entries.findIndex((e) => e.code === activeCode),
  );
  const [roving, setRoving] = useState(activeIndex);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // ── ที่มือถือ แถบนี้ลอยทับท้ายหน้าถาวร ──────────────────────────────────
  //
  // มันเป็น `fixed` จึงไม่กินที่ของตัวเองเลย QA วัดได้ว่าบรรทัดลิขสิทธิ์ของ footer
  // อยู่ที่ 775–844 ส่วนแถบอยู่ 772–844 — บรรทัดสุดท้ายของเว็บถูกบังทั้งบรรทัด
  // และ **เลื่อนหนีไม่ได้** เพราะมันคือจุดต่ำสุดของหน้าอยู่แล้ว
  // (`pb-40` ที่ FinishContent เผื่อไว้ให้การ์ดใบท้าย ไม่ได้ช่วย footer ซึ่งอยู่
  //  คนละ subtree — footer มาจาก layout ไม่ได้อยู่ในหน้าเฉด)
  //
  // ตัวที่บังคือแถบ ตัวที่รู้ความสูงของแถบก็คือแถบ การชดเชยจึงเป็นหน้าที่ของมันเอง
  // ไม่ใช่ของ layout หรือ Footer ที่ไม่มีทางรู้ว่าหน้านี้มีแถบอยู่หรือเปล่า
  //
  // เดสก์ท็อปแถบย้ายไปเกาะขอบขวาแนวตั้ง ไม่ทับอะไรในแนวตั้ง จึงไม่ต้องชดเชย
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const previous = document.body.style.paddingBottom;

    const apply = () => {
      document.body.style.paddingBottom = mq.matches
        ? previous
        : `${Math.ceil(el.getBoundingClientRect().height)}px`;
    };

    apply();
    mq.addEventListener('change', apply);
    // ความสูงเปลี่ยนได้จริงตอนฟอนต์สลับ — วัดใหม่แทนการฮาร์ดโค้ดตัวเลขที่จะเพี้ยน
    // เงียบ ๆ วันที่ใครแก้ padding ของชิป
    const ro = new ResizeObserver(apply);
    ro.observe(el);

    return () => {
      mq.removeEventListener('change', apply);
      ro.disconnect();
      document.body.style.paddingBottom = previous;
    };
  }, []);

  // เฉดที่ active เปลี่ยนจากที่อื่น (ปุ่ม back ของเบราว์เซอร์) — roving ต้องตามไปด้วย
  // ไม่งั้นกด Tab เข้าแถบแล้วโฟกัสไปตกที่เฉดก่อนหน้า
  useEffect(() => {
    setRoving(activeIndex);
  }, [activeIndex]);

  // เลื่อนแถบให้เห็นเฉดที่เลือกอยู่
  //
  // บนมือถือแถบเป็นแนวนอนกว้างเกินจอ ที่ 390px เห็นได้ราว 7 จาก 11 เฉด เฉดอย่าง
  // Matte Black หรือ Bronze จึงอยู่นอกจอตั้งแต่เปิดหน้า ผู้ใช้เห็นแถบสวอตช์ที่
  // ไม่มีตัวไหนถูกเลือกเลย ทั้งที่กำลังดูหน้าเฉดนั้นอยู่
  //
  // ตั้ง scrollLeft เองแทน scrollIntoView: scrollIntoView เลื่อน ancestor ที่เลื่อนได้
  // ทุกชั้นรวมถึงตัวหน้า คนที่เพิ่งเปิดหน้าจะถูกดีดออกจากหัวเรื่องทันทีที่ hydrate จบ
  useEffect(() => {
    const list = listRef.current;
    const item = refs.current[activeIndex];
    if (!list || !item) return;
    // เดสก์ท็อปเป็นแถบตั้งที่เห็นครบ 11 อยู่แล้ว ไม่มีอะไรต้องเลื่อน
    if (list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = Math.max(0, item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2);
  }, [activeIndex]);

  const focusAt = useCallback((i: number) => {
    const n = refs.current.length;
    if (!n) return;
    const next = ((i % n) + n) % n;
    setRoving(next);
    refs.current[next]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
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

  const handleClick = (e: React.MouseEvent, code: string) => {
    // ctrl/cmd/shift/คลิกกลาง = ผู้ใช้ตั้งใจเปิดแท็บใหม่ อย่าไปขวาง
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(code);
  };

  return (
    <nav
      ref={navRef}
      aria-label={t.finish.railLabel}
      // มือถือ: แถบนอนติดขอบล่าง เลื่อนในตัวเอง (overflow-x-auto สร้าง scroll
      // container ของตัวเอง จึงไม่ดัน scrollWidth ของหน้า — AC 8)
      // เดสก์ท็อป: แถบตั้งติดขอบขวา จัดกลางแนวตั้ง
      className={[
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 backdrop-blur-sm',
        'md:inset-x-auto md:bottom-auto md:right-0 md:top-1/2 md:-translate-y-1/2',
        'md:border-y md:border-l md:border-t md:bg-base/90',
      ].join(' ')}
    >
      <ul
        ref={listRef}
        // min-h-[72px] บนมือถือ: ชิป 36 + p-1 ของลิงก์ 8 + py-3 ของแถบ 24 = 68
        // แล้ว `snap-gallery` เติมรางสกรอลล์แนวนอนสูง 3px **หลังจาก** ไฟล์วัสดุ 11 ใบ
        // โหลดเสร็จจนแถบล้น — แถบจึงโตจาก 69 เป็น 72px กลางคัน ซึ่งเป็น layout shift
        // เดียวที่วัดเจอบนหน้าเฉด จองความสูงสุดท้ายไว้ตั้งแต่แรก รางจะโผล่ตอนไหนก็ได้
        className="snap-gallery flex min-h-[72px] gap-2 overflow-x-auto px-3 py-3 md:min-h-0 md:flex-col md:overflow-visible md:px-2.5 md:py-3"
      >
        {entries.map((e, i) => {
          const isOn = e.code === activeCode;
          const name = e.name[lang];
          return (
            <li key={e.code} className="shrink-0">
              <Link
                ref={(el) => {
                  refs.current[i] = el;
                }}
                href={`/finish/${encodeURIComponent(e.code)}/`}
                tabIndex={roving === i ? 0 : -1}
                onKeyDown={(ev) => onKeyDown(ev, i)}
                onFocus={() => setRoving(i)}
                onClick={(ev) => handleClick(ev, e.code)}
                aria-current={isOn ? 'page' : undefined}
                title={`${name} · ${t.finish.pieces(e.count)}`}
                className="group flex items-center gap-2.5 rounded-full p-1 md:p-1"
              >
                {/* วงแหวนสองชั้นตอนโฟกัส เหตุผลเดียวกับ FinishSwatches:
                    ขาวชิดขอบชิป ink วงนอก — ชิปขาวกับชิปดำจึงเห็นคนละวง */}
                <span
                  className={[
                    'block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-base transition-transform duration-300',
                    'group-hover:scale-110',
                    'group-focus-visible:shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#232323]',
                    isOn ? 'ring-2 ring-ink' : 'ring-1 ring-line-12',
                  ].join(' ')}
                >
                  {/* material ไม่ใช่ swatch — chip 88px ของรหัส NA เป็นตัวอักษร "NA"
                      บนพื้นขาว (placeholder ของ Kohler แปลว่า not applicable) ไม่ใช่วัสดุ
                      แถบนี้จึงต้องใช้ไฟล์ชุดเดียวกับกำแพง ไม่งั้นแถบมีปุ่มที่เขียนว่า NA
                      อยู่ปุ่มหนึ่งท่ามกลางวัสดุจริง 10 ปุ่ม */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์วัสดุ local */}
                  <img
                    src={e.material}
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </span>
                {/* ชื่อเฉดต้องอ่านออกด้วยเสียง ไม่ใช่มีแต่ title ที่ต้องรอ tooltip
                    (ปัญหาเดียวกับที่ FinishSwatches เคยมี) */}
                <span className="sr-only">
                  {name} — {t.finish.pieces(e.count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
