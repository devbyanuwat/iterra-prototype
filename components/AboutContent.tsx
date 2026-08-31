'use client';

// หน้าเกี่ยวกับเรา — เดิมเป็น server component ที่ฮาร์ดโค้ดภาษาไทยไว้ในไฟล์ route
// ปุ่ม TH/EN บนหัวเว็บจึงกดแล้วไม่มีอะไรเกิดขึ้น
// ย้ายส่วนที่ render ออกมาเป็น client component เพื่ออ่าน useLang ได้
// (รูปแบบเดียวกับ ProductsContent / ContactContent ที่มีอยู่แล้ว)
//
// เนื้อหาอยู่ใน lib/i18n.ts แล้ว ใช้ pick() ซึ่งตกกลับเป็นไทยเมื่อยังไม่มีฉบับอังกฤษ

import Reveal from './Reveal';
import ParallaxImage from './ParallaxImage';
import { useLang } from './LangProvider';
import { aboutContent, pick } from '@/lib/i18n';

export default function AboutContent() {
  const { lang } = useLang();

  return (
    <>
      {/* header */}
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-24 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{pick(aboutContent.kicker, lang)}</p>
          <h1 className="max-w-3xl whitespace-pre-line font-display text-4xl font-extralight leading-[1.2] tracking-wide text-cream md:text-6xl">
            {pick(aboutContent.title, lang)}
          </h1>
        </Reveal>
      </section>

      <Reveal className="px-6 md:px-[8vw]">
        <ParallaxImage ratio="21/9" speed={-6} />
      </Reveal>

      {/* ภาพสลับข้อความ + parallax เบา ๆ */}
      <div className="space-y-24 px-6 py-24 md:space-y-36 md:px-[8vw] md:py-36">
        {aboutContent.sections.map((s, i) => (
          <section
            key={i}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-[6vw] ${
              i % 2 ? 'md:[&>*:first-child]:order-2' : ''
            }`}
          >
            <Reveal>
              <ParallaxImage ratio="4/5" speed={i % 2 ? 8 : -8} sizes="(max-width: 768px) 100vw, 45vw" />
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mb-4 micro">{pick(s.kicker, lang)}</p>
              <h2 className="mb-5 font-display text-3xl font-extralight leading-snug tracking-wide text-cream md:text-4xl">
                {pick(s.title, lang)}
              </h2>
              <p className="max-w-md text-sm font-light leading-loose text-dim">{pick(s.body, lang)}</p>
            </Reveal>
          </section>
        ))}
      </div>
    </>
  );
}
