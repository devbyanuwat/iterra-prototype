'use client';

// หน้าติดต่อ: ฟอร์ม UI อย่างเดียว (submit → toast, ไม่ส่งจริง)
// จุดเปลี่ยนเป็นของจริง: ต่อ handleSubmit เข้ากับ endpoint / อีเมลจริง
// + แผนที่ placeholder (ของจริงฝัง Google Maps embed ตรงนี้)

import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CONTACT } from '@/lib/site';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';

// ช่องแผนที่เดิมเป็นกล่องเปล่า — ใส่ภาพหน้าร้านโชว์รูมไปก่อน
// (ภาพ retail ใบเดียวในคลัง) ตอนขึ้นจริงค่อยแทนด้วย Google Maps embed
// เดิมใช้ visual-showroom-secondary-banner (294px) แล้ว kohler-kec-bkk (982px)
// ใบนี้กว้าง 1800px — คลุมช่อง 552px ได้ทั้ง dpr 1 และ dpr 2
const SHOWROOM_ID = 'kohler-bkk-kec-banner';
const SHOWROOM_SLOT = 552;

/** ค้นภาพจาก id — id ผิดจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า */
function pic(id: string) {
 const found = lifestyleImages.find((image) => image.id === id);
 if (!found) throw new Error(`unknown lifestyle image: ${id}`);
 return found;
}

const showroom = pic(SHOWROOM_ID);

export default function ContactContent() {
 const { t, lang } = useLang();
 const [toast, setToast] = useState(false);
 const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const [interest, setInterest] = useState('kitchen');

 useEffect(() => {
 // ถ้ามาจากปุ่ม"สอบถามสินค้านี้" — เติมหมวดให้เอง
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
 <h1 className="font-display text-section font-normal tracking-wide text-ink text-section">{t.contact.title}</h1>
 <p className="mt-4 text-body-sm font-normal text-dim">{t.contact.sub}</p>
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
 className="w-full border-b border-line-12 bg-transparent py-3 text-body-sm font-normal text-ink outline-none transition-colors focus:border-accent"
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
 className="w-full border-b border-line-12 bg-transparent py-3 text-body-sm font-normal text-ink outline-none transition-colors focus:border-accent"
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
 className="w-full border-b border-line-12 bg-transparent py-3 text-body-sm font-normal text-ink outline-none focus:border-accent"
 >
 <option value="kitchen" className="bg-surface text-ink">{t.common.category.kitchen}</option>
 <option value="bath" className="bg-surface text-ink">{t.common.category.bath}</option>
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
 className="w-full resize-none border-b border-line-12 bg-transparent py-3 text-body-sm font-normal text-ink outline-none transition-colors focus:border-accent"
 />
 </div>
 <button
 type="submit"
 className="border border-line-12 px-10 py-4 text-label uppercase tracking-widest2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
 >
 {t.contact.send}
 </button>
 </form>
 </Reveal>

 {/* ข้อมูล + แผนที่ */}
 <Reveal delay={0.15}>
 <address className="mb-8 space-y-2.5 text-body-sm font-normal not-italic leading-relaxed text-dim">
 <p>{CONTACT.address_th}</p>
 <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
 <p>{CONTACT.email}</p>
 <p>{CONTACT.hours_th}</p>
 </address>
 {/* ภาพหน้าร้าน: ฝัง Google Maps embed แทนที่ตรงนี้ตอนขึ้นจริง */}
 <div
 className="w-full overflow-hidden border border-line-6 bg-surface"
 style={{ aspectRatio: `${showroom.width} / ${showroom.height}` }}
 >
 {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
 <img
 src={lifestyleSrc(showroom, SHOWROOM_SLOT, 2)}
 alt={showroom.alt[lang]}
 width={showroom.width}
 height={showroom.height}
 className="h-full w-full object-cover"
 loading="lazy"
 decoding="async"
 />
 </div>
 </Reveal>
 </div>
 </section>

 {/* Toast */}
 <div
 role="status"
 aria-live="polite"
 className={`fixed bottom-8 left-1/2 z-[70] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 border border-line-12 bg-surface px-6 py-4 text-center text-body-sm font-normal text-ink shadow-2xl transition-all duration-500 ${
 toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
 }`}
 >
 {t.contact.toast}
 </div>
 </>
 );
}
