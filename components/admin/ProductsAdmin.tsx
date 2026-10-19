'use client';

// หลังบ้าน: จัดการสินค้า · ข้อมูลมาจาก DB ทาง props · แก้ผ่าน Server Functions แล้ว router.refresh() ดึงรายการใหม่
// ข้อความเป็นภาษาไทยอย่างเดียวตาม design.md ส่วน Back office · โครงและพื้นหลังอยู่ใน AdminShell
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { AdminProduct } from '@/lib/server/products';
import type { BrandRow, CategoryRow, MaterialRow } from '@/lib/server/taxonomy';
import { deleteProductAction, setPublishedAction } from '@/app/admin/(panel)/products/actions';
import ProductForm, { blank, toDraft, type Draft } from './ProductForm';
import { danger, dangerSolid, ghost, input, pill, solid } from './ui';

type Props = { products: AdminProduct[]; categories: CategoryRow[]; brands: BrandRow[]; materials: MaterialRow[] };

export default function ProductsAdmin({ products, categories, brands, materials }: Props) {
  const router = useRouter();
  const [cat, setCat] = useState('all');
  const [brand, setBrand] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Draft | null>(null);
  const [del, setDel] = useState<AdminProduct | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = formRef.current;
    // ใช้ฉบับจากประวัติแล้ว form ไม่เปลี่ยน (state อยู่ใน ProductForm) · เช็ก d.open กันเปิดซ้ำ
    // focus หัวข้อแทนปุ่มแรก ไม่ให้ขึ้นกรอบ focus ที่ปุ่มยกเลิกตอนเปิดบนมือถือ
    if (form && d && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('#form-title')?.focus();
    } else if (!form) d?.close();
  }, [form]);
  useEffect(() => {
    if (del) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const catName = (k: string) => categories.find((c) => c.key === k)?.name.th ?? k;
  const firstCat = categories[0]?.key ?? '';
  const shown = products
    .filter((p) => (cat === 'all' || p.category === cat) && (!brand || String(p.brandId) === brand))
    .filter((p) => !q || `${p.th} ${p.en} ${p.series} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  const open = (d: Draft) => setForm(d);

  // คืนข้อความผิด หรือ null ถ้าสำเร็จ
  async function run(fn: () => Promise<Result>, done: string): Promise<string | null> {
    setBusy(true);
    let r: Result;
    try {
      r = await fn();
    } catch {
      return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    } finally {
      setBusy(false);
    }
    if (!r.ok) return r.error;
    setMsg(done);
    router.refresh();
    return null;
  }

  const filters = (searchClass: string, selectClass: string) => (
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาชื่อ ซีรีส์ หรือแบรนด์"
        aria-label="ค้นหาสินค้า"
        className={`${input} ${searchClass}`}
      />
      <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="กรองตามแบรนด์" className={`${input.replace('w-full ', '')} shrink-0 ${selectClass}`}>
        <option value="">ทุกแบรนด์</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </>
  );
  const empty = (
    <>
      <p className="text-sm">ยังไม่มีสินค้าในหมวดนี้</p>
      <button type="button" className={`${solid} mt-5`} onClick={() => open(blank(cat === 'all' ? firstCat : cat))}>
        เพิ่มสินค้า
      </button>
    </>
  );
  const thumb = (p: AdminProduct) => (
    <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
      {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-contain" />}
    </span>
  );
  const status = (p: AdminProduct, size: string) => (
    <>
      <span className={`shrink-0 rounded-full text-xs ${size} ${p.published ? 'bg-ink text-paper' : 'border border-ink text-ink'}`}>
        {p.published ? 'เผยแพร่' : 'ซ่อน'}
      </span>
      {p.draft && <span className={`shrink-0 rounded-full border border-dashed border-ink text-xs ${size}`}>มีร่าง</span>}
    </>
  );
  const actions = (p: AdminProduct, extra: string) => (
    <>
      <button type="button" className={`${ghost} ${extra}`} onClick={() => open(toDraft(p))}>
        แก้ไข
      </button>
      <button
        type="button"
        className={`${ghost} ${extra}`}
        disabled={busy}
        onClick={async () => {
          const error = await run(() => setPublishedAction(p.id, !p.published), `${p.published ? 'ซ่อน' : 'แสดง'} ${p.th} แล้ว`);
          if (error) setMsg(error);
        }}
      >
        {p.published ? 'ซ่อน' : 'แสดง'}
      </button>
      <button type="button" className={`${ghost} ${danger} ${extra}`} onClick={() => setDel(p)}>
        ลบ
      </button>
    </>
  );

  return (
    <>
      <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">สินค้า</h1>
          <p className="mt-1 text-sm text-stone-600">{products.length} รายการ</p>
        </div>
        <button type="button" className={solid} onClick={() => open(blank(cat === 'all' ? firstCat : cat))}>
          เพิ่มสินค้า
        </button>
      </header>

      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>

      {/* มือถือ: pill เลื่อนข้างแถวเดียว ยื่นเลยขอบให้รู้ว่าเลื่อนได้ · ตั้งแต่ md ตัดบรรทัดแบบเดิม */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0" aria-label="หมวดสินค้า">
        {['all', ...categories.map((c) => c.key)].map((c) => (
          <li key={c} className="shrink-0">
            <button type="button" aria-pressed={cat === c} className={`${pill(cat === c)} whitespace-nowrap`} onClick={() => setCat(c)}>
              {c === 'all' ? 'ทั้งหมด' : catName(c)}
              <span className={cat === c ? 'text-warm-300' : 'text-stone-600'}>
                {c === 'all' ? products.length : products.filter((p) => p.category === c).length}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* ต่ำกว่า lg: กล่องค้นหากับการ์ดสินค้าแยกกันตาม docs/mockups/admin-mobile.html · ตั้งแต่ lg: แถวในกล่องเดียวแบบเดิม
          แยก 2 ชุดเพราะ .glass เป็น CSS ธรรมดา ใส่ lg: นำหน้าไม่ได้ */}
      <div className="space-y-3 lg:hidden">
        <div className="glass flex gap-2 rounded-[28px] p-3">{filters('min-w-0 flex-1', 'w-[7.25rem]')}</div>
        {shown.length === 0 ? (
          <div className="glass rounded-[28px] px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id} className="glass rounded-[24px] p-3">
                <button type="button" onClick={() => open(toDraft(p))} className="flex w-full items-start gap-3 rounded-2xl p-1 text-left">
                  {thumb(p)}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm leading-snug">{p.th}</span>
                    <span className="mt-1 block truncate text-xs text-stone-600">
                      {catName(p.category)} · {p.brand} {p.series}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs">
                      {status(p, 'px-2.5 py-0.5')}
                      <span className="text-stone-600">{p.updated}</span>
                    </span>
                  </span>
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1.5">{actions(p, 'justify-center bg-white/60')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="glass hidden rounded-[28px] p-4 lg:block">
        <div className="flex flex-wrap gap-3 p-2">{filters('max-w-xs flex-1', 'w-48')}</div>

        {shown.length === 0 ? (
          <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="divide-y divide-white/70">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50">
                {thumb(p)}
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(toDraft(p))} className="block max-w-full truncate text-left text-sm hover:underline">
                    {p.th}
                  </button>
                  <p className="truncate text-xs text-stone-600">
                    {catName(p.category)} · {p.brand} {p.series}
                  </p>
                </div>
                {status(p, 'px-3 py-1')}
                <span className="w-24 text-xs text-stone-600">{p.updated}</span>
                <div className="flex">{actions(p, '')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="form-title"
        className="glass bottom-0 top-auto !m-0 w-full max-w-none overflow-hidden rounded-b-none rounded-t-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm md:top-0 md:!m-auto md:w-[min(94vw,680px)] md:rounded-[28px]"
      >
        {/* มือถือ: sheet จากขอบล่าง หัวมีปุ่มยกเลิก ปุ่มบันทึกติดล่าง · ตั้งแต่ md: กล่องกลางจอแบบเดิม */}
        {form && (
          <ProductForm
            initial={form}
            categories={categories}
            brands={brands}
            materials={materials}
            onCancel={() => setForm(null)}
            onSaved={(m) => {
              setMsg(m);
              router.refresh();
              setForm(null);
            }}
          />
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="del-title"
        className="bottom-0 top-auto !m-0 w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/30 md:top-0 md:!m-auto md:w-[min(92vw,440px)]"
      >
        {/* มือถือ: sheet จากขอบล่าง ปุ่ม 2 ช่องเท่ากัน · ตั้งแต่ md: กล่องกลางจอ */}
        {del && (
          <div className="glass m-2 rounded-[28px] p-6 md:m-0" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <h2 id="del-title" className="text-lg font-light">
              ลบ {del.th}
            </h2>
            <p className="mt-3 text-sm text-stone-600">สินค้านี้และประวัติการแก้ไขจะหายไป กู้คืนไม่ได้ ถ้าแค่ไม่อยากให้เห็น ใช้ปุ่มซ่อนแทน</p>
            <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:justify-end">
              <button type="button" autoFocus className={`${ghost} justify-center bg-white/60 md:bg-transparent`} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`${dangerSolid} justify-center`}
                disabled={busy}
                onClick={async () => {
                  const error = await run(() => deleteProductAction(del.id), `ลบ ${del.th} แล้ว`);
                  if (error) setMsg(error);
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
