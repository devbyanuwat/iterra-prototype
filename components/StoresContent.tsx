'use client';

// หน้าร้านค้า — คำตอบของคำถาม "แล้วจะไปดูของจริงได้ที่ไหน"
//
// ข้อมูลมาจาก lib/stores.generated.ts (harvest ของ task B1) ซึ่งเก็บด้วยเบราว์เซอร์
// เพราะวิดเจ็ตแผนที่ของต้นทางประกอบรายการเองหลังหน้าโหลด
//
// สองเรื่องที่ตัดสินใจไว้ตรงนี้ และเขียนไว้บนหน้าด้วย ไม่ใช่ซ่อนในโค้ด:
//
// 1. ข้อมูลเป็นภาษาไทยล้วนที่ต้นทาง (/en/storelocator ตอบ ERR_TOO_MANY_REDIRECTS)
//    เว็บนี้ประกาศ lang="en" เป็นค่าเริ่มต้นตั้งแต่ ba10764 ชื่อร้านกับที่อยู่จึงต้อง
//    ประกาศ lang="th" ที่ตัวมันเอง ไม่งั้นก็คือหน้าที่บอกภาษาผิดให้ screen reader
//    อ่านไทยด้วยเสียงอังกฤษ — เหตุผลเดียวกับ resolve() ใน lib/i18n.ts
//
// 2. แผนที่เป็น "ลิงก์" ไม่ใช่ iframe ที่ฝังไว้ พิกัดของทั้ง 50 แห่งมีจริงในข้อมูล
//    การฝัง Google Maps จะยิง request ไปหาบุคคลที่สามตั้งแต่เฟรมแรกของทุกคน
//    ที่เปิดหน้านี้ ทั้งที่ส่วนใหญ่ไม่ได้จะดูแผนที่ — หลักการเดียวกับ VideoEmbed
//    ลิงก์ไม่โหลดอะไรเลยจนกว่าจะกด และยังพาไปแอปแผนที่ของเครื่องได้ด้วย

import Link from '@/components/Link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { stores, storeSource, type Store } from '@/lib/stores.generated';

/**
 * จังหวัดของแต่ละร้าน
 *
 * ต้นทางไม่มีฟิลด์จังหวัด มีแต่ `city` เป็นสตริงเดียว เช่น
 * 'เขตบางรัก, กรุงเทพมหานคร 10500' — จังหวัดคือส่วนหลังคอมมาสุดท้าย ตัดรหัสไปรษณีย์
 * ทั้ง 50 รายการมีคอมมาครบ จึงไม่มีเคสที่ตกไปเป็นค่าว่าง (ตรวจแล้วตอนเขียน)
 */
function provinceOf(store: Store): string {
  const tail = store.city.split(',').pop() ?? store.city;
  return tail.replace(/\s*\d{5}\s*$/, '').trim();
}

/** อำเภอ/เขต — ส่วนหน้าคอมมา ใช้เป็นบรรทัดรองในการ์ด */
function districtOf(store: Store): string {
  const [head] = store.city.split(',');
  return (head ?? '').trim();
}

/** เบอร์สำหรับ tel: — ต้นทางเขียนเป็น 66-2-0702271 */
const telHref = (phone: string) => `tel:+${phone.replace(/[^\d]/g, '')}`;

/** ลิงก์แผนที่จากพิกัดจริงที่ต้นทางฝังไว้ ไม่ใช่การค้นจากชื่อร้าน */
const mapHref = (store: Store) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.latlng)}`;

const KEC = stores.filter((s) => s.kec);
const DEALERS = stores.filter((s) => !s.kec);

/**
 * จัดกลุ่มตามจังหวัด เรียงกลุ่มตามจำนวนร้าน
 *
 * รายชื่อดิบเรียงตามระยะห่างจากพิกัดเดียวในกรุงเทพฯ ซึ่งอ่านเป็นลำดับไม่ได้เลย
 * สำหรับคนที่กำลังหาว่า "ใกล้บ้านฉันมีไหม" — กรุงเทพฯ 35, นนทบุรี 9,
 * สมุทรปราการ 5, สมุทรสาคร 1 อ่านออกทันทีว่าครอบคลุมแค่ไหน
 */
const GROUPS = (() => {
  const map = new Map<string, Store[]>();
  for (const store of DEALERS) {
    const key = provinceOf(store);
    const list = map.get(key);
    if (list) list.push(store);
    else map.set(key, [store]);
  }
  return [...map.entries()]
    .map(([province, list]) => ({ province, list }))
    .sort((a, b) => b.list.length - a.list.length);
})();

function StoreCard({ store }: { store: Store }) {
  const { t } = useLang();
  const district = districtOf(store);
  return (
    <li className="flex flex-col border-t border-line-12 pt-5">
      {/* lang="th" ที่นี่ ไม่ใช่ที่ <html>: เอกสารเป็นอังกฤษ ข้อมูลชุดนี้เป็นไทย */}
      <h3 lang="th" className="text-card font-normal text-ink">
        {store.name}
      </h3>
      <address lang="th" className="mt-2 text-body-sm not-italic leading-relaxed text-dim">
        {store.address}
        <br />
        {district}
      </address>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {store.phone ? (
          <a href={telHref(store.phone)} className="micro underline-offset-8 hover:underline">
            {store.phone}
          </a>
        ) : (
          // ไม่ปล่อยช่องว่าง — บอกไปตรง ๆ ว่าต้นทางไม่มี (8 ใน 50 แห่ง)
          //
          // ไม่มี `/70` แล้ว การจางสีที่ถูกเลือกมาเพราะค่า contrast คือการลบ
          // การรับประกันที่โทเคนนั้นมีอยู่เพื่อให้: `dim` = #5D5D5D วัดได้ 5.22:1
          // บนพื้น base ซึ่งเหนือเกณฑ์ 4.5 อยู่แค่ 0.72 — ไม่มีส่วนต่างให้ใช้จ่าย
          // จางเหลือ 0.7 กลายเป็น rgba(93,93,93,0.7) = 2.90:1 ที่ QA วัดเจอบน 8 โหนด
          // (8 = จำนวนร้านที่ต้นทางไม่ให้เบอร์มา ตรงกันพอดี)
          //
          // ความหมาย "ไม่มีข้อมูล" สื่อด้วยตัวข้อความอยู่แล้ว ไม่ต้องสื่อด้วยความจาง
          <span className="micro">{t.stores.noPhone}</span>
        )}
        <a
          href={mapHref(store)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.stores.mapAria(store.name)}
          className="micro underline-offset-8 hover:underline"
        >
          {t.stores.map} ↗
        </a>
      </div>

      {/* 1 ใน 50 แห่งเท่านั้นที่ต้นทางประกาศเวลาทำการ */}
      {store.hours && (
        <p className="mt-3 text-body-sm text-dim">
          <span className="micro mr-2">{t.stores.hours}</span>
          {store.hours}
        </p>
      )}
    </li>
  );
}

export default function StoresContent() {
  const { t } = useLang();

  return (
    <>
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.stores.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.stores.title}</h1>
          <p className="mt-6 max-w-xl text-body text-dim">{t.stores.sub(stores.length)}</p>
        </Reveal>
      </section>

      {/* ── Kohler Experience Center ──────────────────────────────────────
          แยกออกมาก่อน ไม่ใช่แถวหนึ่งในห้าสิบ: เป็นโชว์รูมของแบรนด์เอง และเป็น
          ที่เดียวที่รู้เวลาทำการ ซึ่งตรงกับสิ่งที่คนถามหาจริง ๆ เวลาเปิดหน้านี้ */}
      {KEC.map((store) => (
        <section key={store.rank} className="border-y border-line-6 bg-surface">
          <div className="grid gap-8 px-6 py-14 md:grid-cols-[1fr_auto] md:items-end md:px-[8vw] md:py-16">
            <Reveal>
              <p className="mb-3 micro">{t.stores.kecLabel}</p>
              <h2 lang="th" className="font-display text-section font-normal text-ink">
                {store.name}
              </h2>
              <address lang="th" className="mt-4 max-w-md text-body not-italic leading-relaxed text-dim">
                {store.address}
                <br />
                {store.city}
              </address>
              <p className="mt-4 text-body-sm text-dim">{store.hours}</p>
              <p className="mt-3 max-w-md text-body-sm text-dim">{t.stores.kecNote}</p>
            </Reveal>
            <Reveal delay={0.1} className="flex flex-wrap gap-3">
              <a
                href={telHref(store.phone)}
                className="inline-block border border-line-12 px-8 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <span className="micro !text-current">{store.phone}</span>
              </a>
              <a
                href={mapHref(store)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.stores.mapAria(store.name)}
                className="inline-block border border-line-12 px-8 py-4 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                <span className="micro !text-current">{t.stores.map} ↗</span>
              </a>
            </Reveal>
          </div>
        </section>
      ))}

      {/* ── ตัวแทนจำหน่าย จัดกลุ่มตามจังหวัด ───────────────────────────── */}
      <section className="px-6 py-20 md:px-[8vw] md:py-24">
        <Reveal className="mb-12">
          <h2 className="font-display text-section font-normal text-ink">{t.stores.dealers}</h2>
        </Reveal>

        {GROUPS.map((group, groupIndex) => (
          <div key={group.province} className={groupIndex ? 'mt-16' : ''}>
            <Reveal className="mb-6 flex flex-wrap items-baseline gap-x-4">
              <h3 lang="th" className="text-card font-normal text-ink">
                {group.province}
              </h3>
              <span className="micro">{t.stores.count(group.list.length)}</span>
            </Reveal>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {group.list.map((store, i) => (
                <Reveal key={store.rank} delay={(i % 3) * 0.08} y={24}>
                  <StoreCard store={store} />
                </Reveal>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── ข้อจำกัดของข้อมูล ────────────────────────────────────────────
          อยู่บนหน้า ไม่ใช่ในรายงาน ใครที่ไม่เจอร้านใกล้บ้านควรได้รู้ว่าเป็นเพราะ
          ต้นทางตัดที่ 50 ราย ไม่ใช่เพราะแถวนั้นไม่มีตัวแทนจำหน่าย */}
      <section className="border-t border-line-6 px-6 py-16 md:px-[8vw] md:py-20">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-card font-normal text-ink">{t.stores.limitTitle}</h2>
          <ul className="mt-5 space-y-3 text-body-sm leading-relaxed text-dim">
            <li>{t.stores.limitCap}</li>
            <li>{t.stores.limitLang}</li>
            <li>{t.stores.limitFields}</li>
          </ul>
          <p className="mt-6">
            <a
              href={`https://www.kohler.co.th${storeSource.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="micro underline-offset-8 hover:underline"
            >
              {t.stores.source} ↗
            </a>
          </p>
          <p className="mt-8">
            <Link href="/contact/" className="micro underline-offset-8 hover:underline">
              {t.nav.contact} →
            </Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
