'use client';

// หน้า 500 ของแต่ละหน้า: แสดงใต้เมนูและเหนือท้ายเว็บ หน้าตาเดียวกับหน้า 404
// error จาก app/layout.tsx (เช่น DB ล่ม) ไม่มาถึงที่นี่ ไปที่ app/global-error.tsx แทน

import { useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/components/LangProvider';
import { CONTACT } from '@/lib/site';

// ปุ่มเดียวกับหน้า 404 (components/NotFoundContent.tsx)
const btn = 'inline-flex min-h-11 items-center border border-ink px-6 text-[11px] font-normal uppercase tracking-widest2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { lang, t } = useLang();
  const e = t.error;
  useEffect(() => console.error(error), [error]);
  return (
    <section className="flex min-h-[80dvh] flex-col justify-center px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">500</p>
      <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{e.title}</h1>
      <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-stone-600">
        {e.body} {lang === 'th' ? CONTACT.phone : CONTACT.phone_en}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className={`${btn} bg-ink text-paper hover:bg-paper hover:text-ink`}>
          {e.retry}
        </button>
        <Link href="/" className={`${btn} hover:bg-ink hover:text-paper`}>
          {e.home}
        </Link>
      </div>
      {error.digest && <p className="mt-8 text-xs font-light text-stone-600">{e.ref} {error.digest}</p>}
    </section>
  );
}
