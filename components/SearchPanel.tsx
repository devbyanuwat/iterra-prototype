'use client';

// แผงค้นหาเต็มจอ: <dialog> แบบ modal (เบราว์เซอร์จัดการ focus, Escape และชั้นบนสุดให้)
// data-lenis-prevent: ไม่ให้ Lenis เลื่อนหน้าข้างหลังตอนเลื่อนผลค้นหา

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import { buildIndex, search, GROUPS } from '@/lib/search';
import { PAGES } from '@/lib/i18n';
import { products } from '@/lib/products';
import { posts } from '@/lib/posts';

const index = buildIndex({ products, posts, projects: [], pages: PAGES });

export default function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(index, query), [query]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery('');
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      onClose={onClose}
      aria-label={t.search.open}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-ink p-0 text-paper"
    >
      <div className="flex items-center gap-4 px-6 py-5 md:px-[4vw]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.open}
          className="h-12 min-w-0 flex-1 border-b border-paper/30 bg-transparent text-base font-extralight md:text-xl tracking-wide text-paper placeholder:text-paper/40 focus-visible:border-paper focus-visible:outline-none"
        />
        <button type="button" onClick={onClose} aria-label={t.search.close} className="flex h-11 w-11 items-center justify-center text-2xl font-extralight focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper">
          ×
        </button>
      </div>
      <div className="px-6 pb-16 pt-4 md:px-[4vw]" aria-live="polite">
        {query.trim() === '' && <p className="text-sm font-light text-paper/60">{t.search.hint}</p>}
        {query.trim() !== '' && results.length === 0 && <p className="text-sm font-light text-paper/60">{t.search.none}</p>}
        {GROUPS.map((group) => {
          const items = results.filter((e) => e.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mb-8">
              <h2 className="mb-2 text-[11px] font-normal uppercase tracking-widest2 text-paper/50">{t.search.groups[group]}</h2>
              <ul>
                {items.map((e) => (
                  <li key={e.href}>
                    <Link href={e.href} onClick={onClose} className="flex min-h-11 items-center border-b border-paper/10 py-2 text-lg font-extralight tracking-wide hover:text-paper/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper">
                      {e.title[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
