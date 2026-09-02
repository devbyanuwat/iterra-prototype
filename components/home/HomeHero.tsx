'use client';

// Hero หน้าแรก — ภาพถ่ายเต็มจอ ไม่ใช่กำแพงวัสดุ
//
// ลูกค้าบอกว่ากำแพงเฉดไม่สวยพอจะเป็นหน้าแรก และมันทำหน้าที่ผิด (การเลือกเฉดคือ
// การกรอง ไม่ใช่ทางเข้า) กำแพงจึงย้ายไปหัวหน้า /products ส่วนที่นี่กลับไปใช้
// ข้อความ hero ชุดเดิมใน lib/i18n.ts (heroKicker/heroTitle/heroSub) ที่ถูกทิ้งไว้
// ไม่ได้ใช้ตั้งแต่กำแพงมาแทน
//
// ภาพ: zab59998 (ครัวเปิดโล่ง 1800x800) จากบทความ kitchen ideas บน kohler.co.th
// เลือกภาพครัวเพราะพาดหัวใน lib/i18n.ts พูดว่า "ศิลปะของครัว" — ภาพห้องน้ำสวยกว่า
// แต่ขัดกับคำที่มันวางทับอยู่ ส่วนภาพห้องอาบน้ำ (zab49013) ไปอยู่บล็อกถัดไปที่พูด
// ถึงสองโลกครัว/ห้องน้ำแทน
//
// มาสเตอร์ของ Scene7 หยุดที่ 1800px (ตรวจด้วย ?req=props กับ 29 ไฟล์ ไม่มีใบไหน
// ใหญ่กว่านี้) 1800 จึงคลุมจอ 1440 ได้เต็มที่ dpr 1 และเป็นเพดานจริงของคลัง

import Link from 'next/link';
import { useLang } from '@/components/LangProvider';
import { lifestyleImages, lifestyleSrc } from '@/lib/lifestyle.generated';

const HERO_ID = 'zab59998-1800x800-hollywoodhills';

/** ภาพรองที่วางคู่กับบล็อกข้อความใต้ hero */
const SECOND_ID = 'zab49013-1800x800';

function pic(id: string) {
  const found = lifestyleImages.find((image) => image.id === id);
  if (!found) throw new Error(`unknown lifestyle image: ${id}`);
  return found;
}

export default function HomeHero() {
  const { lang, t } = useLang();
  const hero = pic(HERO_ID);
  const second = pic(SECOND_ID);

  return (
    <>
      <section className="relative isolate min-h-[86svh] w-full overflow-clip bg-ink md:min-h-[92svh]">
        {/* ภาพเต็มจอ: ขอ rendition ที่ใหญ่ที่สุดเสมอ เพราะช่องคือความกว้างจอ */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
        <img
          src={lifestyleSrc(hero, hero.maxWidth)}
          alt={hero.alt[lang]}
          width={hero.width}
          height={hero.height}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
        />
        {/* ม่านไล่เฉด: ตัวอักษรอยู่บนภาพจริง จึงต้องมีชั้นที่รับประกัน contrast
            ไล่จากล่างขึ้นบน ไม่ใช่ทึบทั้งใบ — ภาพยังต้องอ่านออกว่าเป็นห้องอาบน้ำ */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(12,12,12,0.82) 0%, rgba(12,12,12,0.55) 38%, rgba(12,12,12,0.15) 70%, rgba(12,12,12,0.05) 100%)',
          }}
        />

        <div className="relative z-10 flex min-h-[86svh] flex-col justify-end px-6 pb-16 pt-36 md:min-h-[92svh] md:px-[8vw] md:pb-20">
          <p className="micro !text-white/80">{t.home.heroKicker}</p>
          {/* md:text-[72px] ไม่ใช่ md:text-7xl — และ leading-thai ไม่ใช่ leading-[1.12]
              text-7xl ของ Tailwind พก line-height: 1 มาด้วย และ Tailwind ปล่อย
              variant ที่มี breakpoint ไว้ "ท้ายไฟล์" หลังคลาสของเราเอง พอ
              specificity เท่ากันมันจึงชนะ — วัดจริงได้ 72px/lh 1.00 ที่ ≥768px
              ซึ่งต่ำกว่าพื้นความสูงบรรทัดของไทย ส่วน text-[72px] ตั้งแค่ขนาด
              ไม่ไปยุ่งกับ line-height พาดหัวจึงได้ค่าจาก .leading-thai จริง ๆ */}
          <h1 className="mt-4 max-w-4xl whitespace-pre-line font-display text-4xl font-normal leading-thai tracking-wide text-white md:text-[72px]">
            {t.home.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-body font-normal leading-relaxed text-white/85">
            {t.home.heroSub}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/products/"
              className="border border-white/70 px-8 py-4 text-label uppercase tracking-widest2 text-white transition-colors duration-300 hover:bg-white hover:text-ink"
            >
              {t.nav.products}
            </Link>
            <Link
              href="/contact/"
              className="border border-transparent px-8 py-4 text-label uppercase tracking-widest2 text-white/85 underline underline-offset-8 transition-colors duration-300 hover:text-white"
            >
              {t.home.ctaBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* แถบภาพที่สองต่อจาก hero — ให้จอแรกไม่ใช่ทั้งหมดที่หน้าแรกมี */}
      <section className="grid items-stretch gap-0 border-b border-line-6 bg-base md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-6 py-16 md:order-1 md:px-[6vw] md:py-24">
          <p className="micro mb-3">{t.home.featuredKicker}</p>
          <h2 className="max-w-md font-display text-section font-normal leading-snug text-ink">
            {t.home.featuredTitle}
          </h2>
          <p className="mt-4 max-w-md text-body text-dim">{t.home.catSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products/?cat=kitchen"
              className="border border-line-12 px-6 py-3 text-label uppercase tracking-widest2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              {t.home.catKitchen}
            </Link>
            <Link
              href="/products/?cat=bath"
              className="border border-line-12 px-6 py-3 text-label uppercase tracking-widest2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              {t.home.catBath}
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, รูป local */}
          <img
            src={lifestyleSrc(second, 720, 2)}
            alt={second.alt[lang]}
            width={second.width}
            height={second.height}
            className="h-full min-h-[320px] w-full object-cover md:min-h-[520px]"
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>
    </>
  );
}
