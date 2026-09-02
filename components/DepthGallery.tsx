'use client';

// แกลเลอรี = สนามเดียวกับประตูเข้า แต่เป็นสินค้าล้วน + มุมมองดัชนี
// (spec 2026-09-01-kohler-depth-field §4.2)
//
// สองอย่างที่สเปกบังคับและเป็นเหตุผลที่ไฟล์นี้มีอยู่:
//
// 1. คลิกระนาบ → หน้าสินค้านั้น **พร้อมเฉดที่เห็นอยู่** ผ่าน `?finish=` ที่
//    ProductDetail ต่อสายไว้แล้ว (ดู FinishFromQuery ในไฟล์นั้น)
//    ระนาบถูกสร้างจาก finishOf ไม่ใช่ finishes[0] ตั้งแต่ใน depth-field.ts
//    ปลายทางจึงตรงกับที่ตาเห็นโดยนิยาม ไม่ใช่โดยข้อตกลงที่อาจเพี้ยนทีหลัง
//
// 2. **มุมมองดัชนีเป็นข้อบังคับ ไม่ใช่ของเสริม** (ความเสี่ยง §7 ข้อ 3)
//    สนาม 3 มิติหาของเฉพาะเจาะจงไม่ได้ ของ michaelgatt เองก็มี "INDEX VIEW"
//    คนที่ตามหาก๊อกตัวเดียวต้องมีทางออก และทางออกนั้นต้องเป็น "ของชุดเดียวกัน"
//    ไม่ใช่ลิงก์ไปหน้าอื่นที่มีของคนละชุด
//
// มือถือกับ reduced-motion ไม่มีสนามให้สลับ — ตกลงมาอยู่ที่ดัชนีเลย
// และปุ่มสลับก็ไม่ต้องมี เพราะไม่มีอะไรให้สลับไป (§5 ข้อ 3–4)

import { useState } from 'react';
import Link from 'next/link';
import DepthField, { useFieldMode } from './DepthField';
import ModelNumber from './ModelNumber';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { inkFitStyle, inkFor } from '@/lib/ink-fit';
import type { FieldPlane, IndexItem } from './depth-field';

/** ตรงกับคลาส `aspect-[4/5]` ของรูปในการ์ดดัชนี — ดู lib/ink-fit.ts */
const CARD_ASPECT = 4 / 5;

type Props = {
  planes: FieldPlane[];
  index: IndexItem[];
  total: number;
};

export default function DepthGallery({ planes, index, total }: Props) {
  const { t, lang } = useLang();
  const fieldMode = useFieldMode();
  const [wantIndex, setWantIndex] = useState(false);

  // สนามได้เมื่อ "เครื่องมีเมาส์และผู้ใช้ไม่ได้ขอให้หยุดขยับ" เท่านั้น
  const showField = fieldMode && !wantIndex;

  return (
    <section className="px-6 pb-24 pt-28 md:px-[4vw] md:pt-32">
      <Reveal>
        <p className="micro">{t.gallery.kicker}</p>
        <h1 className="mt-3 max-w-3xl text-section font-normal text-ink">{t.gallery.title}</h1>
        <p className="mt-4 max-w-2xl text-body text-dim">{t.gallery.sub(planes.length)}</p>
      </Reveal>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {/* คำใบ้วิธีใช้เปลี่ยนตามมุมมองที่เห็นจริง ไม่ใช่บอก "เลื่อนเมาส์" ค้างไว้
            ตอนที่หน้าจอไม่มีสนามให้เลื่อน */}
        <p className="micro">{showField ? t.gallery.hint : t.gallery.indexHint}</p>

        <div className="flex items-center gap-5">
          <span className="micro hidden md:inline">{showField ? t.gallery.keyHint : ''}</span>
          {/* ปุ่มโผล่เฉพาะตอนที่มีสองมุมมองให้เลือกจริง */}
          {fieldMode && (
            <button
              type="button"
              onClick={() => setWantIndex((v) => !v)}
              aria-pressed={wantIndex}
              className="border border-line-12 px-5 py-3 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              <span className="micro !text-current">
                {wantIndex ? t.gallery.toField : t.gallery.toIndex}
              </span>
            </button>
          )}
        </div>
      </div>

      {showField ? (
        // ความสูงคงที่ 82svh: สนามเป็นกล่อง overflow:hidden ที่มีแต่ลูก absolute
        // ถ้าปล่อยให้ความสูงมาจากเนื้อหา มันจะยุบเป็นศูนย์
        //
        // พื้นมืดจบที่ขอบกล่องนี้ ไม่ลามออกไปทั้งหน้า — /gallery เป็น "หน้า" ไม่ใช่
        // "ช่วงเวลา" แบบประตูเข้า เมนู เวิร์ดมาร์ก หัวข้อ และท้ายเว็บจึงยังเป็นของ
        // เว็บเดิมทุกอย่าง สิ่งที่มืดคือกล่องที่กำแพงรูปอยู่ข้างใน ซึ่งอ่านเป็น
        // "เฟรมของงาน" ไม่ใช่ "เว็บคนละเว็บ"
        <DepthField
          planes={planes}
          interactive
          label={t.gallery.fieldLabel}
          className="relative mt-8 h-[82svh] w-full"
        />
      ) : (
        <>
          <ul
            aria-label={t.gallery.indexLabel}
            className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4"
          >
            {index.map((item, i) => (
              <li key={`${item.slug}-${item.model}-${i}`}>
                {/* โครงเดียวกับ FinishProductCard เป๊ะ ๆ — การ์ดสินค้าของเว็บนี้
                    หน้าตาเดียว ไม่ว่าจะมาจากหน้าเฉดหรือจากดัชนีของสนาม */}
                <Link href={item.href} className="group block">
                  {/* ห้ามใส่ overflow-hidden ที่นี่: hidden สร้าง scroll container
                      ที่ 390px จะได้แถบเลื่อนแนวนอนกลับมา ตัว ModelNumber ถือ
                      overflow-clip ของมันเองไว้แล้ว */}
                  <div className="relative border border-line-6 bg-surface">
                    <ModelNumber model={item.model} variant="card" />
                    {/* z-10: ModelNumber เป็น absolute จึงวาดทับ block ปกติ
                        รูปสินค้าต้องถูกยกขึ้นมาเอง */}
                    <div className="relative z-10 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                      {/* เนื้อสินค้าเต็มการ์ดเหมือนกริดอื่นทั้งเว็บ — ดู lib/ink-fit.ts */}
                      <span
                        className="block"
                        style={{
                          transform: inkFitStyle(inkFor(item.src), CARD_ASPECT),
                          transformOrigin: 'center',
                        }}
                      >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่สนามใช้ */}
                      <img
                        // ไฟล์เดียวกับระนาบในสนาม (700) เบราว์เซอร์จึงเห็นเป็น
                        // cache entry เดียวตอนสลับมุมมองไปมา ไม่ใช่โหลดใหม่ทั้งกริด
                        src={item.src}
                        alt={item.alt[lang]}
                        loading={i < 8 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="aspect-[4/5] w-full object-contain"
                      />
                      </span>
                    </div>
                  </div>

                  <div className="px-1 pb-2 pt-4">
                    <p className="micro">{item.finishName[lang]}</p>
                    <h2 className="mt-1.5 text-body font-normal text-ink">{item.name[lang]}</h2>
                    {/* เลขรุ่นเป็นข้อความจริงด้วย ไม่ใช่มีแต่ตัวยักษ์ที่ aria-hidden */}
                    <p className="mt-1 text-body-sm text-dim">{item.model}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* ดัชนีคือของชุดเดียวกับสนาม ไม่ใช่ทั้งแคตตาล็อก — คนที่หาไม่เจอในนี้
              ต้องมีที่ต่อไปให้ไป ไม่ใช่ตัน */}
          <Link
            href="/products/"
            className="mt-12 inline-flex items-center gap-4 border border-line-12 px-8 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            <span className="micro !text-current">
              {t.gallery.viewAll} ({total})
            </span>
            <span aria-hidden>→</span>
          </Link>
        </>
      )}
    </section>
  );
}
