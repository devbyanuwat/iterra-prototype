'use client';

// หน้าเกี่ยวกับเรา — เดิมเป็น server component ที่ฮาร์ดโค้ดภาษาไทยไว้ในไฟล์ route
// ปุ่ม TH/EN บนหัวเว็บจึงกดแล้วไม่มีอะไรเกิดขึ้น
// ย้ายส่วนที่ render ออกมาเป็น client component เพื่ออ่าน useLang ได้
// (รูปแบบเดียวกับ ProductsContent / ContactContent ที่มีอยู่แล้ว)
//
// เนื้อหาอยู่ใน lib/i18n.ts แล้ว ใช้ pick() ซึ่งตกกลับเป็นไทยเมื่อยังไม่มีฉบับอังกฤษ

import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { aboutContent, pick } from '@/lib/i18n';
import { lifestyleImages } from '@/lib/lifestyle.generated';

// ภาพจริงจากคลัง lifestyle — เลือกให้ตรงกับเนื้อหาแต่ละหัวข้อ
// เรียงตาม aboutContent.sections: จุดเริ่มต้น / วิธีคัดสรร / โชว์รูม / งานช่าง
const HERO_ID = 'aaa80571-1800x800';
const SECTION_IDS = [
  '02-handshower', // ต่อน้ำเข้าทุกก๊อก เปิดให้ลองก่อนซื้อ
  'aleutian-02', // เกณฑ์เดียว: บ้านเราใช้เองได้ไหม
  'aaa68094-rgb', // โชว์รูมจัดเป็นห้องจริง
  'kss-thai-web-secondary-banner', // ทีมช่างของเราเอง
];

/** ค้นภาพจาก id — id ผิดจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า */
function pic(id: string) {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}

export default function AboutContent() {
  const { lang } = useLang();
  const hero = pic(HERO_ID);

  return (
    <>
      {/* header */}
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-24 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{pick(aboutContent.kicker, lang)}</p>
          <h1 className="max-w-3xl whitespace-pre-line font-display text-4xl font-normal leading-[1.2] tracking-wide text-ink md:text-6xl">
            {pick(aboutContent.title, lang)}
          </h1>
        </Reveal>
      </section>

      <Reveal className="px-6 md:px-[8vw]">
        {/* ภาพเปิดหน้ากว้างเต็มคอลัมน์เนื้อหา (~1195px) จึงใช้ไฟล์ 1800 */}
        <div
          className="overflow-hidden border border-line-6 bg-surface"
          style={{ aspectRatio: `${hero.width} / ${hero.height}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
          <img
            src={hero.src.w1800}
            alt={hero.alt[lang]}
            width={hero.width}
            height={hero.height}
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>
      </Reveal>

      {/* ภาพสลับข้อความ + parallax เบา ๆ */}
      <div className="space-y-24 px-6 py-24 md:space-y-36 md:px-[8vw] md:py-36">
        {aboutContent.sections.map((s, i) => {
          const image = pic(SECTION_IDS[i]);
          return (
          <section
            key={i}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-[6vw] ${
              i % 2 ? 'md:[&>*:first-child]:order-2' : ''
            }`}
          >
            <Reveal>
              {/* กรอบตามสัดส่วนจริงของภาพ ไม่บังคับทุกใบให้เป็น 4/5 */}
              <div
                className="overflow-hidden border border-line-6 bg-surface"
                style={{ aspectRatio: `${image.width} / ${image.height}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
                <img
                  src={image.src.w900}
                  alt={image.alt[lang]}
                  width={image.width}
                  height={image.height}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mb-4 micro">{pick(s.kicker, lang)}</p>
              <h2 className="mb-5 font-display text-3xl font-normal leading-snug tracking-wide text-ink md:text-4xl">
                {pick(s.title, lang)}
              </h2>
              <p className="max-w-md text-body-sm font-normal leading-loose text-dim">{pick(s.body, lang)}</p>
            </Reveal>
          </section>
          );
        })}
      </div>
    </>
  );
}
