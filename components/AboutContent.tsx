'use client';

// หน้าเกี่ยวกับเรา — เดิมเป็น server component ที่ฮาร์ดโค้ดภาษาไทยไว้ในไฟล์ route
// ปุ่ม TH/EN บนหัวเว็บจึงกดแล้วไม่มีอะไรเกิดขึ้น
// ย้ายส่วนที่ render ออกมาเป็น client component เพื่ออ่าน useLang ได้
// (รูปแบบเดียวกับ ProductsContent / ContactContent ที่มีอยู่แล้ว)
//
// เนื้อหาอยู่ใน lib/i18n.ts และยังไม่มีฉบับอังกฤษเลยสักหัวข้อ (ดู untranslated())
// ใช้ resolve() ไม่ใช่ pick(): ทั้งคู่คืนข้อความไทยชุดเดียวกัน แต่ resolve บอกด้วย
// ว่าข้อความที่คืนมาเป็นภาษาอะไรจริง ๆ เพื่อเอาไปติด lang= บน element
// หน้านี้คือหน้าที่เป็นไทย 56% บน URL อังกฤษในรายงาน QA-F5 — เนื้อหาถูกต้องแล้ว
// ที่ผิดคือมันไม่เคยบอกใครว่าเป็นไทย (task E1)

import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { aboutContent, resolve } from '@/lib/i18n';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';

// ภาพจริงจากคลัง lifestyle — เลือกให้ตรงกับเนื้อหาแต่ละหัวข้อ
// เรียงตาม aboutContent.sections: จุดเริ่มต้น / วิธีคัดสรร / โชว์รูม / งานช่าง
const HERO_ID = 'aaa80571-1800x800';
const SECTION_IDS = [
 // เดิมเป็น 02-handshower ซึ่งกว้าง 461px แต่ช่องกว้าง 552px — ต้องขยายภาพ
 'malleco-article-banner-968x544', // ต่อน้ำเข้าทุกก๊อก เปิดให้ลองก่อนซื้อ
 'aleutian-02', // เกณฑ์เดียว: บ้านเราใช้เองได้ไหม
 'aaa68094-rgb', // โชว์รูมจัดเป็นห้องจริง
 'kss-thai-web-secondary-banner', // ทีมช่างของเราเอง
];

// ความกว้างจริงของช่องที่ 1440 ใช้เลือก rendition ไม่ให้ภาพถูกขยาย
//
// เพดานคือคลังภาพ ไม่ใช่เลย์เอาต์: Scene7 ตอบสูงสุด 1800px และทั้งคลัง 205 ใบ
// ไม่มีใบไหนกว้างเกินนั้น ช่องกว้าง 1193 จึงต้องการ 2386 ที่จอ 2x ซึ่งไม่มีทางได้
// ย่อช่องลงให้ 1800 คลุมได้จริงที่ 2x แทนการยืดภาพ — ภาพเบลอเสียหายกว่าภาพเล็กลง
const HERO_SLOT = 900;

/**
 * ช่องของแต่ละ section คิดจากภาพที่มันใช้ ไม่ใช่ค่าคงที่ค่าเดียว
 *
 * `kss-thai-web-secondary-banner` กว้างจริง 620px และเป็นภาพงานบริการใบเดียว
 * ในคลังที่ไม่มีตัวหนังสือโฆษณาอบมาในรูป จะสลับใบอื่นก็ไม่มีให้สลับ
 * ช่องของมันจึงต้องเล็กลงเหลือ 310 ส่วนใบอื่นที่มี 1800 ยังได้ 552 เท่าเดิม
 */
const SECTION_SLOT_MAX = 552;
function sectionSlot(maxWidth: number | undefined): number {
  if (!maxWidth) return SECTION_SLOT_MAX;
  return Math.min(SECTION_SLOT_MAX, Math.floor(maxWidth / 2));
}

/** ค้นภาพจาก id — id ผิดจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า */
function pic(id: string) {
 const found = lifestyleImages.find((image) => image.id === id);
 if (!found) throw new Error(`unknown lifestyle image: ${id}`);
 return found;
}

export default function AboutContent() {
 const { lang } = useLang();
 const hero = pic(HERO_ID);
 const kicker = resolve(aboutContent.kicker, lang);
 const title = resolve(aboutContent.title, lang);

 return (
 <>
 {/* header */}
 <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-24 md:pt-44">
 <Reveal>
 <p className="mb-4 micro" lang={kicker.lang}>{kicker.text}</p>
 {/* No `leading-[1.2]` here. An arbitrary Tailwind leading beats the 1.6
              Thai floor in globals.css, and this heading is Thai — measured, it
              was the ONLY Thai collision left on the site after task D2: -0.91px
              at 1440, -0.90 at 1024, -0.67 at 768, -0.41 at 390, all on the pair
              5 / ที่. Removing the class is not a patch on this element, it is
              letting `text-hero` supply the leading it already carries. */}
            <h1
              className="max-w-3xl whitespace-pre-line font-display text-hero font-normal tracking-wide text-ink"
              lang={title.lang}
            >
 {title.text}
 </h1>
 </Reveal>
 </section>

 <Reveal className="px-6 md:px-[8vw]">
 {/* ภาพเปิดหน้า — ขอ rendition ที่คลุม HERO_SLOT ที่ 2x */}
 <div
 className="overflow-hidden border border-line-6 bg-surface"
 style={{ aspectRatio: `${hero.width} / ${hero.height}` }}
 >
 {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
 <img
 src={lifestyleSrc(hero, HERO_SLOT, 2)}
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
 const sk = resolve(s.kicker, lang);
 const st = resolve(s.title, lang);
 const sb = resolve(s.body, lang);
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
 src={lifestyleSrc(image, sectionSlot(image.maxWidth), 2)}
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
 <p className="mb-4 micro" lang={sk.lang}>{sk.text}</p>
 <h2
 className="mb-5 font-display text-section font-normal tracking-wide text-ink"
 lang={st.lang}
 >
 {st.text}
 </h2>
 <p className="max-w-md text-body-sm font-normal leading-loose text-dim" lang={sb.lang}>
 {sb.text}
 </p>
 </Reveal>
 </section>
 );
 })}
 </div>
 </>
 );
}
