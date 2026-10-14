'use client';

// โครงหลังบ้านธีมกระจก iOS 26: พื้นหลังเบลอ เมนูซ้าย ปรับความทึบกระจก ออกจากระบบ
// ทับโครงเว็บด้วย fixed overlay แทนการแยก layout ของเว็บ (ยกมาจาก mockup ProductsAdmin 2026-10-14)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/login/actions';
import { ghost } from './ui';

const GLASS_KEY = 'admin:glass';
// ต่ำสุด 0.7 คิดจากกรณีแย่สุด: พื้นหลังดำสนิท (ภาพ 70% ทับ warm-200) แล้วกระจกขาว 0.7 ทับ ได้พื้นราว rgb(200,199,198)
// stone-600 บนพื้นนี้ = 4.5:1 พอดี จึงอ่านผ่านทุกภาพพื้นหลัง · ต่ำกว่านี้ต้องวัดจาก pixel ของภาพจริง
const GLASS_MIN = 0.7;
const GLASS_MAX = 0.95;
const MENU = [
  { href: '/admin/products/', label: 'สินค้า' },
  { href: '/admin/categories/', label: 'หมวด แบรนด์ วัสดุ' },
  { href: '/admin/announcement/', label: 'ประกาศ' },
];
// ทำในแผนที่ 2
const LATER = ['บทความ', 'ผลงาน', 'แคตตาล็อก'];

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
  useEffect(() => setGlass(readGlass()), []);
  useEffect(() => {
    try {
      localStorage.setItem(GLASS_KEY, String(glass));
    } catch {}
  }, [glass]);

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

      <div className="relative mx-auto grid min-h-full max-w-7xl gap-4 p-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <aside className="glass flex flex-col gap-6 rounded-[28px] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div>
            <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
            <p className="mt-1 truncate text-xs text-stone-600">หลังบ้าน · {name}</p>
          </div>
          <nav aria-label="เมนูหลังบ้าน">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
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
              {LATER.map((x) => (
                <li key={x}>
                  <span className="flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm text-stone-600">{x}</span>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-4">
            <label className="block text-sm">
              ความทึบของกระจก <span className="text-stone-600">{Math.round(glass * 100)}%</span>
              <input
                type="range"
                min={GLASS_MIN}
                max={GLASS_MAX}
                step={0.05}
                value={glass}
                onChange={(e) => setGlass(Number(e.target.value))}
                className="mt-2 block w-full accent-ink"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              <Link href="/" target="_blank" className={ghost}>
                เปิดหน้าเว็บ
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={ghost}>
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="space-y-4 lg:space-y-6">{children}</div>
      </div>
    </div>
  );
}
