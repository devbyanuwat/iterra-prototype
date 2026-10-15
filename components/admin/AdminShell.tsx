'use client';

// โครงหลังบ้านธีมกระจก iOS 26: พื้นหลังเบลอ เมนู ปรับความทึบกระจก ออกจากระบบ
// ทับโครงเว็บด้วย fixed overlay แทนการแยก layout ของเว็บ (ยกมาจาก mockup ProductsAdmin 2026-10-14)
// เมนู 3 แบบตาม docs/mockups/admin-mobile.html (2026-10-15):
//   มือถือ (ต่ำกว่า md 768) แถบลอยแบบ IG ด้านล่าง · iPad แนวตั้ง (md ถึง lg) rail ไอคอน · ตั้งแต่ lg 1024 sidebar เต็ม
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/login/actions';
import { danger, ghost } from './ui';

const GLASS_KEY = 'admin:glass';
// ต่ำสุด 0.7 คิดจากกรณีแย่สุด: พื้นหลังดำสนิท (ภาพ 70% ทับ warm-200) แล้วกระจกขาว 0.7 ทับ ได้พื้นราว rgb(200,199,198)
// stone-600 บนพื้นนี้ = 4.5:1 พอดี จึงอ่านผ่านทุกภาพพื้นหลัง · ต่ำกว่านี้ต้องวัดจาก pixel ของภาพจริง
const GLASS_MIN = 0.7;
const GLASS_MAX = 0.95;
// bar = อยู่บนแถบลอยของมือถือ (ไม่เกิน 4 อัน ปุ่มละกว้างพอแตะบนจอ 375) ที่เหลืออยู่ใน sheet อื่น ๆ · rail ของ iPad และ sidebar แสดงครบ
type MenuItem = { href: string; label: string; icon: keyof typeof ICON_PATHS; bar?: boolean };
const MENU: MenuItem[] = [
  { href: '/admin/products/', label: 'สินค้า', icon: 'box', bar: true },
  { href: '/admin/articles/', label: 'บทความ', icon: 'doc', bar: true },
  { href: '/admin/projects/', label: 'ผลงาน', icon: 'house', bar: true },
  { href: '/admin/inquiries/', label: 'ข้อความติดต่อ', icon: 'mail', bar: true },
  { href: '/admin/categories/', label: 'หมวด แบรนด์ วัสดุ', icon: 'tag' },
  { href: '/admin/announcement/', label: 'ประกาศ', icon: 'megaphone' },
  { href: '/admin/catalog/', label: 'แคตตาล็อก', icon: 'book' },
];
const MORE_LABEL = 'อื่น ๆ: เมนูที่เหลือ ความทึบกระจก เปิดหน้าเว็บ ออกจากระบบ';

const ICON_PATHS = {
  box: (
    <>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.5 6.5a1.4 1.4 0 0 1-2 0z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5L14 19V5L7.5 9H5a1 1 0 0 0-1 1z" />
      <path d="M17.5 9.2a4 4 0 0 1 0 5.6M8 15l1 4.5" />
    </>
  ),
  doc: (
    <>
      <path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z" />
      <path d="M14.5 3.5V7H18M9 11.5h6M9 15h6" />
    </>
  ),
  house: (
    <>
      <path d="M4 20.5h16M6 20.5V9.5L12 4.5l6 5v11" />
      <path d="M10 20.5v-5h4v5" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5c2.7-1.3 5.3-1.3 8 0v14c-2.7-1.3-5.3-1.3-8 0z" />
      <path d="M12 5.5c2.7-1.3 5.3-1.3 8 0v14c-2.7-1.3-5.3-1.3-8 0z" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.6 18.2a6.2 6.2 0 0 1 10.8 0" />
    </>
  ),
};

function Icon({ name, bold }: { name: keyof typeof ICON_PATHS; bold?: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2 : 1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {ICON_PATHS[name]}
    </svg>
  );
}

function readGlass() {
  try {
    const v = Number(localStorage.getItem(GLASS_KEY));
    return v >= GLASS_MIN && v <= GLASS_MAX ? v : 0.8;
  } catch {
    return 0.8;
  }
}

export default function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  const [glass, setGlass] = useState(0.8);
  const moreRef = useRef<HTMLDialogElement>(null);
  useEffect(() => setGlass(readGlass()), []);
  useEffect(() => {
    try {
      localStorage.setItem(GLASS_KEY, String(glass));
    } catch {}
  }, [glass]);
  // เปลี่ยนหน้าแล้วปิด sheet อื่น ๆ
  useEffect(() => moreRef.current?.close(), [path]);

  const brand = (
    <div>
      <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
      <p className="mt-1 truncate text-xs text-stone-600">หลังบ้าน · {name}</p>
    </div>
  );
  // เมนูที่ไม่อยู่บนแถบลอยของมือถือ แสดงใน sheet อื่น ๆ · ตั้งแต่ md มี rail ครบทุกเมนูแล้ว จึงซ่อน
  const sheetLinks = MENU.filter((m) => !m.bar).map((m) => (
    <li key={m.href}>
      <Link
        href={m.href}
        aria-current={path.startsWith(m.href) ? 'page' : undefined}
        className={`${ghost} w-full justify-center bg-white/60 text-center`}
      >
        {m.label}
      </Link>
    </li>
  ));
  // sheet ใช้ปุ่ม 2 ช่องเท่ากันตาม mockup · sidebar ใช้ปุ่มแบบเดิม
  const settings = (sheet: boolean) => (
    <>
      <label className="block text-sm">
        ความทึบของกระจก <span className="text-stone-600">{Math.round(glass * 100)}%</span>
        <input
          type="range"
          min={GLASS_MIN}
          max={GLASS_MAX}
          step={0.05}
          value={glass}
          onChange={(e) => setGlass(Number(e.target.value))}
          className="mt-2 block h-11 w-full accent-ink"
        />
      </label>
      <div className={sheet ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-1'}>
        <Link href="/" target="_blank" className={sheet ? `${ghost} justify-center bg-white/60` : ghost}>
          เปิดหน้าเว็บ
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={sheet ? `${ghost} ${danger} w-full justify-center bg-white/60` : ghost}>
            ออกจากระบบ
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] overflow-y-auto bg-warm-200 font-normal text-ink"
      style={{ '--glass': glass } as React.CSSProperties}
    >
      {/* พื้นหลังให้กระจกมีอะไรให้เบลอ: ภาพครัวจางกับแสงอุ่น 2 ดวง */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <img src="/media/scenes/about-hero.webp" alt="" className="h-full w-full object-cover opacity-70" />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-amber-200/60 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-stone-300/70 blur-3xl" />
      </div>

      {/* คอลัมน์ต้องกำหนดทุกขนาดจอ ไม่งั้น grid ขยายตามแถวเมนูที่ห้ามตัดบรรทัดจนล้นจอมือถือ
          มือถือเว้นล่าง 7rem ไม่ให้แถบลอยบังรายการสุดท้าย */}
      <div className="relative mx-auto grid min-h-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 md:grid-cols-[4.75rem_minmax(0,1fr)] md:pb-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:p-6">
        {/* iPad แนวตั้ง: rail ไอคอนแคบ ให้เนื้อหาได้ที่กว้างขึ้น */}
        <aside className="glass sticky top-4 hidden h-[calc(100dvh-2rem)] flex-col items-center gap-3 rounded-[28px] px-2 py-4 md:flex lg:hidden">
          <p className="sr-only">ITERRA หลังบ้าน · {name}</p>
          <nav aria-label="เมนูหลังบ้าน">
            <ul className="flex flex-col items-center gap-2">
              {MENU.map((m) => {
                const on = path.startsWith(m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={on ? 'page' : undefined}
                      aria-label={m.label}
                      title={m.label}
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${on ? 'bg-ink text-paper' : 'text-ink hover:bg-white/70'}`}
                    >
                      <Icon name={m.icon} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <button
            type="button"
            aria-label={MORE_LABEL}
            title="อื่น ๆ"
            aria-haspopup="dialog"
            onClick={() => moreRef.current?.showModal()}
            className="mt-auto flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/70"
          >
            <Icon name="person" />
          </button>
        </aside>

        {/* ตั้งแต่ lg: sidebar เต็มแบบเดิม */}
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] flex-col gap-6 rounded-[28px] p-5 lg:flex">
          {brand}
          <nav aria-label="เมนูหลังบ้าน">
            <ul className="flex flex-col gap-1">
              {MENU.map((m) => {
                const on = path.startsWith(m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={on ? 'page' : undefined}
                      className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm ${
                        on ? 'bg-ink text-paper' : 'text-ink hover:bg-white/70'
                      }`}
                    >
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-auto space-y-4">{settings(false)}</div>
        </aside>

        <div className="min-w-0 space-y-4 lg:space-y-6">{children}</div>
      </div>

      {/* มือถือ: แถบลอยแบบ IG แคปซูลกระจก ไอคอนล้วน แท็บที่เลือกมีแคปซูลเทารอง */}
      <nav aria-label="เมนูหลังบ้าน" className="fixed inset-x-3 z-10 mx-auto max-w-md md:hidden" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <ul className="glass flex h-16 items-center rounded-full px-2 shadow-[0_10px_30px_rgb(28_25_23/0.18)]">
          {MENU.filter((m) => m.bar).map((m) => {
            const on = path.startsWith(m.href);
            return (
              <li key={m.href} className="flex-1">
                <Link href={m.href} aria-current={on ? 'page' : undefined} aria-label={m.label} className="flex h-16 items-center justify-center">
                  <span className={`flex h-12 w-full items-center justify-center rounded-full ${on ? 'bg-ink/[0.07]' : ''}`}>
                    <Icon name={m.icon} bold={on} />
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-label={MORE_LABEL}
              aria-haspopup="dialog"
              onClick={() => moreRef.current?.showModal()}
              className="flex h-16 w-full items-center justify-center"
            >
              <span className="flex h-12 w-full items-center justify-center rounded-full">
                <Icon name="person" />
              </span>
            </button>
          </li>
        </ul>
      </nav>

      {/* sheet อื่น ๆ (มือถือและ iPad แนวตั้ง) · แตะพื้นหลังเพื่อปิด */}
      <dialog
        ref={moreRef}
        aria-labelledby="admin-more-title"
        onClick={(e) => e.target === e.currentTarget && moreRef.current?.close()}
        className="mb-0 mt-auto w-full max-w-md bg-transparent p-0 text-ink backdrop:bg-ink/30 md:mb-auto"
      >
        <div className="glass m-2 space-y-5 rounded-[28px] p-5" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-stone-400/60 md:hidden" />
          <div id="admin-more-title" tabIndex={-1} autoFocus className="outline-none">
            {brand}
          </div>
          <nav aria-label="เมนูอื่น" className="md:hidden">
            <ul className="grid grid-cols-2 gap-2">{sheetLinks}</ul>
          </nav>
          {settings(true)}
          <button type="button" className={`${ghost} w-full justify-center`} onClick={() => moreRef.current?.close()}>
            ปิด
          </button>
        </div>
      </dialog>
    </div>
  );
}
