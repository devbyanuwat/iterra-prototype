'use client';

// หน้าสินค้า: เวทีสินค้า + สวอตช์ + สเปก + แบบแปลนบอกระยะ
//
// เวทีกับสวอตช์อยู่ใต้ FinishProvider ตัวเดียวกัน กดสวอตช์แล้วรูปเปลี่ยนจริง
// (ไม่ใช่ tint ด้วย CSS) และ --accent ไล่สีตาม ทั้ง spotlight หลังสินค้า
// เส้นแบบแปลน และปุ่มสอบถามจึงเปลี่ยนสีพร้อมกันเอง
//
// สินค้าเฉดเดียวเป็นส่วนใหญ่ของแคตตาล็อก — FinishSwatches จะไม่ render อะไรเลย
// แล้ว FinishLabel ขึ้นชื่อเฉดแทน

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import ProductCard from './ProductCard';
import ProductStage from './ProductStage';
import ModelNumber from './ModelNumber';
import FinishProvider, { useFinish } from './FinishProvider';
import FinishSwatches, { FinishLabel } from './FinishSwatches';
import SpecDrawing from './SpecDrawing';
import { useLang } from './LangProvider';
import { getFinishEntry } from './finish-index';
import { getProduct, relatedProducts } from '@/lib/products';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** อ่าน ?finish=<code> จาก URL แล้วเลือกเฉดนั้นให้ตั้งแต่ก่อนเบราว์เซอร์วาด
 *
 *  ต้องอยู่ "ข้างใน" provider ไม่ใช่ข้างนอก: `select()` เรียก setState ของ provider
 *  ตรง ๆ React จึงรีเรนเดอร์ให้จบในคอมมิตเดียวกันก่อน paint ถ้าไปส่งเป็น prop
 *  `initialCode` แทน จะต้องรอ effect รอบถัดไปของ provider ซึ่งอยู่หลัง paint
 *
 *  หน้านี้เป็น static export ไฟล์เดียวใช้ร่วมทุกเฉด HTML ที่ส่งมาจึงเป็น finishes[0]
 *  เสมอ ตัวเฉดจริงมาทีหลังหนึ่งเฟรม — ProductStage สลับแบบไม่ crossfade ในเฟรมนั้น
 *  (ดูหมายเหตุ `ready` ในไฟล์นั้น) ไม่งั้นจะกลายเป็นเห็นเฉดผิดค้างอยู่ 420ms
 */
function FinishFromQuery() {
  const { finishes, select } = useFinish();
  useIsoLayoutEffect(() => {
    const code = new URLSearchParams(window.location.search).get('finish');
    if (code && finishes.some((f) => f.code === code)) select(code);
  }, [finishes, select]);
  return null;
}

export default function ProductDetail({ slug }: { slug: string }) {
  const { lang, t } = useLang();
  const product = getProduct(slug);

  // เฉดที่ผู้ใช้เดินทางมา ใช้ทำ breadcrumb ให้ย้อนกลับไปหน้าเฉดเดิม ไม่ใช่ /products
  // อ่านหลัง mount: markup ฝั่ง server ไม่มีทางรู้ค่า query จึงต้องเป็น null ก่อน
  // แล้วค่อยเติม — ผิดจาก useIsoLayoutEffect ข้างบนตรงที่อันนี้เป็นแค่ลิงก์ ไม่ใช่ภาพ
  // ที่วาดผิดแล้วสะดุดตา
  const [fromFinish, setFromFinish] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('finish');
    if (code && getFinishEntry(code)) setFromFinish(code);
  }, []);

  if (!product) return null;
  const related = relatedProducts(slug);
  const backEntry = fromFinish ? getFinishEntry(fromFinish) : undefined;

  return (
    <FinishProvider finishes={product.finishes} applyTo="root">
      <FinishFromQuery />
      <section className="px-6 pb-24 pt-32 md:px-[6vw] md:pt-40">
        {/* breadcrumb */}
        {/* ย้อนกลับไปที่เฉดที่มาจริง ๆ ไม่ใช่ /products เสมอ — คนที่กำลังไล่ดู
            "ทั้งห้องในเฉดดำด้าน" แล้วกดกลับ ควรได้ห้องเฉดดำด้านคืน ไม่ใช่แคตตาล็อกรวม */}
        <nav aria-label="breadcrumb" className="micro mb-10">
          {backEntry ? (
            <Link
              href={`/finish/${encodeURIComponent(backEntry.code)}/`}
              className="transition-colors hover:text-ink"
            >
              {t.finish.title(backEntry.name[lang])}
            </Link>
          ) : (
            <Link href="/products/" className="transition-colors hover:text-ink">
              {t.nav.products}
            </Link>
          )}
          <span className="mx-2">/</span>
          <span aria-current="page">{product.name[lang]}</span>
        </nav>

        <div className="grid gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-[5vw]">
          {/* เวทีสินค้า */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative aspect-[4/5] w-full">
              {/* finish-first §4.3 สั่งให้เลขรุ่นยักษ์อยู่ "ทั้งหน้า /finish/[code] ต่อการ์ด
                  และหน้า detail" ที่ผ่านมามีแค่ครึ่งเดียว — หน้านี้ไม่มีโหนดไหนถึง 100px เลย
                  variant='detail' เกาะซ้ายบนของเวที ต่างจากการ์ดที่เกาะซ้ายล่าง
                  ModelNumber ถือ overflow-clip ของตัวเองไว้ เลขจึงล้นออกนอกกรอบจริง
                  โดยไม่ดัน scrollWidth ของหน้าที่ 390px (ความเสี่ยง §6 ข้อ 4)
                  วางก่อน ProductStage ในลำดับ DOM — ทั้งคู่เป็น positioned และไม่มี
                  z-index เวทีจึงวาดทับเลข ซึ่งคือสิ่งที่ต้องการ: เลขอยู่ "หลัง" สินค้า */}
              <ModelNumber model={product.model} variant="detail" />
              <ProductStage
                name={product.name[lang]}
                priority
                sizes="(max-width: 1024px) 92vw, 46vw"
              />
            </div>
          </div>

          {/* ข้อมูลสินค้า */}
          <div>
            <Reveal>
              <p className="micro mb-3">{t.common.category[product.category]}</p>
              <h1 className="font-display text-3xl font-normal leading-snug tracking-wide text-ink md:text-4xl">
                {product.name[lang]}
              </h1>
              <p className="mt-2 text-body-sm font-normal text-dim">
                {lang === 'th' ? product.name.en : product.name.th}
              </p>
              <p className="mt-1 text-label tracking-widest text-dim">{product.model}</p>

              <p className="mt-6 max-w-md text-body-sm font-normal leading-loose text-dim">
                {product.desc[lang]}
              </p>
              <p className="mt-6 text-lg font-normal text-ink">{product.price[lang]}</p>
            </Reveal>

            {/* ผิวเคลือบ */}
            <Reveal>
              <h2 className="micro mb-4 mt-10">{t.common.finish}</h2>
              <FinishSwatches />
              <FinishLabel className="mt-3 block text-body-sm font-normal text-ink" />
            </Reveal>

            {/* ตารางสเปก */}
            <Reveal>
              <h2 className="micro mb-3 mt-10">{t.products.specs}</h2>
              <table className="w-full max-w-md border-collapse text-body-sm font-normal">
                <tbody>
                  {product.specs.map((s) => (
                    <tr key={s.label} className="border-b border-line-6">
                      <th scope="row" className="py-3 pr-6 text-left font-normal text-dim">
                        {s.label}
                      </th>
                      <td className="py-3 text-ink">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>

            <Reveal>
              <Link
                href={`/contact/?product=${product.slug}`}
                className="mt-10 inline-block border border-line-12 px-10 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <span className="micro !text-current">{t.common.inquire}</span>
              </Link>
            </Reveal>
          </div>
        </div>

        {/* แบบแปลนบอกระยะ — ไม่ render ถ้าสเปกไม่มีตัวเลขระยะ */}
        <SpecDrawing
          specs={product.specs}
          title={lang === 'th' ? 'ระยะโดยประมาณ' : 'DIMENSIONS'}
          className="mt-24 pt-12"
        />
      </section>

      {/* สินค้าใกล้เคียง */}
      {related.length > 0 && (
        <section className="border-t border-line-6 px-6 py-24 md:px-[6vw]">
          <Reveal className="mb-12">
            <h2 className="font-display text-2xl font-normal tracking-wide text-ink md:text-3xl">
              {t.products.related}
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.1}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </FinishProvider>
  );
}
