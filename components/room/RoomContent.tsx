'use client';

// หน้าจำลองห้องครัว: ฉาก 3D + แผงเลือกผัง วัสดุ แสง มุมมอง
// three.js โหลดเฉพาะหน้านี้ (dynamic import) หน้าอื่นไม่หนักขึ้น · ตัวเลือกทั้งหมดมาจาก lib/room.ts (MOCK)

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useLang } from '@/components/LangProvider';
import FinishDots from '@/components/FinishDots';
import { FAUCET } from '@/lib/finishes';
import { DEFAULT_PICKS, LAYOUTS, LIGHTS, PARTS, type LayoutId, type LightId, type PartId, type Picks } from '@/lib/room';
import type { Part, RoomHandle } from './RoomScene';

const Skeleton = () => <div className="absolute inset-0 animate-pulse bg-warm-200 motion-reduce:animate-none" aria-hidden />;
const RoomScene = dynamic(() => import('./RoomScene'), { ssr: false, loading: Skeleton });

const PART_ORDER: PartId[] = ['doors', 'top', 'splash', 'floor'];
const legend = 'mb-2 flex items-baseline justify-between gap-3 text-xs font-normal text-warm-500';
const button =
  'border px-4 py-2.5 text-sm transition-[color,background-color,border-color,transform] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';
const picked = (on: boolean) => (on ? 'border-ink bg-ink text-paper' : 'border-warm-300 text-ink hover:border-ink');

export default function RoomContent() {
  const { lang, t } = useLang();
  const [layout, setLayout] = useState<LayoutId>('i');
  const [picks, setPicks] = useState<Picks>(DEFAULT_PICKS);
  const [light, setLight] = useState<LightId>('day');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const scene = useRef<RoomHandle>(null);
  const faucet = FAUCET.find((f) => f.id === picks.faucet)!;
  const groups = useRef<Partial<Record<Part, HTMLFieldSetElement | null>>>({});
  const [flash, setFlash] = useState<Part | null>(null);
  const flashOff = useRef(0);
  const nameOf = (part: Part) => (part === 'faucet' ? faucet : PARTS[part].find((o) => o.id === picks[part])!).name[lang];
  // กดชิ้นส่วนในฉาก: เลื่อนแผงไปหมวดนั้น เน้นพื้นหลังชั่วครู่ แล้วย้าย focus ไปตัวเลือกที่เลือกอยู่
  const jumpTo = (part: Part) => {
    const group = groups.current[part];
    if (!group) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = still ? 'auto' : 'smooth';
    const panel = group.parentElement!;
    // lg ขึ้นไปแผงเลื่อนในตัวเอง: เลื่อนเฉพาะแผง (scrollIntoView จะพาทั้งหน้าเลื่อนไปด้วย)
    if (getComputedStyle(panel).overflowY === 'auto') panel.scrollTo({ top: panel.scrollTop + group.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16, behavior });
    else group.scrollIntoView({ behavior, block: 'start' });
    group.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    setFlash(part);
    window.clearTimeout(flashOff.current);
    flashOff.current = window.setTimeout(() => setFlash(null), 1400);
  };
  // scroll-mt: ต่ำกว่า lg ฉากติดบนจอ (เมนู 5rem + ฉาก 45dvh) หมวดที่เลื่อนมาต้องหยุดใต้ฉาก
  const group = (part: Part) =>
    `scroll-mt-[calc(max(45dvh,280px)+7.5rem)] transition-[background-color,box-shadow] duration-500 motion-reduce:transition-none ${flash === part ? 'bg-warm-200 shadow-[0_0_0_8px_theme(colors.warm.200)]' : 'shadow-[0_0_0_8px_transparent]'}`;

  return (
    <section className="px-6 pb-16 md:px-[4vw] lg:grid lg:h-[100dvh] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:pb-8 lg:pt-24">
      {/* ต่ำกว่า lg: ฉากติดบนจอ แผงเลื่อนอยู่ข้างใต้ · ตัวห่อพื้นทึบสูงถึงขอบบนจอ บังข้อความที่เลื่อนผ่านใต้เมนู (เมนูโปร่งใส) */}
      <div className="sticky top-0 z-10 mx-[-1.5rem] bg-paper px-6 pt-20 md:mx-[-4vw] md:px-[4vw] lg:static lg:mx-0 lg:min-h-0 lg:p-0">
      <div className="relative h-[45dvh] min-h-[280px] overflow-hidden bg-warm-200 lg:h-full">
        {state === 'error' ? (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-stone-600">{t.room.noWebgl}</p>
        ) : (
          <>
            <RoomScene
              ref={scene}
              layout={layout}
              picks={picks}
              light={light}
              label={t.room.sceneLabel}
              tipText={(part) => `${t.room[part]} · ${nameOf(part)}`}
              onPick={jumpTo}
              onReady={() => setState('ready')}
              onError={() => setState('error')}
            />
            {state === 'loading' && <Skeleton />}
          </>
        )}
      </div>
      </div>

      <div className="flex flex-col gap-7 pt-8 lg:-ml-2 lg:min-h-0 lg:overflow-y-auto lg:pl-2 lg:pr-1 lg:pt-1" data-lenis-prevent>
        <div>
          <h1 className="text-3xl font-extralight leading-snug tracking-wide md:text-4xl">{t.room.title}</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{t.room.help}</p>
        </div>

        <fieldset>
          <legend className={legend}>{t.room.layout}</legend>
          <div className="flex flex-wrap gap-2">
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" aria-pressed={layout === l.id} onClick={() => setLayout(l.id)} className={`${button} ${picked(layout === l.id)}`}>
                {l.name[lang]}
              </button>
            ))}
          </div>
        </fieldset>

        {PART_ORDER.map((part) => {
          const current = PARTS[part].find((o) => o.id === picks[part])!;
          return (
            <fieldset key={part} ref={(node) => { groups.current[part] = node; }} className={group(part)}>
              <legend className={`${legend} w-full`}>
                <span>{t.room[part]}</span>
                <span className="text-ink">{current.name[lang]}</span>
              </legend>
              <div className="-ml-2 flex">
                {PARTS[part].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={o.id === current.id}
                    aria-label={o.name[lang]}
                    title={o.name[lang]}
                    onClick={() => setPicks((p) => ({ ...p, [part]: o.id }))}
                    className="flex h-11 w-11 items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] motion-reduce:transition-none"
                  >
                    <span
                      aria-hidden
                      className={`block h-7 w-7 rounded-full border border-warm-300 ${o.id === current.id ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`}
                      style={{ background: o.swatch }}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}

        <fieldset ref={(node) => { groups.current.faucet = node; }} className={group('faucet')}>
          <legend className={`${legend} w-full`}>
            <span>{t.room.faucet}</span>
            <span className="text-ink">
              {faucet.name[lang]}
              {faucet.demo && <span className="ml-2 text-warm-500">{t.products.finishDemo}</span>}
            </span>
          </legend>
          <FinishDots finishes={FAUCET} value={picks.faucet} onChange={(id) => setPicks((p) => ({ ...p, faucet: id }))} />
        </fieldset>

        <fieldset>
          <legend className={legend}>{t.room.light}</legend>
          <div className="flex flex-wrap gap-2">
            {LIGHTS.map((l) => (
              <button key={l.id} type="button" aria-pressed={light === l.id} onClick={() => setLight(l.id)} className={`${button} ${picked(light === l.id)}`}>
                {l.name[lang]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>{t.room.view}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-label={t.room.zoomOut} onClick={() => scene.current?.zoom(-0.15)} className={`${button} ${picked(false)}`}>
              −
            </button>
            <button type="button" aria-label={t.room.zoomIn} onClick={() => scene.current?.zoom(0.15)} className={`${button} ${picked(false)}`}>
              +
            </button>
            <button type="button" onClick={() => scene.current?.reset()} className={`${button} ${picked(false)}`}>
              {t.room.reset}
            </button>
          </div>
        </fieldset>

        <Link href="/contact/" className={`${button} border-ink text-center font-normal text-ink hover:bg-ink hover:text-paper`}>
          {t.nav.showroom}
        </Link>
        <p className="text-xs font-normal leading-relaxed text-warm-500">{t.room.note}</p>
      </div>
    </section>
  );
}
