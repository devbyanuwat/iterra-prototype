'use client';

// หน้าสินค้า: เวทีสินค้า + สวอตช์ + สเปก + แบบแปลนบอกระยะ
//
// เวทีกับสวอตช์อยู่ใต้ FinishProvider ตัวเดียวกัน กดสวอตช์แล้วรูปเปลี่ยนจริง
// (ไม่ใช่ tint ด้วย CSS) และ --accent ไล่สีตาม ทั้ง spotlight หลังสินค้า
// เส้นแบบแปลน และปุ่มสอบถามจึงเปลี่ยนสีพร้อมกันเอง
//
// สินค้าเฉดเดียวเป็นส่วนใหญ่ของแคตตาล็อก — FinishSwatches จะไม่ render อะไรเลย
// แล้ว FinishLabel ขึ้นชื่อเฉดแทน

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import ProductCard from './ProductCard';
import ProductStage from './ProductStage';
import ModelNumber from './ModelNumber';
import FinishProvider, { useFinish } from './FinishProvider';
import FinishSwatches, { FinishLabel } from './FinishSwatches';
import SpecDrawing from './SpecDrawing';
import { useLang } from './LangProvider';
import { roomFor } from './home/rooms';
import { lifestyleSrc } from '@/lib/lifestyle.generated';
import { getFinishEntry } from './finish-index';
import { getProduct, relatedProducts } from '@/lib/products';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** อ่าน ?finish=<code> จาก URL แล้วเลือกเฉดนั้นให้ตั้งแต่ก่อนเบราว์เซอร์วาด
 *
 * ต้องอยู่"ข้างใน" provider ไม่ใช่ข้างนอก: `select()` เรียก setState ของ provider
 * ตรง ๆ React จึงรีเรนเดอร์ให้จบในคอมมิตเดียวกันก่อน paint ถ้าไปส่งเป็น prop
 * `initialCode` แทน จะต้องรอ effect รอบถัดไปของ provider ซึ่งอยู่หลัง paint
 *
 * หน้านี้เป็น static export ไฟล์เดียวใช้ร่วมทุกเฉด HTML ที่ส่งมาจึงเป็น finishes[0]
 * เสมอ ตัวเฉดจริงมาทีหลังหนึ่งเฟรม — ProductStage สลับแบบไม่ crossfade ในเฟรมนั้น
 * (ดูหมายเหตุ `ready` ในไฟล์นั้น) ไม่งั้นจะกลายเป็นเห็นเฉดผิดค้างอยู่ 420ms
 */
function FinishFromQuery() {
 const { finishes, select } = useFinish();
 useIsoLayoutEffect(() => {
 const code = new URLSearchParams(window.location.search).get('finish');
 if (code && finishes.some((f) => f.code === code)) select(code);
 }, [finishes, select]);
 return null;
}

/**
 * เขียนเฉดที่เลือกอยู่กลับลง `?finish=` ทุกครั้งที่ผู้ใช้สลับสวอตช์บนหน้านี้
 *
 * `?finish=` ถูกใส่เข้ามาตอนแรกเพื่อให้เฉด"รอดจากการคลิก" จากหน้าเฉด แต่พอมาถึง
 * หน้าสินค้าแล้วกดสวอตช์เอง URL ยังค้างที่เฉดเดิม — รีโหลดหรือส่งลิงก์ให้คนอื่น
 * แล้วได้เฉดที่ไม่ใช่ตัวที่กำลังดูอยู่ ซึ่งพังด้วยเหตุผลเดียวกับที่ทำให้ต้องมี
 * `?finish=` ตั้งแต่แรก
 *
 * `replaceState` ไม่ใช่ `pushState`: สวอตช์ 11 ปุ่มไม่ควรกลายเป็นประวัติ 11 หน้า
 * ที่ผู้ใช้ต้องกด back ผ่านทีละอันเพื่อออกจากหน้าสินค้าชิ้นเดียว
 *
 * ส่ง `history.state` เดิมไปด้วย — App Router เก็บสถานะ router ของมันไว้ตรงนั้น
 * เขียนทับด้วย null จะทำให้ปุ่ม back ของเบราว์เซอร์เพี้ยนหลังจากนี้
 *
 * ข้ามรอบแรก: การเลือกครั้งแรกมาจาก URL (หรือเป็นค่า default) ไม่ใช่การกระทำของ
 * ผู้ใช้ ถ้าไม่ข้าม ทุกหน้าสินค้าจะถูกเติม `?finish=` ให้เองตั้งแต่ยังไม่มีใครแตะ
 */
function FinishToQuery() {
 const { selected } = useFinish();
 const code = selected?.code;
 const settled = useRef(false);

 useEffect(() => {
 if (!code) return;
 if (!settled.current) {
 settled.current = true;
 return;
 }
 const url = new URL(window.location.href);
 if (url.searchParams.get('finish') === code) return;
 url.searchParams.set('finish', code);
 window.history.replaceState(window.history.state, '', url);
 }, [code]);

 return null;
}

/**
 * ป้ายหัวแถวของตารางสเปกเป็น"ข้อความอินเทอร์เฟซ" ไม่ใช่ข้อมูลสินค้า
 *
 * scraper เก็บ label มาเป็นไทยล้วน (7 ค่าทั้งแคตตาล็อก) หน้าสินค้าฉบับอังกฤษจึงมี
 * หัวข้อ"SPECIFICATIONS" อยู่บนตารางที่หัวแถวเขียนว่า"ขนาด" /"คอลเลกชัน"
 * ค่าในช่องขวาเป็นข้อมูลสินค้า ปล่อยไว้ตามเดิม
 *
 * แผนที่นี้อยู่ที่นี่ไม่ใช่ใน lib/i18n.ts เพราะมันไม่ใช่ป้าย UI ที่เราตั้งชื่อเอง
 * แต่เป็นการ"อ่านค่าที่มาจากข้อมูล" — คีย์ของมันคือสตริงจาก scraper ถ้าข้อมูลถูก
 * generate ใหม่แล้วมี label ตัวใหม่โผล่มา ค่าที่ไม่รู้จักจะตกกลับเป็นไทยตามเดิม
 * ไม่ใช่ช่องว่าง
 */
const SPEC_LABEL_EN: Readonly<Record<string, string>> = {
 ขนาด: 'Dimensions',
 คอลเลกชัน: 'Collection',
 การติดตั้ง: 'Installation',
 วัสดุ: 'Material',
 'คุณสมบัติ 1': 'Feature 1',
 'คุณสมบัติ 2': 'Feature 2',
 'คุณสมบัติ 3': 'Feature 3',
};

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
 // ห้องจริงประกอบหน้าสินค้า — คงที่ต่อ slug (ดู components/home/rooms.ts)
 const inSitu = roomFor(product.slug, {
 space: product.category,
 minWidth: 1440,
 minAspect: 1.4,
 });
 const backEntry = fromFinish ? getFinishEntry(fromFinish) : undefined;

 return (
 <FinishProvider finishes={product.finishes} applyTo="root">
 <FinishFromQuery />
 <FinishToQuery />
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
 {/* finish-first §4.3 สั่งให้เลขรุ่นยักษ์อยู่"ทั้งหน้า /finish/[code] ต่อการ์ด
 และหน้า detail" ที่ผ่านมามีแค่ครึ่งเดียว — หน้านี้ไม่มีโหนดไหนถึง 100px เลย
 variant='detail' เกาะซ้ายบนของเวที ต่างจากการ์ดที่เกาะซ้ายล่าง
 ModelNumber ถือ overflow-clip ของตัวเองไว้ เลขจึงล้นออกนอกกรอบจริง
 โดยไม่ดัน scrollWidth ของหน้าที่ 390px (ความเสี่ยง §6 ข้อ 4)
 วางก่อน ProductStage ในลำดับ DOM — ทั้งคู่เป็น positioned และไม่มี
 z-index เวทีจึงวาดทับเลข ซึ่งคือสิ่งที่ต้องการ: เลขอยู่"หลัง" สินค้า */}
 <ModelNumber model={product.model} variant="detail" />
 <ProductStage
 name={product.name[lang]}
 priority
 sizes="(max-width: 1024px) 92vw, 46vw"
 // 4/5 = สัดส่วนของกล่องเวทีบรรทัดบน (`aspect-[4/5]`) เวทีเป็น
 // h-full w-full จึงไม่รู้สัดส่วนของตัวเอง ต้องบอกมัน
 fitAspect={4 / 5}
 />
 </div>
 </div>

 {/* ข้อมูลสินค้า */}
 <div>
 <Reveal>
 <p className="micro mb-3">{t.common.category[product.category]}</p>
 <h1 className="font-display text-section font-normal tracking-wide text-ink">
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
 {lang === 'en' ? (SPEC_LABEL_EN[s.label] ?? s.label) : s.label}
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

 {/* ── ห้องจริงหนึ่งใบต่อหนึ่งสินค้า (task A2) ────────────────────────────
 หน้านี้เคยมีแต่สินค้าตัดพื้นขาวบนเวทีเปล่า ๆ ทั้งที่คลังมีภาพห้อง 88 ใบ
 ภาพเลือกจากแฮชของ slug จึงคงที่ต่อสินค้าหนึ่งชิ้น และกรองด้วย space
 ให้ตรงหมวด — ครัวได้ครัว ห้องน้ำได้ห้องน้ำ

 คำบรรยายบอกตรง ๆ ว่านี่คือบรรยากาศห้อง ไม่ใช่ภาพของสินค้าชิ้นนี้:
 คลังไม่มีเมทาดาทาว่าห้องไหนมีสินค้าอะไรอยู่ การจัดวางให้ดูเหมือน
"ภาพสินค้าตัวนี้ในห้องจริง" จะเป็นการอ้างสิ่งที่ข้อมูลไม่รองรับ */}
 {inSitu && (
 <section aria-label={t.products.inSitu} className="relative isolate mt-8">
 {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
 <img
 src={lifestyleSrc(inSitu, 1440, 1)}
 alt={inSitu.alt[lang]}
 width={inSitu.width}
 height={inSitu.height}
 loading="lazy"
 decoding="async"
 className="h-[52svh] w-full object-cover md:h-[68svh]"
 />
 <p className="micro absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(8,9,10,0.82)] to-transparent px-6 pb-5 pt-16 !text-white/85 md:px-[6vw]">
 {t.products.inSitu}
 </p>
 </section>
 )}

 {/* สินค้าใกล้เคียง */}
 {related.length > 0 && (
 <section className="border-t border-line-6 px-6 py-24 md:px-[6vw]">
 <Reveal className="mb-12">
 <h2 className="font-display text-2xl font-normal tracking-wide text-ink text-section">
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
