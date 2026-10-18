'use client';

// หน้า 500 เมื่อ app/layout.tsx ล่ม (เช่น ต่อ DB ไม่ได้) · แทน layout ทั้งหมด จึงต้องมี html/body เอง
// ไม่มี LangProvider ให้สลับภาษา จึงแสดงไทยและอังกฤษพร้อมกัน

import './globals.css';
import { dict } from '@/lib/i18n';
import { CONTACT, SITE_NAME } from '@/lib/site';

const btn = 'inline-flex min-h-11 items-center border border-ink px-6 text-[11px] font-normal uppercase tracking-widest2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const th = dict.th.error;
  const en = dict.en.error;
  return (
    <html lang="th">
      <head>
        <title>{`${th.title} | ${SITE_NAME}`}</title>
        <meta name="robots" content="noindex" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&family=Noto+Sans+Thai:wght@200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <main className="flex min-h-dvh flex-col justify-center px-6 py-20 md:px-[8vw]">
          <p className="mb-10 text-lg font-light tracking-widest2">{SITE_NAME}</p>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">500</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{th.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-stone-600">
            {th.body} {CONTACT.phone}
          </p>
          <p lang="en" className="mt-6 text-xl font-extralight tracking-wide">{en.title}</p>
          <p lang="en" className="mt-2 max-w-lg text-sm font-light leading-relaxed text-stone-600">
            {en.body} {CONTACT.phone_en}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={() => retry()} className={`${btn} bg-ink text-paper hover:bg-paper hover:text-ink`}>
              {th.retry} / {en.retry}
            </button>
            {/* a ธรรมดา ไม่ใช้ Link: ให้โหลดหน้าแรกใหม่ทั้งหน้า */}
            <a href="/" className={`${btn} hover:bg-ink hover:text-paper`}>
              {th.home} / {en.home}
            </a>
          </div>
          {error.digest && <p className="mt-8 text-xs font-light text-stone-600">{th.ref} / {en.ref} {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
