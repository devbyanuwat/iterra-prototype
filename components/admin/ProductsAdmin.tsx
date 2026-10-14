'use client';

// mockup หลังบ้าน: จัดการสินค้า 7 หมวด ธีมกระจกแบบ iOS 26 ตามที่ผู้ดูแลเลือก (2026-10-14)
// ข้อมูลเริ่มจาก lib/products.ts แล้วแก้ในหน่วยความจำ รีเฟรชแล้วหาย · ไม่มี API ไม่มีล็อกอิน
// ทับโครงเว็บด้วย fixed overlay แทนการแยก layout · ponytail: แยกเป็น route group (site)/(admin) ตอนทำหลังบ้านจริง
// ข้อความเป็นภาษาไทยอย่างเดียวตาม design.md ส่วน Back office จึงยังไม่ย้ายเข้า lib/i18n.ts

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, products as SEED, type Category, type Material } from '@/lib/products';
import { ANNOUNCEMENT, markSeen } from '@/lib/announcement';

type Status = 'live' | 'hidden';
type Row = {
  slug: string;
  category: Category;
  brand: string;
  series: string;
  material: Material | '';
  th: string;
  en: string;
  specs: string;
  image: string;
  status: Status;
  edited: string;
};

const CAT: Record<Category, string> = {
  kitchen: 'ชุดครัว',
  wardrobe: 'ตู้เสื้อผ้า',
  accessory: 'อุปกรณ์เสริม',
  faucet: 'ก๊อกล้างจาน',
  sink: 'อ่างล้างจาน',
  appliance: 'เครื่องใช้ไฟฟ้า',
  countertop: 'ท็อปหิน',
};
const MAT: Record<Material, string> = { brass: 'ทองเหลือง', stainless: 'สเตนเลสสตีล', castIron: 'เหล็กหล่อ' };
const GLASS_KEY = 'admin:glass';
// ต่ำสุด 0.7 คิดจากกรณีแย่สุด: พื้นหลังดำสนิท (ภาพ 70% ทับ warm-200) แล้วกระจกขาว 0.7 ทับ ได้พื้นราว rgb(200,199,198)
// stone-600 บนพื้นนี้ = 4.5:1 พอดี จึงอ่านผ่านทุกภาพพื้นหลัง · ต่ำกว่านี้ต้องวัดจาก pixel ของภาพจริง
const GLASS_MIN = 0.7;
const GLASS_MAX = 0.95;

const today = () => new Date().toISOString().slice(0, 10);
const seed = (): Row[] =>
  SEED.map((p) => ({
    slug: p.slug,
    category: p.category,
    brand: p.brand,
    series: p.series,
    material: p.material ?? '',
    th: p.name.th,
    en: p.name.en,
    specs: p.specs.map((s) => `${s.label}: ${s.value}`).join('\n'),
    image: p.images[0],
    status: 'live',
    edited: '2026-10-03',
  }));
const blank = (category: Category): Row => ({
  slug: '',
  category,
  brand: '',
  series: '',
  material: '',
  th: '',
  en: '',
  specs: '',
  image: '',
  status: 'live',
  edited: today(),
});

const input =
  'h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-base font-normal text-ink outline-none transition focus:border-ink focus:bg-white';
const label = 'mb-2 block text-sm font-normal text-ink';
const pill = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-normal transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
    on ? 'bg-ink text-paper' : 'glass text-ink hover:bg-white'
  }`;
const solid =
  'inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-normal text-paper transition hover:bg-stone-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const ghost =
  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-normal text-ink transition hover:bg-white/70 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink';

function readGlass() {
  try {
    const v = Number(localStorage.getItem(GLASS_KEY));
    return v >= GLASS_MIN && v <= GLASS_MAX ? v : 0.8;
  } catch {
    return 0.8;
  }
}

export default function ProductsAdmin() {
  const [rows, setRows] = useState<Row[]>(seed);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [brand, setBrand] = useState('');
  const [q, setQ] = useState('');
  const [glass, setGlass] = useState(0.8);
  const [form, setForm] = useState<{ row: Row; index: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<number | null>(null);
  const [saved, setSaved] = useState('');
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setGlass(readGlass());
    // ประกาศตอนเข้าเว็บไม่ควรเด้งทับหลังบ้าน · effect นี้รันก่อนของ Announcement เพราะ main อยู่ก่อนใน layout
    try {
      markSeen(ANNOUNCEMENT.id, window.sessionStorage);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(GLASS_KEY, String(glass));
    } catch {}
  }, [glass]);
  useEffect(() => {
    if (form) formRef.current?.showModal();
    else formRef.current?.close();
  }, [form]);
  useEffect(() => {
    if (del !== null) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const brands = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort(), [rows]);
  const shown = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (cat === 'all' || r.category === cat) && (!brand || r.brand === brand))
    .filter(({ r }) => !q || `${r.th} ${r.en} ${r.series} ${r.brand}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.r.edited.localeCompare(a.r.edited));

  const set = (patch: Partial<Row>) => form && setForm({ ...form, row: { ...form.row, ...patch } });
  const multiBrand = form && CATEGORIES.find((c) => c.key === form.row.category)?.multiBrand;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const r = form.row;
    const err: Record<string, string> = {};
    // เรียงตามลำดับช่องในฟอร์ม focus จะได้ไปช่องแรกที่ผิด
    if (!r.brand.trim()) err.brand = 'กรุณากรอกแบรนด์';
    if (!r.th.trim()) err.th = 'กรุณากรอกชื่อสินค้าภาษาไทย';
    setErrors(err);
    if (Object.keys(err).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(err)[0]}"]`)?.focus();
      return;
    }
    const row = { ...r, slug: r.slug || `new-${Date.now()}`, edited: today() };
    setRows((all) => (form.index < 0 ? [row, ...all] : all.map((x, i) => (i === form.index ? row : x))));
    setSaved(`บันทึก ${row.th} แล้ว (ในหน้านี้เท่านั้น)`);
    setForm(null);
  }

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] overflow-y-auto bg-warm-200 font-normal text-ink"
      style={{ '--glass': glass } as React.CSSProperties}
    >
      {/* พื้นหลังให้กระจกมีอะไรให้เบลอ: ภาพครัวจางกับแสงอุ่น 2 ดวง */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <img src="/media/scenes/about-hero.webp" alt="" className="h-full w-full object-cover opacity-70" />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-amber-200/60 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-stone-300/70 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-7xl gap-4 p-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <aside className="glass flex flex-col gap-6 rounded-[28px] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div>
            <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
            <p className="mt-1 text-xs text-stone-600">หลังบ้าน (ตัวอย่าง)</p>
          </div>
          <nav aria-label="เมนูหลังบ้าน">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {['บทความ', 'ผลงาน', 'แคตตาล็อก'].map((x) => (
                <li key={x}>
                  <span className="flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm text-stone-600">
                    {x}
                  </span>
                </li>
              ))}
              <li>
                <span aria-current="page" className="flex min-h-11 items-center rounded-full bg-ink px-4 text-sm text-paper">
                  สินค้า
                </span>
              </li>
            </ul>
          </nav>
          <div className="mt-auto space-y-4">
            <label className="block text-sm">
              ความทึบของกระจก <span className="text-stone-600">{Math.round(glass * 100)}%</span>
              <input
                type="range"
                min={GLASS_MIN}
                max={GLASS_MAX}
                step={0.05}
                value={glass}
                onChange={(e) => setGlass(Number(e.target.value))}
                className="mt-2 block w-full accent-ink"
              />
            </label>
            <Link href="/" target="_blank" className={ghost}>
              เปิดหน้าเว็บ
            </Link>
          </div>
        </aside>

        <div className="space-y-4 lg:space-y-6">
          <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
            <div>
              <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">สินค้า</h1>
              <p className="mt-1 text-sm text-stone-600">
                {rows.length} รายการ · ข้อมูลตัวอย่าง แก้แล้วไม่บันทึกจริง
              </p>
            </div>
            <button type="button" className={solid} onClick={() => setForm({ row: blank(cat === 'all' ? 'kitchen' : cat), index: -1 })}>
              เพิ่มสินค้า
            </button>
          </header>

          <div role="status" className="min-h-6 px-2 text-sm text-ink">
            {saved}
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="หมวดสินค้า">
            {(['all', ...CATEGORIES.map((c) => c.key)] as const).map((c) => (
              <li key={c}>
                <button type="button" aria-pressed={cat === c} className={pill(cat === c)} onClick={() => setCat(c)}>
                  {c === 'all' ? 'ทั้งหมด' : CAT[c]}
                  <span className={cat === c ? 'text-warm-300' : 'text-stone-600'}>
                    {c === 'all' ? rows.length : rows.filter((r) => r.category === c).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="glass rounded-[28px] p-3 md:p-4">
            <div className="flex flex-wrap gap-3 p-2">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อ ซีรีส์ หรือแบรนด์"
                aria-label="ค้นหาสินค้า"
                className={`${input} max-w-xs flex-1`}
              />
              <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="กรองตามแบรนด์" className={`${input.replace('w-full ', '')} w-48`}>
                <option value="">ทุกแบรนด์</option>
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>

            {shown.length === 0 ? (
              <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">
                <p className="text-sm">ยังไม่มีสินค้าในหมวดนี้</p>
                <button type="button" className={`${solid} mt-5`} onClick={() => setForm({ row: blank(cat === 'all' ? 'kitchen' : cat), index: -1 })}>
                  เพิ่มสินค้า
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-white/70">
                {shown.map(({ r, i }) => (
                  <li key={r.slug} className="flex flex-wrap items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50 md:flex-nowrap">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                      {r.image && <img src={r.image} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setErrors({});
                          setForm({ row: r, index: i });
                        }}
                        className="block max-w-full truncate text-left text-sm hover:underline"
                      >
                        {r.th}
                      </button>
                      <p className="truncate text-xs text-stone-600">
                        {CAT[r.category]} · {r.brand} {r.series}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        r.status === 'live' ? 'bg-ink text-paper' : 'border border-ink text-ink'
                      }`}
                    >
                      {r.status === 'live' ? 'เผยแพร่' : 'ซ่อน'}
                    </span>
                    <span className="hidden w-24 text-xs text-stone-600 md:block">{r.edited}</span>
                    <div className="flex">
                      <button
                        type="button"
                        className={ghost}
                        onClick={() => {
                          setErrors({});
                          setForm({ row: r, index: i });
                        }}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className={ghost}
                        onClick={() =>
                          setRows((all) =>
                            all.map((x, j) => (j === i ? { ...x, status: x.status === 'live' ? 'hidden' : 'live', edited: today() } : x)),
                          )
                        }
                      >
                        {r.status === 'live' ? 'ซ่อน' : 'แสดง'}
                      </button>
                      <button type="button" className={`${ghost} text-[#9f2d20]`} onClick={() => setDel(i)}>
                        ลบ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="form-title"
        className="glass w-[min(94vw,640px)] rounded-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      >
        {form && (
          <form onSubmit={save} noValidate className="space-y-6 p-6">
            <h2 id="form-title" className="text-xl font-light">
              {form.index < 0 ? 'เพิ่มสินค้า' : `แก้ไข ${form.row.th}`}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={label}>
                หมวด (จำเป็น)
                <select
                  value={form.row.category}
                  onChange={(e) => set({ category: e.target.value as Category })}
                  className={`${input} mt-2`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {CAT[c.key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                แบรนด์ (จำเป็น)
                <input
                  name="brand"
                  list="brands"
                  value={form.row.brand}
                  onChange={(e) => set({ brand: e.target.value })}
                  aria-invalid={!!errors.brand}
                  aria-describedby="brand-hint"
                  className={`${input} mt-2 ${errors.brand ? 'border-[#9f2d20]' : ''}`}
                />
                <datalist id="brands">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <span id="brand-hint" className={`mt-1.5 block text-xs ${errors.brand ? 'text-[#9f2d20]' : 'text-stone-600'}`}>
                  {errors.brand || (multiBrand ? 'หมวดนี้ต้องมีอย่างน้อย 3 แบรนด์บนหน้าเว็บ' : 'พิมพ์ใหม่หรือเลือกจากที่มี')}
                </span>
              </label>
              <label className={label}>
                ซีรีส์
                <input value={form.row.series} onChange={(e) => set({ series: e.target.value })} className={`${input} mt-2`} />
              </label>
              <label className={label}>
                วัสดุ
                <select
                  value={form.row.material}
                  onChange={(e) => set({ material: e.target.value as Material | '' })}
                  className={`${input} mt-2`}
                >
                  <option value="">ไม่ระบุ</option>
                  {(Object.keys(MAT) as Material[]).map((m) => (
                    <option key={m} value={m}>
                      {MAT[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                ไทย: ชื่อสินค้า (จำเป็น)
                <input
                  name="th"
                  value={form.row.th}
                  onChange={(e) => set({ th: e.target.value })}
                  aria-invalid={!!errors.th}
                  aria-describedby="th-error"
                  className={`${input} mt-2 ${errors.th ? 'border-[#9f2d20]' : ''}`}
                />
                {errors.th && (
                  <span id="th-error" className="mt-1.5 block text-sm text-[#9f2d20]">
                    {errors.th}
                  </span>
                )}
              </label>
              <label className={label}>
                English: ชื่อสินค้า
                <input value={form.row.en} onChange={(e) => set({ en: e.target.value })} className={`${input} mt-2`} />
              </label>
            </div>
            <label className={label}>
              สเปก
              <span className="mt-1 block text-xs text-stone-600">บรรทัดละ 1 ข้อ เช่น วัสดุ: ทองเหลือง</span>
              <textarea
                value={form.row.specs}
                onChange={(e) => set({ specs: e.target.value })}
                className={`${input} mt-2 min-h-32 py-2.5`}
              />
            </label>
            <label className="block cursor-pointer rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-8 text-center text-sm transition hover:border-ink focus-within:border-ink">
              {form.row.image ? (
                <img src={form.row.image} alt="" className="mx-auto mb-3 h-24 w-24 rounded-xl bg-white object-contain" />
              ) : null}
              กดเพื่อเลือกรูปสินค้า
              <span className="mt-1 block text-xs text-stone-600">JPG, PNG หรือ WebP ไม่เกิน 5 MB · ตัวอย่างนี้ไม่อัปโหลดจริง</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) set({ image: URL.createObjectURL(f) });
                }}
              />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={ghost} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className={solid}>
                บันทึก
              </button>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="del-title"
        className="glass w-[min(92vw,440px)] rounded-[28px] p-6 text-ink backdrop:bg-ink/30"
      >
        {del !== null && rows[del] && (
          <>
            <h2 id="del-title" className="text-lg font-light">
              ลบ {rows[del].th}
            </h2>
            <p className="mt-3 text-sm text-stone-600">สินค้านี้จะหายจากหน้าเว็บ และกู้คืนไม่ได้</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" autoFocus className={ghost} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-full bg-[#9f2d20] px-6 text-sm text-paper active:scale-[0.98]"
                onClick={() => {
                  setSaved(`ลบ ${rows[del].th} แล้ว (ในหน้านี้เท่านั้น)`);
                  setRows((all) => all.filter((_, j) => j !== del));
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
