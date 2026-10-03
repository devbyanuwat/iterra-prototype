'use client';

// การ์ดสินค้า (หน้าสินค้ารวม, สินค้าเด่นหน้าแรก, "สินค้าใกล้เคียง")
// ห่อด้วย TiltCard = 3D tilt ตามเมาส์ ±6deg + เงา soft ขยับตาม
// จุดสีอยู่นอกลิงก์ (ปุ่มซ้อนในลิงก์ไม่ได้) · กดแล้วปรับสีเฉพาะภาพของการ์ดนี้ ไม่ตามไปหน้า detail

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import TiltCard from './TiltCard';
import Placeholder from './Placeholder';
import FinishDots from './FinishDots';
import { useLang } from './LangProvider';
import { finishesFor } from '@/lib/finishes';
import type { Product } from '@/lib/products';

export default function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLang();
  const finishes = finishesFor(product);
  const [finishId, setFinishId] = useState(finishes[0].id);
  const tint = finishes.find((f) => f.id === finishId)?.tint || 'none';
  const href = `/products/${product.slug}/`;
  return (
    <TiltCard>
      <div className="group bg-paper">
        {/* ลิงก์ภาพซ้ำกับลิงก์ชื่อสินค้า → ซ่อนจาก tab/screen reader */}
        <Link
          href={href}
          className="block overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
          style={{ '--tint': tint } as CSSProperties}
        >
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            <Placeholder src={product.images[0]} fit="contain" ratio="4/5" />
          </div>
        </Link>
        <div className="px-1 pb-2 pt-4">
          <p className="text-[10px] uppercase tracking-widest2 text-warm-500">
            {t.common.category[product.category]}
          </p>
          <h3 className="mt-1.5 text-base font-light tracking-wide">
            <Link href={href} className="underline-offset-4 hover:underline focus-visible:underline">
              {product.name[lang]}
            </Link>
          </h3>
          <FinishDots finishes={finishes} value={finishId} onChange={setFinishId} size="sm" className="mt-1" />
          <p className="text-[12px] text-warm-500">{product.price[lang]}</p>
        </div>
      </div>
    </TiltCard>
  );
}
