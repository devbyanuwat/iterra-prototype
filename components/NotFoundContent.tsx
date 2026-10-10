'use client';

// หน้า 404: แทนหน้าเริ่มต้นของ Next · มีทางไปต่อ 3 ทาง (หน้าแรก สินค้า ค้นหา)

import Link from 'next/link';
import { useLang } from './LangProvider';
import { OPEN_SEARCH } from './Nav';

const btn = 'inline-flex min-h-11 items-center border border-ink px-6 text-[11px] font-normal uppercase tracking-widest2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';

export default function NotFoundContent() {
  const { t } = useLang();
  const n = t.notFound;
  return (
    <section className="flex min-h-[80dvh] flex-col justify-center px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">404</p>
      <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{n.title}</h1>
      <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-stone-600">{n.body}</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className={`${btn} bg-ink text-paper hover:bg-paper hover:text-ink`}>
          {n.home}
        </Link>
        <Link href="/products/" className={`${btn} hover:bg-ink hover:text-paper`}>
          {n.products}
        </Link>
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))} className={`${btn} hover:bg-ink hover:text-paper`}>
          {n.search}
        </button>
      </div>
    </section>
  );
}
