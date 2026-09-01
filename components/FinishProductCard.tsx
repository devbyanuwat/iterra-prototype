'use client';

// การ์ดสินค้าบนหน้า /finish/[code] (spec finish-first §4.2 + §4.3)
//
// ต่างจาก ProductCard สองเรื่อง และทั้งสองเรื่องคือเหตุผลที่มีไฟล์นี้แยกออกมา:
//
// 1. รับ `finish` มาเป็น prop และเรนเดอร์รูปของเฉดนั้น ไม่ใช่ `product.finishes[0]`
//    นี่คือหัวใจของ §4.2 ทั้งหมด — ผู้ใช้ต้องเห็นห้องทั้งห้องในโทนเดียวกัน
//    AC ข้อ 2 ตรวจที่ `img src` ไม่ได้ตรวจด้วยสายตา ผู้เรียกจึงส่ง finish เข้ามาเสมอ
//    (ProductCard ใช้ finishes[0] ซึ่งถูกสำหรับหน้ารวม แต่ผิดสำหรับหน้านี้)
//
// 2. มี ModelNumber — §4.3 บังคับเฉพาะหน้านี้กับหน้า detail ห้ามมีบนหน้าแรก

import Link from 'next/link';
import ModelNumber from './ModelNumber';
import { useLang } from './LangProvider';
import type { Finish, Product } from '@/lib/products';

/**
 * ใส่ srcSet เฉพาะตอนที่ไฟล์ครึ่งขนาดมีอยู่จริง
 *
 * สินค้าที่ master จาก Scene7 เล็กกว่า 700px ไม่มีไฟล์ `-700.webp` และ generated data
 * ตั้ง image700 = image ไว้ให้แล้ว การประกาศ candidate 700w ทั้งที่ไฟล์เดียวกัน
 * ไม่ได้ช่วยอะไรและต้องโกหกความกว้าง — เหตุผลเดียวกับใน ProductStage
 *
 * `sizes` ต้องผูกกับ srcSet ด้วย: ใส่ sizes ทิ้งไว้โดยไม่มี srcSet เคยทำให้ภาพ
 * เลือกขนาดผิดมาแล้ว (ดู bus fix1-r1 หัวข้อ H1)
 */
function srcSetFor(src: string, src700: string) {
  if (!src700 || src700 === src) return undefined;
  return `${src700} 700w, ${src} 1400w`;
}

type Props = {
  product: Product;
  /** เฉดที่การ์ดนี้ต้องเรนเดอร์ — มาจาก finishOf(product, code) ของหน้าเฉด */
  finish: Finish;
  /** การ์ดแถวแรกโหลดทันที ที่เหลือ lazy */
  priority?: boolean;
};

const SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

export default function FinishProductCard({ product, finish, priority = false }: Props) {
  const { lang, t } = useLang();
  const srcSet = srcSetFor(finish.image, finish.image700);

  return (
    <Link href={`/products/${product.slug}/`} className="group block">
      {/* relative: ModelNumber วางตัวเองด้วย absolute inset-0 จึงต้องมี containing block
          ตัว ModelNumber ถือ overflow-clip ของมันเองไว้ (ดูหมายเหตุในไฟล์นั้น)
          การ์ดจึงไม่ต้องใส่ซ้ำ และ **ห้าม** ใส่ overflow-hidden ตรงนี้ —
          hidden สร้าง scroll container ที่ 390px จะได้แถบเลื่อนแนวนอนกลับมา (§6 ข้อ 4) */}
      <div className="relative border border-line-6 bg-surface">
        <ModelNumber model={product.model} variant="card" />

        {/* z-10: ModelNumber เป็น absolute จึงวาดทับ block ปกติที่ไม่ได้ positioned
            รูปสินค้าต้องถูกยกขึ้นมาเอง ไม่งั้นเลขรุ่นจะบังสินค้าแทนที่จะอยู่หลัง */}
        <div className="relative z-10 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local จาก scraper */}
          <img
            src={finish.image}
            srcSet={srcSet}
            sizes={srcSet ? SIZES : undefined}
            alt={`${product.name[lang]} — ${finish.name[lang]}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-[4/5] w-full object-contain"
          />
        </div>
      </div>

      <div className="px-1 pb-2 pt-4">
        <p className="micro">{t.common.category[product.category]}</p>
        <h3 className="mt-1.5 text-body font-normal text-ink">{product.name[lang]}</h3>
        {/* เลขรุ่นเป็นข้อความจริงด้วย ไม่ใช่มีแต่ตัวยักษ์ที่ aria-hidden
            คนที่ใช้ screen reader ควรได้รหัสรุ่นเหมือนกับคนที่มองเห็น */}
        <p className="mt-1 text-body-sm text-dim">{product.model}</p>
      </div>
    </Link>
  );
}
