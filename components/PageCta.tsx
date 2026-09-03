'use client';

// ── แถบชวนต่อ ที่ท้ายเนื้อหาทุกหน้า ก่อนถึงท้ายเว็บ ─────────────────────────
//
// ท้ายเว็บเป็นสารบัญ เหมือนกันทุกหน้า และไม่รู้ว่าผู้อ่านเพิ่งอ่านอะไรมา
// แถบนี้รู้ — ข้อความและทางไปเลือกจาก path ของหน้านั้น (ดู lib/cta.ts)
//
// mount ที่ RootShell ที่เดียว ไม่ใช่ให้แต่ละ route เรียกเอง: 41 หน้า/รูปแบบ
// ที่ต้องไม่ลืมใส่ คือ 41 โอกาสที่จะลืม
//
// ทุกสตริงผ่าน resolve() ไม่ใช่ pick(): บางประโยคยังไม่มีฉบับอังกฤษได้ในอนาคต
// และเมื่อมันตกกลับเป็นไทยบนหน้าอังกฤษ มันต้องบอกด้วยว่าเป็นไทย ไม่ใช่เงียบ
// (กฎเดียวกับ task E1 ทั้งเว็บ)

import { usePathname } from 'next/navigation';
import Link from '@/components/Link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { ctaFor, hasCta } from '@/lib/cta';
import { resolve, splitLangPath } from '@/lib/i18n';
import { CONTACT } from '@/lib/site';

/** path สองอันชี้หน้าเดียวกันเมื่อเทียบแบบตัด / ท้ายทิ้ง */
const samePage = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

export default function PageCta() {
  const pathname = usePathname();
  const { lang, t } = useLang();

  // pathname เป็น null ได้ตอน render บน server ในบางเส้นทางของ App Router
  if (!pathname || !hasCta(pathname)) return null;

  const { path } = splitLangPath(pathname);
  const band = ctaFor(path);

  // ทางไปที่ชี้กลับหน้าที่ยืนอยู่ไม่ใช่ทางไป — ตัดทิ้ง ไม่ใช่ทำให้จาง
  const links = band.links.filter((l) => !samePage(l.href, path));
  if (links.length === 0) return null;

  const kicker = resolve(band.kicker, lang);
  const title = resolve(band.title, lang);
  const body = resolve(band.body, lang);

  return (
    <section
      // border บนคือเส้นเดียวที่แยกมันออกจากเนื้อหาของหน้า — พื้นเป็น surface
      // ไม่ใช่ base เพื่อให้มันอ่านเป็น "แถบ" ไม่ใช่ส่วนท้ายที่ไหลต่อจากเนื้อหา
      className="border-t border-line-6 bg-surface"
      aria-labelledby="page-cta-title"
    >
      <div className="px-6 py-20 md:px-[8vw] md:py-28">
        <Reveal>
          <p className="mb-4 micro" lang={kicker.lang}>
            {kicker.text}
          </p>
          <h2
            id="page-cta-title"
            className="max-w-2xl font-display text-section font-normal tracking-wide text-ink"
            lang={title.lang}
          >
            {title.text}
          </h2>
          <p className="mt-5 max-w-xl text-body-sm font-normal leading-loose text-dim" lang={body.lang}>
            {body.text}
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-px border border-line-6 bg-line-6 md:grid-cols-3">
          {links.map((link, i) => {
            const label = resolve(link.label, lang);
            const note = resolve(link.note, lang);
            return (
              <li key={link.href} className="bg-surface">
                <Reveal delay={i * 0.08} y={20}>
                  <Link
                    href={link.href}
                    className="group flex h-full flex-col justify-between gap-8 p-7 transition-colors hover:bg-base md:p-9"
                  >
                    <span
                      className="font-display text-card font-normal text-ink"
                      lang={label.lang}
                    >
                      {label.text}
                    </span>
                    <span
                      className="text-body-sm font-normal leading-loose text-dim"
                      lang={note.lang}
                    >
                      {note.text}
                    </span>
                    {/* ลูกศรเลื่อนตอน hover — บอกทิศ ไม่ใช่ของประดับ
                        aria-hidden เพราะลิงก์มีชื่อของมันอยู่แล้วในข้อความข้างบน */}
                    <span
                      aria-hidden
                      className="text-body text-ink transition-transform duration-300 ease-out group-hover:translate-x-1.5"
                    >
                      →
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        {/* ── ติดต่อจริง ────────────────────────────────────────────────────
            เว็บนี้ไม่มีตะกร้า ปลายทางของทุกหน้าคือคุยกับคน เบอร์กับ LINE จึงอยู่
            ตรงนี้เป็นลิงก์กดได้ ไม่ใช่ตัวหนังสือให้จดไปโทรเอง
            (ท้ายเว็บก็มีเบอร์เดียวกัน แต่นั่นคือข้อมูลองค์กร ไม่ใช่การชวนคุย) */}
        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <p className="micro">{t.footer.contact}</p>
            <a
              href={`tel:${CONTACT.phone.replace(/[^0-9+]/g, '')}`}
              className="text-body-sm font-normal text-ink underline decoration-line-6 underline-offset-4 transition-colors hover:decoration-ink"
            >
              {CONTACT.phone}
            </a>
            <span className="text-body-sm font-normal text-dim">LINE {CONTACT.line}</span>
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-body-sm font-normal text-ink underline decoration-line-6 underline-offset-4 transition-colors hover:decoration-ink"
            >
              {CONTACT.email}
            </a>
            <span className="text-body-sm font-normal text-dim">{t.footer.hours}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
