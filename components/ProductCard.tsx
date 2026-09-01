'use client';

// การ์ดสินค้า (ใช้ทั้งหน้าสินค้ารวมและ "สินค้าใกล้เคียง")
// ห่อด้วย TiltCard = 3D tilt ตามเมาส์ ±6deg + เงา soft ขยับตาม
//
// สวอตช์ย่อ: แสดงเฉพาะสินค้าที่มีมากกว่าหนึ่งเฉด — แคตตาล็อกราวสองในสาม
// มีเฉดเดียว จุดกลม ๆ จุดเดียวบนการ์ดสื่อว่าเลือกได้ทั้งที่เลือกไม่ได้

import Link from 'next/link';
import TiltCard from './TiltCard';
import { useLang } from './LangProvider';
import type { Product } from '@/lib/products';

const MAX_DOTS = 5;

export default function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const finish = product.finishes[0];
  const extraFinishes = product.finishes.length - MAX_DOTS;

  return (
    <TiltCard>
      <Link href={`/products/${product.slug}/`} className="group block">
        <div className="overflow-hidden border border-line-6 bg-surface">
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            {finish ? (
              // eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper
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
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-contain"
              />
            ) : (
              <div className="aspect-[4/5] w-full" aria-hidden />
            )}
          </div>
        </div>

        <div className="px-1 pb-2 pt-4">
          <p className="micro">{t.common.category[product.category]}</p>
          <h3 className="mt-1.5 text-[1rem] font-normal tracking-wide text-ink">{product.name[lang]}</h3>
          <p className="mt-1 text-body-sm text-dim">{product.price[lang]}</p>

          {/* สวอตช์ย่อ — เฉพาะเมื่อมีให้เลือกจริง */}
          {product.finishes.length > 1 && (
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
