'use client';

// หน้าติดต่อ: ฟอร์มส่งเข้า DB ผ่าน submitInquiryAction (app/contact/actions.ts) · ยังไม่ส่งอีเมล ผู้ดูแลอ่านที่ /admin/inquiries/
// ช่อง website ซ่อนไว้ดักบอท · ตรวจข้อมูลจริงที่ฝั่ง server แล้วแปลรหัสข้อผิดตามภาษาจาก lib/i18n.ts
// + แผนที่ placeholder (ของจริงฝัง Google Maps embed ตรงนี้)

import { useEffect, useRef, useState } from 'react';
import Placeholder from './Placeholder';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CONTACT } from '@/lib/site';
import { submitInquiryAction } from '@/app/contact/actions';
import type { InquiryError } from '@/lib/server/inquiries';

const field = 'w-full border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-ink';
const caption = 'mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500';

export default function ContactContent() {
  const { lang, t } = useLang();
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<InquiryError | 'server' | ''>('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // เคลียร์ timer ของ toast ตอน unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError('');
    let r: Awaited<ReturnType<typeof submitInquiryAction>>;
    try {
      r = await submitInquiryAction({
        name: fd.get('name'),
        email: fd.get('email'),
        message: fd.get('message'),
        website: fd.get('website'),
      });
    } catch {
      r = { ok: false, error: 'server' };
    } finally {
      setBusy(false);
    }
    if (!r.ok) return setError(r.error);
    form.reset();
    setToast(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(false), 4200);
  };

  return (
    <>
      <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">CONTACT</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.contact.title}</h1>
          <p className="mt-4 text-sm font-light text-warm-500">{t.contact.sub}</p>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-[6vw]">
          {/* ฟอร์ม */}
          <Reveal>
            <form onSubmit={handleSubmit} noValidate className="relative space-y-7">
              <div>
                <label htmlFor="name" className={caption}>
                  {t.contact.name}
                </label>
                <input id="name" name="name" required maxLength={100} autoComplete="name" className={field} />
              </div>
              <div>
                <label htmlFor="email" className={caption}>
                  {t.contact.email}
                </label>
                <input id="email" name="email" required maxLength={200} autoComplete="email" className={field} />
              </div>
              <div>
                <label htmlFor="message" className={caption}>
                  {t.contact.message}
                </label>
                <textarea id="message" name="message" required maxLength={2000} rows={5} className={`${field} resize-none`} />
              </div>
              {/* ช่องดักบอท: คนมองไม่เห็นและ Tab ไปไม่ถึง บอทที่กรอกทุกช่องจะกรอกช่องนี้ */}
              <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <p role="alert" className="min-h-5 text-[13px] font-light text-[#9f2d20]">
                {error && t.contact.errors[error]}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="border border-ink px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {busy ? t.contact.sending : t.contact.send}
              </button>
            </form>
          </Reveal>

          {/* ข้อมูล + แผนที่ */}
          <Reveal delay={0.15}>
            <address className="mb-8 space-y-2.5 text-sm font-light not-italic leading-relaxed text-stone-600">
              <p>{lang === 'th' ? CONTACT.address_th : CONTACT.address_en}</p>
              <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
              <p>{CONTACT.email}</p>
              <p>{lang === 'th' ? CONTACT.hours_th : CONTACT.hours_en}</p>
            </address>
            <Placeholder label="แผนที่ Google Maps (ฝังของจริงตรงนี้)" ratio="16/9" />
          </Reveal>
        </div>
      </section>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-8 left-1/2 z-[70] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 border border-ink/10 bg-ink px-6 py-4 text-center text-[13px] font-light text-paper shadow-2xl transition-all duration-500 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {t.contact.toast}
      </div>
    </>
  );
}
