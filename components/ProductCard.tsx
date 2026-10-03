'use client';

// การ์ดสินค้า (ใช้ทั้งหน้าสินค้ารวมและ "สินค้าใกล้เคียง")
// ห่อด้วย TiltCard = 3D tilt ตามเมาส์ ±6deg + เงา soft ขยับตาม

import Link from 'next/link';
import TiltCard from './TiltCard';
import Placeholder from './Placeholder';
import { useLang } from './LangProvider';
import type { Product } from '@/lib/products';

export default function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLang();
  return (
    <TiltCard>
      <Link href={`/products/${product.slug}/`} className="group block bg-paper">
        <div className="overflow-hidden">
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04]">
            <Placeholder src={product.images[0]} fit="contain" ratio="4/5" />
          </div>
        </div>
        <div className="px-1 pb-2 pt-4">
          <p className="text-[10px] uppercase tracking-widest2 text-warm-500">
            {t.common.category[product.category]}
          </p>
          <h3 className="mt-1.5 text-base font-light tracking-wide">{product.name[lang]}</h3>
          <p className="mt-1 text-[12px] text-warm-500">{product.price[lang]}</p>
        </div>
      </Link>
    </TiltCard>
  );
}
