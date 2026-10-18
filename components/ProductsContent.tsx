'use client';

// หน้าสินค้ารวม: breadcrumb → หัวข้อ → แถบหมวด 7 หมวด → ตัวกรองซ้าย (ซีรีส์/วัสดุ/แบรนด์ แสดงหลังเลือกหมวด) + ตารางการ์ดขวา
// ตัวกรองอยู่ใน state ของหน้า ไม่ผูก URL
// ponytail: ย้อนกลับจากหน้า detail แล้วตัวกรองรีเซ็ต · ผูก query string เมื่อต้องแชร์ลิงก์ที่กรองแล้ว

import { useState } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import ProductCard from './ProductCard';
import { useLang } from './LangProvider';
import { useCatalog } from './CatalogProvider';
import { SUB_FACETS, facetOptions, filterProducts, type FacetKey, type Picked, type Product } from '@/lib/product-filters';

type Sort = 'featured' | 'name' | 'category';
type Cat = string; // key ของหมวด หรือ 'all'
const NONE: Picked = { category: [], series: [], material: [], brand: [] };

function Facets({
  products,
  cat,
  multiBrand,
  picked,
  toggle,
}: {
  products: Product[];
  cat: string;
  multiBrand: boolean;
  picked: Picked;
  toggle: (k: FacetKey, v: string) => void;
}) {
  const { lang, t } = useLang();
  const { matName } = useCatalog();
  const title: Record<FacetKey, string> = {
    category: t.products.facetCategory,
    series: t.products.facetSeries,
    material: t.products.facetMaterial,
    brand: t.products.facetBrand,
  };
  const label = (k: FacetKey, v: string) => (k === 'material' ? matName(v, lang) : v);
  const groups = SUB_FACETS(multiBrand)
    .map((k) => [k, facetOptions(products, cat, k)] as const)
    .filter(([, opts]) => opts.length > 0);
  if (groups.length === 0) return <p className="py-5 text-sm font-light text-stone-600">{t.products.waiting}</p>;
  return (
    <div className="divide-y divide-warm-200 border-y border-warm-200">
      {groups.map(([k, opts]) => (
        <fieldset key={k} className="pb-4">
          <legend className="pb-2 pt-5 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">{title[k]}</legend>
          {opts.map(([v, n]) => (
            <label key={v} className="flex min-h-[2.25rem] cursor-pointer items-center gap-3 text-sm font-light">
              <input
                type="checkbox"
                checked={picked[k].includes(v)}
                onChange={() => toggle(k, v)}
                className="h-4 w-4 accent-ink"
              />
              <span>
                {label(k, v)} <span className="text-warm-500">({n})</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export default function ProductsContent() {
  const { lang, t } = useLang();
  const [cat, setCat] = useState<Cat>('all');
  const [picked, setPicked] = useState<Picked>(NONE);
  const [sort, setSort] = useState<Sort>('featured');
  const { products, categories, catName } = useCatalog();
  const ORDER = categories.map((c) => c.key);
  const count = (c: string) => products.filter((p) => p.category === c).length;
  const multiBrand = categories.find((c) => c.key === cat)?.multiBrand ?? false;
  const pickCat = (c: Cat) => {
    setCat(c);
    setPicked(NONE);
  };

  const toggle = (k: FacetKey, v: string) =>
    setPicked((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));
  const active = picked.series.length + picked.material.length + picked.brand.length;

  const shown = filterProducts(products, { ...picked, category: cat === 'all' ? [] : [cat] }).sort((a, b) => {
    if (sort === 'name') return a.name[lang].localeCompare(b.name[lang], lang);
    if (sort === 'category') return ORDER.indexOf(a.category) - ORDER.indexOf(b.category);
    return Number(!!b.featured) - Number(!!a.featured);
  });

  const clearBtn = (
    <button
      type="button"
      onClick={() => setPicked(NONE)}
      className="text-[11px] font-normal uppercase tracking-widest2 underline underline-offset-4 hover:text-warm-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink active:scale-[0.98]"
    >
      {t.products.clear}
    </button>
  );

  return (
    <>
      <section className="px-6 pb-10 pt-32 md:px-[6vw] md:pb-14 md:pt-40">
        <nav aria-label="breadcrumb" className="mb-10 text-[11px] uppercase tracking-widest2 text-warm-500">
          <Link href="/" className="hover:text-ink">
            {t.nav.home}
          </Link>
          <span className="mx-2">/</span>
          <span aria-current="page">{t.nav.products}</span>
        </nav>
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.products.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.products.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.products.sub}</p>
        </Reveal>
      </section>

      <nav aria-label={t.products.facetCategory} className="px-6 pb-10 md:px-[6vw]">
        <ul className="flex flex-wrap gap-2">
          {(['all', ...ORDER] as Cat[]).map((c) => {
            const n = c === 'all' ? products.length : count(c);
            return (
              <li key={c}>
                <button
                  type="button"
                  aria-pressed={cat === c}
                  onClick={() => pickCat(c)}
                  className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-light transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] ${
                    cat === c ? 'border-ink bg-ink text-paper' : 'border-warm-300 hover:border-ink'
                  }`}
                >
                  {c === 'all' ? t.common.category.all : catName(c, lang)}
                  <span className={cat === c ? 'text-warm-300' : 'text-stone-600'}>({n})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="px-6 pb-28 md:px-[6vw] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        {/* จอใหญ่: ตัวกรองติดด้านซ้าย · จอเล็ก: พับอยู่ใน <details> ด้านล่าง */}
        <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-light tracking-wide">{t.products.filterBy}</h2>
            {active > 0 && clearBtn}
          </div>
          {cat === 'all' ? (
            <p className="py-5 text-sm font-light text-stone-600">{t.products.pickCategory}</p>
          ) : (
            <Facets products={products} cat={cat} multiBrand={multiBrand} picked={picked} toggle={toggle} />
          )}
        </aside>

        <div>
          <details className="group mb-8 border-y border-warm-200 lg:hidden">
            <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between text-[11px] font-normal uppercase tracking-widest2 [&::-webkit-details-marker]:hidden">
              <span>
                {t.products.filters}
                {active > 0 && ` (${active})`}
              </span>
              <span aria-hidden className="group-open:hidden">+</span>
              <span aria-hidden className="hidden group-open:inline">−</span>
            </summary>
            <div className="pb-5">
              {cat === 'all' ? (
                <p className="py-5 text-sm font-light text-stone-600">{t.products.pickCategory}</p>
              ) : (
                <Facets products={products} cat={cat} multiBrand={multiBrand} picked={picked} toggle={toggle} />
              )}
              {active > 0 && <div className="mt-4">{clearBtn}</div>}
            </div>
          </details>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="text-sm font-light">
              {t.products.found.replace('{n}', String(shown.length))}
            </p>
            <label className="flex items-center gap-3 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">
              {t.products.sort}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="border border-warm-300 bg-paper px-3 py-2 text-sm font-light normal-case tracking-normal text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink"
              >
                <option value="featured">{t.products.sortFeatured}</option>
                <option value="name">{t.products.sortName}</option>
                <option value="category">{t.products.sortCategory}</option>
              </select>
            </label>
          </div>

          {shown.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-warm-500 px-6 py-16 text-center">
              <p className="text-sm font-light">{active > 0 ? t.products.empty : t.products.waiting}</p>
              {active > 0 && <div className="mt-6">{clearBtn}</div>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
