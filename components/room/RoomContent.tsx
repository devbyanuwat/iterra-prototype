'use client';

// หน้าจำลองห้องครัว: ฉาก 3D + แผงเลือกผัง วัสดุ แสง มุมมอง
// three.js โหลดเฉพาะหน้านี้ (dynamic import) หน้าอื่นไม่หนักขึ้น · ตัวเลือกทั้งหมดมาจาก lib/room.ts (MOCK)

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import FocusCard from './FocusCard';
import { useLang } from '@/components/LangProvider';
import FinishDots from '@/components/FinishDots';
import { FAUCET } from '@/lib/finishes';
import { DEFAULT_PICKS, FAUCET_NOTES, FAUCET_SHAPES, LAYOUTS, LIGHTS, PARTS, SINKS, type LayoutId, type LightId, type Part, type PartId, type Picks } from '@/lib/room';
import type { RoomHandle } from './RoomScene';

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
  const [focus, setFocus] = useState<Part | null>(null); // หมวดที่กำลังเจาะดูในฉาก
  const [cardOpen, setCardOpen] = useState(true); // การ์ดเจาะดูกางอยู่ไหม · ผู้ใช้ย่อได้เมื่อการ์ดบังชิ้นส่วน
  const stage = useRef<HTMLDivElement>(null);
  const sink = SINKS.find((s) => s.id === picks.sink)!;
  const faucetShape = FAUCET_SHAPES.find((s) => s.id === picks.faucetShape)!;
  const nameOf = (part: Part) => (part === 'faucet' ? faucet : part === 'sink' ? sink : PARTS[part].find((o) => o.id === picks[part])!).name[lang];
  const shapeButtons = (list: typeof SINKS) => list.map((s) => ({ id: s.id, label: s.name[lang] }));
  // สิ่งที่การ์ดเจาะดูแสดงต่อหมวด: ก๊อก = สีผิว + ทรง · ซิงก์ = ทรงอย่างเดียว · หมวดอื่น = สี/วัสดุ
  const cardOf = (part: Part) => {
    if (part === 'sink') return { note: sink.note[lang], choices: [], shapes: shapeButtons(SINKS), shape: picks.sink, onShape: (id: string) => setPicks((p) => ({ ...p, sink: id })) };
    if (part === 'faucet')
      return {
        note: `${faucetShape.note[lang]} ${FAUCET_NOTES[picks.faucet][lang]}`,
        choices: FAUCET.map((f) => ({ id: f.id, label: demoName(f), swatch: f.swatch })),
        shapes: shapeButtons(FAUCET_SHAPES),
        shape: picks.faucetShape,
        onShape: (id: string) => setPicks((p) => ({ ...p, faucetShape: id })),
      };
    return { note: PARTS[part].find((o) => o.id === picks[part])!.note[lang], choices: PARTS[part].map((o) => ({ id: o.id, label: o.name[lang], swatch: o.swatch })) };
  };
  const demoName = (f: (typeof FAUCET)[number]) => (f.demo ? `${f.name[lang]} (${t.products.finishDemo})` : f.name[lang]);
  // ออกจากโหมดเจาะดู · ถ้า focus อยู่ในการ์ด (ซึ่งกำลังจะหายไป) ให้ย้ายกลับไปที่ฉาก
  const leave = () => {
    if (stage.current?.querySelector('[data-focus-card]')?.contains(document.activeElement)) scene.current?.focusScene();
    setFocus(null);
  };

  return (
    <section className="px-6 pb-16 md:px-[4vw] lg:grid lg:h-[100dvh] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:pb-8 lg:pt-24">
      {/* ต่ำกว่า lg: ฉากติดบนจอ แผงเลื่อนอยู่ข้างใต้ · ตัวห่อพื้นทึบสูงถึงขอบบนจอ บังข้อความที่เลื่อนผ่านใต้เมนู (เมนูโปร่งใส) */}
      <div className="sticky top-0 z-10 mx-[-1.5rem] bg-paper px-6 pt-20 md:mx-[-4vw] md:px-[4vw] lg:static lg:mx-0 lg:min-h-0 lg:p-0">
      <div
        ref={stage}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && focus) leave();
        }}
        className="relative h-[45dvh] min-h-[280px] overflow-hidden bg-warm-200 lg:h-full"
      >
        {state === 'error' ? (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-stone-600">{t.room.noWebgl}</p>
        ) : (
          <>
            <RoomScene
              ref={scene}
              layout={layout}
              focus={focus}
              picks={picks}
              light={light}
              label={t.room.sceneLabel}
              tipText={(part) => `${t.room[part]} · ${nameOf(part)}`}
              onPick={setFocus}
              onReady={() => setState('ready')}
              onError={() => setState('error')}
            />
            {state === 'loading' && <Skeleton />}
            {focus && state === 'ready' && (
              <FocusCard
                part={focus}
                title={t.room[focus]}
                name={nameOf(focus)}
                tag={focus === 'faucet' && faucet.demo ? t.products.finishDemo : undefined}
                {...cardOf(focus)}
                value={picks[focus]}
                onChange={(id) => setPicks((p) => ({ ...p, [focus]: id }))}
                back={t.room.back}
                onBack={leave}
                open={cardOpen}
                collapse={t.room.collapse}
                expand={t.room.expand}
                onToggle={() => setCardOpen((o) => !o)}
              />
            )}
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
              <button key={l.id} type="button" aria-pressed={layout === l.id} onClick={() => {
                  leave();
                  setLayout(l.id);
                }} className={`${button} ${picked(layout === l.id)}`}>
                {l.name[lang]}
              </button>
            ))}
          </div>
        </fieldset>

        {PART_ORDER.map((part) => {
          const current = PARTS[part].find((o) => o.id === picks[part])!;
          return (
            <fieldset key={part}>
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

        <fieldset>
          <legend className={`${legend} w-full`}>
            <span>{t.room.faucet}</span>
            <span className="text-ink">
              {faucet.name[lang]}
              {faucet.demo && <span className="ml-2 text-warm-500">{t.products.finishDemo}</span>}
            </span>
          </legend>
          <FinishDots finishes={FAUCET} value={picks.faucet} onChange={(id) => setPicks((p) => ({ ...p, faucet: id }))} />
        </fieldset>

        {(
          [
            ['faucetShape', FAUCET_SHAPES, t.room.faucetShape, faucetShape],
            ['sink', SINKS, t.room.sink, sink],
          ] as const
        ).map(([key, list, label, current]) => (
          <fieldset key={key}>
            <legend className={legend}>{label}</legend>
            <div className="flex flex-wrap gap-2">
              {list.map((s) => (
                <button key={s.id} type="button" aria-pressed={s.id === current.id} onClick={() => setPicks((p) => ({ ...p, [key]: s.id }))} className={`${button} ${picked(s.id === current.id)}`}>
                  {s.name[lang]}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

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
            <button type="button" onClick={() => (focus ? leave() : scene.current?.reset())} className={`${button} ${picked(false)}`}>
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
