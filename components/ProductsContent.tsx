'use client';

// หน้าสินค้ารวม — กำแพงเฉด + ตัวกรอง + ตัวเลือกมุมมอง
//
// ของเดิมคือปุ่มหมวดสองปุ่มกับกริด ซึ่งน้อยเกินไปสำหรับของ 182 ชิ้น
// รอบนี้กรองได้สามแกน (เฉด · หมวด · ประเภทสินค้า) และเปลี่ยนวิธีแสดงกริดได้
//
// ── ตัวเลขบนชิปต้องเป็นจำนวนที่กดแล้วได้จริง ─────────────────────────────
// นับแบบ faceted: จำนวนบนชิปหนึ่ง ๆ คือ"จำนวนสินค้าที่จะเหลือถ้ากดชิปนี้ โดย
// ตัวกรองแกนอื่นยังอยู่เหมือนเดิม" ไม่ใช่จำนวนรวมทั้งแคตตาล็อกของค่านั้น
// แบบนี้ตัวเลขที่เห็นกับจำนวนการ์ดหลังกดจึงตรงกันเสมอ ตรวจได้ด้วยการนับ DOM
//
// กำแพงยังเป็นแหล่งความจริงเดียวของ"จำนวนต่อเฉด" (finishIndex → panels.count)
// จำนวนนั้นคือทั้งแคตตาล็อกต่อเฉดตามสเปก §3 จึงไม่ผูกกับตัวกรองอื่น และหน้านี้
// ก็ไม่ไปเขียนทับมัน

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import FinishWall, { type WallPanel } from './FinishWall';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { TYPE_LABELS, TYPE_ORDER, type ProductType } from '@/app/_routes/parts/facets';

export type ProductItem = {
 slug: string;
 name: { th: string; en: string };
 category: 'kitchen' | 'bath';
 type: ProductType;
 price: { th: string; en: string };
 /** ทุกเฉดของชิ้นนี้ พร้อมรูปของแต่ละเฉด — กริดที่กรองเฉดอยู่ต้องโชว์รูปเฉดนั้น
 * ไม่ใช่ finishes[0] (ข้อบังคับเดียวกับหน้า /finish/[code] ตรวจได้ที่ img src) */
 finishes: { code: string; accent: string; image: string; image700: string }[];
};

type CategoryFilter = 'all' | 'kitchen' | 'bath';
type ViewMode = 'grid' | 'compact';

const VIEW_LABELS: Record<ViewMode, { th: string; en: string }> = {
 grid: { th: 'กริดปกติ', en: 'Grid' },
 compact: { th: 'กริดแน่น', en: 'Compact' },
};

const COPY = {
 finishFilter: { th: 'เลือกตามเฉด', en: 'Filter by finish' },
 typeFilter: { th: 'ประเภทสินค้า', en: 'Product type' },
 view: { th: 'มุมมอง', en: 'View' },
 all: { th: 'ทั้งหมด', en: 'All' },
 clear: { th: 'ล้างตัวกรอง', en: 'Clear filters' },
 showing: (n: number, total: number) => ({
 th: `แสดง ${n} จาก ${total} รายการ`,
 en: `Showing ${n} of ${total}`,
 }),
 wallHint: {
 th: 'กดแผงเพื่อกรองกริดข้างล่าง — กดซ้ำเพื่อยกเลิก',
 en: 'Pick a panel to filter the grid below — press again to clear',
 },
};

export default function ProductsContent({
 items,
 panels,
}: {
 items: ProductItem[];
 panels: WallPanel[];
}) {
 const { lang, t } = useLang();
 const [finish, setFinish] = useState<string | null>(null);
 const [category, setCategory] = useState<CategoryFilter>('all');
 const [type, setType] = useState<ProductType | 'all'>('all');
 const [view, setView] = useState<ViewMode>('grid');

 // รับสถานะเริ่มต้นจาก URL — หน้าแรกลิงก์มาด้วย ?finish=CP และ ?cat=kitchen
 useEffect(() => {
 const q = new URLSearchParams(window.location.search);
 const cat = q.get('cat');
 if (cat === 'kitchen' || cat === 'bath') setCategory(cat);
 const f = q.get('finish');
 if (f && panels.some((p) => p.code === f)) setFinish(f);
 const ty = q.get('type');
 if (ty && TYPE_ORDER.includes(ty as ProductType)) setType(ty as ProductType);
 }, [panels]);

 /** ตัวกรองทีละแกน เพื่อให้"นับแบบไม่รวมแกนตัวเอง" ทำได้ */
 const matchFinish = useCallback(
 (p: ProductItem, value: string | null) => !value || p.finishes.some((f) => f.code === value),
 [],
 );
 const matchCategory = useCallback(
 (p: ProductItem, value: CategoryFilter) => value === 'all' || p.category === value,
 [],
 );
 const matchType = useCallback(
 (p: ProductItem, value: ProductType | 'all') => value === 'all' || p.type === value,
 [],
 );

 const list = useMemo(
 () =>
 items.filter(
 (p) => matchFinish(p, finish) && matchCategory(p, category) && matchType(p, type),
 ),
 [items, finish, category, type, matchFinish, matchCategory, matchType],
 );

 // จำนวนบนชิปหมวด: กรองด้วยเฉด+ประเภทที่เลือกอยู่ แต่ไม่กรองด้วยหมวด
 const categoryCounts = useMemo(() => {
 const base = items.filter((p) => matchFinish(p, finish) && matchType(p, type));
 return {
 all: base.length,
 kitchen: base.filter((p) => p.category === 'kitchen').length,
 bath: base.filter((p) => p.category === 'bath').length,
 };
 }, [items, finish, type, matchFinish, matchType]);

 // จำนวนบนชิปประเภท: กรองด้วยเฉด+หมวด แต่ไม่กรองด้วยประเภท
 const typeCounts = useMemo(() => {
 const base = items.filter((p) => matchFinish(p, finish) && matchCategory(p, category));
 const out = new Map<ProductType | 'all', number>([['all', base.length]]);
 for (const key of TYPE_ORDER) out.set(key, base.filter((p) => p.type === key).length);
 return out;
 }, [items, finish, category, matchFinish, matchCategory]);

 const activeFinish = panels.find((p) => p.code === finish) ?? null;
 const dirty = finish !== null || category !== 'all' || type !== 'all';

 const chip = (on: boolean) =>
 `border px-4 py-2 text-label uppercase tracking-widest2 transition-colors duration-300 ${
 on ? 'border-ink bg-ink text-surface' : 'border-line-12 text-dim hover:border-ink hover:text-ink'
 }`;

 return (
 <>
 <section className="px-6 pb-10 pt-36 md:px-[8vw] md:pb-12 md:pt-44">
 <Reveal>
 <p className="mb-4 micro">{t.products.kicker}</p>
 <h1 className="font-display text-section font-normal tracking-wide text-ink">
 {t.products.title}
 </h1>
 <p className="mt-4 max-w-lg text-body-sm font-normal leading-relaxed text-dim">
 {t.products.sub(items.length)}
 </p>
 </Reveal>
 </section>

 {/* กำแพงสิบเอ็ดเฉด — ย้ายมาจากหน้าแรก ที่นี่มันคือตัวกรอง ไม่ใช่ประตูหน้าบ้าน */}
 <section className="border-y border-line-6" aria-label={COPY.finishFilter[lang]}>
 <div className="flex items-baseline justify-between gap-4 px-6 pb-3 pt-6 md:px-[8vw]">
 <h2 className="micro">{COPY.finishFilter[lang]}</h2>
 <p className="micro hidden md:block">{COPY.wallHint[lang]}</p>
 </div>
 <FinishWall
 panels={panels}
 mode="filter"
 height="band"
 selected={finish}
 onSelect={(code) => setFinish((cur) => (cur === code ? null : code))}
 />
 </section>

 <section className="px-6 pb-6 pt-10 md:px-[8vw]">
 <div className="flex flex-col gap-6">
 <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.products.filterLabel}>
 <span className="micro mr-1 w-full md:w-auto">{t.products.filterLabel}</span>
 {(['all', 'kitchen', 'bath'] as CategoryFilter[]).map((c) => (
 <button
 key={c}
 type="button"
 onClick={() => setCategory(c)}
 aria-pressed={category === c}
 className={chip(category === c)}
 >
 {c === 'all' ? COPY.all[lang] : t.common.category[c]}{' '}
 <span aria-hidden>({categoryCounts[c]})</span>
 </button>
 ))}
 </div>

 <div className="flex flex-wrap items-center gap-2" role="group" aria-label={COPY.typeFilter[lang]}>
 <span className="micro mr-1 w-full md:w-auto">{COPY.typeFilter[lang]}</span>
 <button
 type="button"
 onClick={() => setType('all')}
 aria-pressed={type === 'all'}
 className={chip(type === 'all')}
 >
 {COPY.all[lang]} <span aria-hidden>({typeCounts.get('all') ?? 0})</span>
 </button>
 {TYPE_ORDER.filter((key) => (typeCounts.get(key) ?? 0) > 0).map((key) => (
 <button
 key={key}
 type="button"
 onClick={() => setType(key)}
 aria-pressed={type === key}
 className={chip(type === key)}
 >
 {TYPE_LABELS[key][lang]} <span aria-hidden>({typeCounts.get(key) ?? 0})</span>
 </button>
 ))}
 </div>

 <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-6 pt-5">
 <div className="flex items-center gap-3">
 <p className="text-body-sm text-dim" data-showing>
 {COPY.showing(list.length, items.length)[lang]}
 {activeFinish ? ` · ${activeFinish.name[lang]}` : ''}
 </p>
 {dirty && (
 <button
 type="button"
 onClick={() => {
 setFinish(null);
 setCategory('all');
 setType('all');
 }}
 className="text-label uppercase tracking-widest2 text-ink underline underline-offset-4"
 >
 {COPY.clear[lang]}
 </button>
 )}
 </div>

 <div className="flex items-center gap-2" role="group" aria-label={COPY.view[lang]}>
 <span className="micro mr-1">{COPY.view[lang]}</span>
 {(['grid', 'compact'] as ViewMode[]).map((v) => (
 <button
 key={v}
 type="button"
 onClick={() => setView(v)}
 aria-pressed={view === v}
 className={chip(view === v)}
 >
 {VIEW_LABELS[v][lang]}
 </button>
 ))}
 </div>
 </div>
 </div>
 </section>

 <section className="px-6 pb-28 md:px-[8vw]">
 {list.length === 0 ? (
 <p className="py-20 text-center text-body-sm text-dim">{t.products.empty}</p>
 ) : (
 <div
 key={`${finish}-${category}-${type}-${view}`}
 data-grid={view}
 className={
 view === 'compact'
 ? 'grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-5'
 : 'grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3'
 }
 >
 {list.map((p, i) => (
 <Reveal key={p.slug} delay={(i % 3) * 0.08} y={24}>
 <ProductCard product={p} finishCode={finish ?? undefined} compact={view === 'compact'} />
 </Reveal>
 ))}
 </div>
 )}
 </section>
 </>
 );
}
