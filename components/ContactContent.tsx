'use client';

// หน้าติดต่อ: ฟอร์ม UI อย่างเดียว (submit → toast, ไม่ส่งจริง)
// จุดเปลี่ยนเป็นของจริง: ต่อ handleSubmit เข้ากับ endpoint / อีเมลจริง
// + แผนที่ placeholder (ของจริงฝัง Google Maps embed ตรงนี้)

import { useEffect, useRef, useState } from 'react';
import Placeholder from './Placeholder';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CONTACT } from '@/lib/site';

export default function ContactContent() {
  const { t } = useLang();
  const [toast, setToast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [interest, setInterest] = useState('kitchen');

  useEffect(() => {
    // ถ้ามาจากปุ่ม "สอบถามสินค้านี้" — เติมหมวดให้เอง
    const p = new URLSearchParams(window.location.search).get('product');
    if (p) setInterest(p.includes('bath') || p.includes('basin') || p.includes('toilet') || p.includes('shower') ? 'bath' : 'kitchen');
    return () => clearTimeout(timer.current);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.currentTarget.reset();
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
            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <label htmlFor="name" className="mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500">
                  {t.contact.name}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="w-full border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-ink"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500">
                  {t.contact.email}
                </label>
                <input
                  id="email"
                  name="email"
                  required
                  className="w-full border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-ink"
                />
              </div>
              <div>
                <label htmlFor="interest" className="mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500">
                  {t.contact.interest}
                </label>
                <select
                  id="interest"
                  name="interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none focus:border-ink"
                >
                  <option value="kitchen">{t.common.category.kitchen}</option>
                  <option value="bath">{t.common.category.bath}</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500">
                  {t.contact.message}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full resize-none border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-ink"
                />
              </div>
              <button
                type="submit"
                className="border border-ink px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
              >
                {t.contact.send}
              </button>
            </form>
          </Reveal>

          {/* ข้อมูล + แผนที่ */}
          <Reveal delay={0.15}>
            <address className="mb-8 space-y-2.5 text-sm font-light not-italic leading-relaxed text-stone-600">
              <p>{CONTACT.address_th}</p>
              <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
              <p>{CONTACT.email}</p>
              <p>{CONTACT.hours_th}</p>
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
