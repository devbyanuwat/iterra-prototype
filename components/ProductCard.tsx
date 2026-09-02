'use client';

// การ์ดสินค้า (ใช้ทั้งหน้าสินค้ารวมและ "สินค้าใกล้เคียง")
// ห่อด้วย TiltCard = 3D tilt ตามเมาส์ ±6deg + เงา soft ขยับตาม
//
// สวอตช์ย่อ: แสดงเฉพาะสินค้าที่มีมากกว่าหนึ่งเฉด — แคตตาล็อกราวสองในสาม
// มีเฉดเดียว จุดกลม ๆ จุดเดียวบนการ์ดสื่อว่าเลือกได้ทั้งที่เลือกไม่ได้

import Link from '@/components/Link';
import TiltCard from './TiltCard';
import { useLang } from './LangProvider';
import { langAttr } from '@/lib/i18n';
import { inkFitStyle, inkFor } from '@/lib/ink-fit';

const MAX_DOTS = 5;

/** สัดส่วนกรอบรูปของการ์ดใบนี้ — ตัวเลขเดียวกับคลาส `aspect-[4/5]` ข้างล่าง
 *  inkFitStyle ต้องรู้ค่านี้เพื่อคำนวณ transform โดยไม่ต้องวัด DOM */
const CARD_ASPECT = 4 / 5;

/**
 * รูปร่างขั้นต่ำที่การ์ดต้องใช้ ไม่ผูกกับ `Product` เต็มก้อน
 *
 * หน้า /products ส่งข้อมูลย่อที่ server เตรียมไว้ (ไม่มี specs/desc/images) ส่วน
 * "สินค้าใกล้เคียง" ยังส่ง Product เต็ม ๆ มา — ทั้งคู่ผ่าน type นี้ได้เพราะ
 * TypeScript เทียบโครงสร้าง ไม่ใช่ชื่อ type
 */
export type CardProduct = {
  slug: string;
  category: 'kitchen' | 'bath';
  name: { th: string; en: string };
  price: { th: string; en: string };
  finishes: { code: string; accent: string; image: string; image700: string }[];
};

export default function ProductCard({
  product,
  compact = false,
  finishCode,
}: {
  product: CardProduct;
  /** กริดแบบแน่น: ตัดราคาและจุดสวอตช์ออก เหลือรูปกับชื่อ */
  compact?: boolean;
  /** เฉดที่กริดกำลังกรองอยู่ — การ์ดต้องเรนเดอร์ในเฉดนั้น ไม่ใช่เฉดแรกของสินค้า */
  finishCode?: string;
}) {
  const { lang, t } = useLang();
  const finish = (finishCode && product.finishes.find((f) => f.code === finishCode)) || product.finishes[0];
  const extraFinishes = product.finishes.length - MAX_DOTS;

  return (
    <TiltCard>
      <Link href={`/products/${product.slug}/`} className="group block">
        <div className="overflow-hidden border border-line-6 bg-surface">
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            {finish ? (
              // ชั้นนี้มีหน้าที่เดียว: ขยายและเลื่อนเนื้อสินค้าให้เต็มการ์ด
              // ค่ามาจากกรอบอัลฟาที่วัดไว้ตอน build (lib/product-ink.generated.ts)
              // ไม่ใช่วัดตอนรันไทม์ จึงไม่มี canvas ไม่มีการอ่าน layout และ HTML
              // ที่ static export ส่งมาก็มี transform นี้ติดมาแล้ว
              <span
                className="block"
                style={{
                  transform: inkFitStyle(inkFor(finish.image), CARD_ASPECT),
                  transformOrigin: 'center',
                }}
              >
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
              <img
                src={finish.image}
                // ใส่ srcSet เฉพาะตอนที่ไฟล์ครึ่งขนาดมีอยู่จริง — สินค้าที่ master
                // เล็กกว่า 700px จะได้ image700 เท่ากับ image (ดู ProductStage)
                srcSet={
                  finish.image700 !== finish.image
                    ? `${finish.image700} 700w, ${finish.image} 1400w`
                    : undefined
                }
                sizes={
                  finish.image700 !== finish.image
                    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                    : undefined
                }
                alt={product.name[lang]}
                lang={langAttr(product.name[lang], lang)}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-contain"
              />
              </span>
            ) : (
              <div className="aspect-[4/5] w-full" aria-hidden />
            )}
          </div>
        </div>

        <div className={compact ? 'px-1 pb-2 pt-3' : 'px-1 pb-2 pt-4'}>
          <p className="micro">{t.common.category[product.category]}</p>
          <h3
            className="mt-1.5 text-[1rem] font-normal tracking-wide text-ink"
            lang={langAttr(product.name[lang], lang)}
          >
            {product.name[lang]}
          </h3>
          {!compact && <p className="mt-1 text-body-sm text-dim">{product.price[lang]}</p>}

          {/* สวอตช์ย่อ — เฉพาะเมื่อมีให้เลือกจริง */}
          {!compact && product.finishes.length > 1 && (
            <div className="mt-3 flex items-center gap-1.5" aria-hidden>
              {product.finishes.slice(0, MAX_DOTS).map((f) => (
                <span
                  key={f.code}
                  className="block h-2.5 w-2.5 rounded-full ring-1 ring-line-12"
                  style={{ background: f.accent }}
                />
              ))}
              {extraFinishes > 0 && <span className="text-label text-dim">+{extraFinishes}</span>}
            </div>
          )}
          {/* จุดสีเป็นภาพล้วน — บอกจำนวนเฉดเป็นข้อความให้ screen reader แทน */}
          {product.finishes.length > 1 && (
            <span className="sr-only">
              {t.common.finishCount(product.finishes.length)}
            </span>
          )}
        </div>
      </Link>
    </TiltCard>
  );
}
