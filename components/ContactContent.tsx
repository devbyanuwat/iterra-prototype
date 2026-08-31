'use client';

// หน้าติดต่อ: ฟอร์ม UI อย่างเดียว (submit → toast, ไม่ส่งจริง)
// จุดเปลี่ยนเป็นของจริง: ต่อ handleSubmit เข้ากับ endpoint / อีเมลจริง
// + แผนที่ placeholder (ของจริงฝัง Google Maps embed ตรงนี้)

import { useEffect, useRef, useState } from 'react';
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
          <p className="mb-4 micro">CONTACT</p>
          <h1 className="font-display text-4xl font-extralight tracking-wide text-cream md:text-5xl">{t.contact.title}</h1>
          <p className="mt-4 text-sm font-light text-dim">{t.contact.sub}</p>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-[6vw]">
          {/* ฟอร์ม */}
          <Reveal>
            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <label htmlFor="name" className="mb-2 block micro">
                  {t.contact.name}
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="w-full border-b border-line-12 bg-transparent py-3 text-sm font-light text-cream outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block micro">
                  {t.contact.email}
                </label>
                <input
                  id="email"
                  name="email"
                  required
                  className="w-full border-b border-line-12 bg-transparent py-3 text-sm font-light text-cream outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="interest" className="mb-2 block micro">
                  {t.contact.interest}
                </label>
                <select
                  id="interest"
                  name="interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full border-b border-line-12 bg-transparent py-3 text-sm font-light text-cream outline-none focus:border-accent"
                >
                  <option value="kitchen" className="bg-surface text-cream">{t.common.category.kitchen}</option>
                  <option value="bath" className="bg-surface text-cream">{t.common.category.bath}</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block micro">
                  {t.contact.message}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="w-full resize-none border-b border-line-12 bg-transparent py-3 text-sm font-light text-cream outline-none transition-colors focus:border-accent"
                />
              </div>
              <button
                type="submit"
                className="border border-line-12 px-10 py-4 text-[11px] uppercase tracking-widest2 text-cream transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                {t.contact.send}
              </button>
            </form>
          </Reveal>

          {/* ข้อมูล + แผนที่ */}
          <Reveal delay={0.15}>
            <address className="mb-8 space-y-2.5 text-sm font-light not-italic leading-relaxed text-dim">
              <p>{CONTACT.address_th}</p>
              <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
              <p>{CONTACT.email}</p>
              <p>{CONTACT.hours_th}</p>
            </address>
            {/* แผนที่: ฝัง Google Maps embed ตรงนี้ตอนขึ้นจริง */}
            <div className="aspect-video w-full border border-line-6 bg-surface" aria-hidden />
          </Reveal>
        </div>
      </section>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-8 left-1/2 z-[70] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 border border-line-12 bg-surface px-6 py-4 text-center text-[13px] font-light text-cream shadow-2xl transition-all duration-500 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {t.contact.toast}
      </div>
    </>
  );
}
