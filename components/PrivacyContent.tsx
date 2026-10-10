'use client';

// หน้านโยบายความเป็นส่วนตัว
// ── เนื้อหาตัวอย่าง ── ร่างตามสิ่งที่เว็บทำอยู่จริง ยังไม่ผ่านการตรวจทางกฎหมาย ต้องให้ฝ่ายกฎหมายของลูกค้าตรวจและแทนที่ก่อนใช้จริง

import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { OPEN_COOKIE_SETTINGS } from './CookieConsent';
import { CONTACT, SITE_NAME } from '@/lib/site';

const COPY = {
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    draft: 'ร่างตัวอย่างสำหรับเดโม ยังไม่ผ่านการตรวจทางกฎหมาย',
    sections: [
      { h: 'ข้อมูลที่เราเก็บ', p: ['เมื่อคุณติดต่อเราผ่านแบบฟอร์ม โทรศัพท์ อีเมล หรือ LINE เราเก็บชื่อ ช่องทางติดต่อ และข้อความที่คุณส่งมา เพื่อใช้ตอบกลับและนัดหมายเข้าชมโชว์รูม', 'เมื่อคุณเปิดเว็บไซต์ และอนุญาตคุกกี้หมวดสถิติ เราเก็บข้อมูลการเข้าชมแบบรวม เช่น หน้าที่เปิดดู ประเภทอุปกรณ์ และประเทศ โดยไม่ระบุตัวบุคคล'] },
      { h: 'คุกกี้และการจัดเก็บในเบราว์เซอร์', p: ['จำเป็น: จำตัวเลือกคุกกี้ของคุณ และจำว่าคุณปิดประกาศแล้ว เปิดตลอดเพราะเว็บไซต์ต้องใช้', 'สถิติ: นับจำนวนผู้เข้าชมและหน้าที่เปิดดู ทำงานเฉพาะเมื่อคุณอนุญาต', 'การตลาด: ขณะนี้เว็บไซต์ยังไม่มีการใช้งานหมวดนี้'] },
      { h: 'ผู้ให้บริการที่เกี่ยวข้อง', p: ['เว็บไซต์ให้บริการผ่านผู้ให้บริการโฮสติงและระบบสถิติ ซึ่งประมวลผลข้อมูลตามคำสั่งของเราเท่านั้น เราไม่ขายข้อมูลส่วนบุคคลของคุณ'] },
      { h: 'สิทธิของคุณ', p: ['ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิขอเข้าถึง ขอแก้ไข ขอลบ คัดค้านการประมวลผล และถอนความยินยอมได้ทุกเมื่อ'] },
      { h: 'ติดต่อเรา', p: [`${SITE_NAME} · ${CONTACT.address_th}`, `โทร ${CONTACT.phone} · ${CONTACT.email}`] },
    ],
    change: 'เปลี่ยนตัวเลือกคุกกี้',
  },
  en: {
    title: 'Privacy policy',
    draft: 'Sample draft for the demo. It has not had a legal review.',
    sections: [
      { h: 'What we collect', p: ['When you contact us by form, phone, email or LINE, we keep your name, contact details and message so we can reply and arrange a showroom visit.', 'When you browse the site and allow statistics cookies, we collect aggregate visit data such as pages opened, device type and country. It does not identify you.'] },
      { h: 'Cookies and browser storage', p: ['Necessary: remembers your cookie choice and that you closed the announcement. Always on, because the site needs it.', 'Statistics: counts visitors and the pages they open. Runs only if you allow it.', 'Marketing: the site does not use this category yet.'] },
      { h: 'Service providers', p: ['The site runs on a hosting provider and a statistics service, which process data only on our instructions. We do not sell your personal data.'] },
      { h: 'Your rights', p: ['Under Thailand’s Personal Data Protection Act B.E. 2562 you may ask to access, correct or delete your data, object to processing, and withdraw consent at any time.'] },
      { h: 'Contact', p: [`${SITE_NAME} · ${CONTACT.address_en}`, `Tel. ${CONTACT.phone} · ${CONTACT.email}`] },
    ],
    change: 'Change cookie choices',
  },
};

export default function PrivacyContent() {
  const { lang } = useLang();
  const c = COPY[lang];
  return (
    <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal>
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">PRIVACY</p>
        <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{c.title}</h1>
        <p className="mt-4 text-xs font-normal text-stone-600">{c.draft}</p>
      </Reveal>
      <div className="mt-14 max-w-2xl space-y-10">
        {c.sections.map((s) => (
          <div key={s.h}>
            <h2 className="text-lg font-light tracking-wide">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3 text-sm font-light leading-relaxed text-stone-600">
                {p}
              </p>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
          className="min-h-11 border border-ink px-6 text-[11px] font-normal uppercase tracking-widest2 hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {c.change}
        </button>
      </div>
    </section>
  );
}
