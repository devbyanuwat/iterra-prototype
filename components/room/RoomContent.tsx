'use client';

// หน้าจำลองห้องครัว: ฉาก 3D + แผงเลือกผัง วัสดุ แสง มุมมอง
// three.js โหลดเฉพาะหน้านี้ (dynamic import) หน้าอื่นไม่หนักขึ้น · ตัวเลือกทั้งหมดมาจาก lib/room.ts (MOCK)

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import FocusCard from './FocusCard';
import SurfacePicker from './SurfacePicker';
import { useLang } from '@/components/LangProvider';
import FinishDots from '@/components/FinishDots';
import { FAUCET } from '@/lib/finishes';
import { DEFAULT_PICKS, FAUCET_NOTES, FAUCET_SHAPES, LAYOUTS, LIGHTS, SINKS, SINK_COLORS, SURFACES, type LayoutId, type LightId, type Part, type Picks, type SurfaceId } from '@/lib/room';
import type { RoomHandle } from './RoomScene';

const Skeleton = () => <div className="absolute inset-0 animate-pulse bg-warm-200 motion-reduce:animate-none" aria-hidden />;
const RoomScene = dynamic(() => import('./RoomScene'), { ssr: false, loading: Skeleton });

const PART_ORDER: SurfaceId[] = ['upper', 'lower', 'top', 'splash', 'floor'];
const isSurface = (part: Part): part is SurfaceId => part in SURFACES;
// หมวดของแผงตัวเลือก · จอแคบกว่า lg โชว์ทีละหมวด เลือกด้วยแถวปุ่มหมวดใต้ฉาก · จอกว้างโชว์ทุกหมวด
type Tab = 'layout' | Part | 'light';
const TABS: Tab[] = ['layout', 'upper', 'lower', 'top', 'splash', 'floor', 'faucet', 'sink', 'light'];
const isPart = (tab: Tab): tab is Part => tab !== 'layout' && tab !== 'light';
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
  const [tab, setTab] = useState<Tab>('layout'); // หมวดที่โชว์บนจอแคบ
  const only = (id: Tab) => (tab === id ? '' : 'max-lg:hidden');
  const [cardOpen, setCardOpen] = useState(true); // การ์ดเจาะดูกางอยู่ไหม · ผู้ใช้ย่อได้เมื่อการ์ดบังชิ้นส่วน
  const stage = useRef<HTMLDivElement>(null);
  const sink = SINKS.find((s) => s.id === picks.sink)!;
  const sinkColor = SINK_COLORS.find((o) => o.id === picks.sinkColor)!;
  const faucetShape = FAUCET_SHAPES.find((s) => s.id === picks.faucetShape)!;
  // พื้นผิว: วัสดุที่เลือก · ชื่อที่โชว์ = วัสดุ + ชื่อสีสำเร็จ หรือรหัสสีถ้ากำหนดเอง · วัสดุเดียวกับท็อปไม่มีสีของตัวเอง
  const surfaceOf = (part: SurfaceId) => {
    const { materials, colours } = SURFACES[part];
    const material = materials.find((o) => o.id === picks[part].material)!;
    const own = material.look !== 'top';
    const colour = colours.find((c) => c.hex === picks[part].color)?.name[lang] ?? picks[part].color.toUpperCase();
    return { material, colours: own ? colours : [], name: own ? `${material.name[lang]} · ${colour}` : material.name[lang] };
  };
  const picker = (part: SurfaceId, compact = false) => (
    <SurfacePicker
      key={part}
      compact={compact}
      materials={SURFACES[part].materials.map((o) => ({ id: o.id, label: o.name[lang] }))}
      material={picks[part].material}
      onMaterial={(material) => setPicks((p) => ({ ...p, [part]: { ...p[part], material } }))}
      colours={surfaceOf(part).colours.map((c) => ({ hex: c.hex, label: c.name[lang] }))}
      color={picks[part].color}
      onColor={(color) => setPicks((p) => ({ ...p, [part]: { ...p[part], color } }))}
      text={t.room}
    />
  );
  const nameOf = (part: Part) => (isSurface(part) ? surfaceOf(part).name : (part === 'faucet' ? faucet : sinkColor).name[lang]);
  const shapeButtons = (list: typeof SINKS) => list.map((s) => ({ id: s.id, label: s.name[lang] }));
  // สิ่งที่การ์ดเจาะดูแสดงต่อหมวด: ก๊อกและซิงก์ = สี + ทรง · พื้นผิว = วัสดุ + สี
  const cardOf = (part: Part) => {
    const set = (key: 'faucet' | 'faucetShape' | 'sink' | 'sinkColor') => (id: string) => setPicks((p) => ({ ...p, [key]: id }));
    if (part === 'sink')
      return {
        note: `${sink.note[lang]} ${sinkColor.note[lang]}`,
        choices: SINK_COLORS.map((o) => ({ id: o.id, label: o.name[lang], swatch: o.swatch })),
        value: picks.sinkColor,
        onChange: set('sinkColor'),
        shapes: shapeButtons(SINKS),
        shape: picks.sink,
        onShape: set('sink'),
      };
    if (part === 'faucet')
      return {
        note: `${faucetShape.note[lang]} ${FAUCET_NOTES[picks.faucet][lang]}`,
        choices: FAUCET.map((f) => ({ id: f.id, label: demoName(f), swatch: f.swatch })),
        shapes: shapeButtons(FAUCET_SHAPES),
        value: picks.faucet,
        onChange: set('faucet'),
        shape: picks.faucetShape,
        onShape: set('faucetShape'),
      };
    return { note: surfaceOf(part).material.note[lang], children: picker(part, true) };
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
              lang={lang}
              label={t.room.sceneLabel}
              tipText={(part) => `${t.room[part]} · ${nameOf(part)}`}
              onPick={(part) => {
                setFocus(part);
                setTab(part); // จอแคบ: แผงสลับไปหมวดของชิ้นที่แตะ แทนการ์ดบนฉาก
              }}
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
                back={t.room.back}
                onBack={leave}
                open={cardOpen}
                collapse={t.room.collapse}
                expand={t.room.expand}
                onToggle={() => setCardOpen((o) => !o)}
              />
            )}
            {/* จอแคบไม่มีการ์ดบนฉาก: ปุ่มกลับมุมกว้างอยู่มุมบนขวาของฉาก */}
            {focus && state === 'ready' && (
              <button type="button" onClick={leave} className="absolute right-2 top-2 z-10 min-h-11 border border-warm-300 bg-paper px-3 text-xs text-ink transition-transform active:scale-[0.98] motion-reduce:transition-none lg:hidden">
                {t.room.back}
              </button>
            )}
          </>
        )}
      </div>
      </div>

      <div className="flex flex-col gap-7 pt-5 lg:-ml-2 lg:min-h-0 lg:overflow-y-auto lg:pl-2 lg:pr-1 lg:pt-1" data-lenis-prevent>
        <div>
          <h1 className="text-2xl font-extralight leading-snug tracking-wide md:text-4xl">{t.room.title}</h1>
          <p className="mt-3 hidden text-sm font-light leading-relaxed text-stone-600 lg:block">{t.room.help}</p>
        </div>

        {/* แถวปุ่มหมวด (จอแคบ): เลื่อนซ้ายขวาได้ · ตอนเจาะดูอยู่ กดหมวดของชิ้นอื่น กล้องย้ายไปชิ้นนั้น */}
        <div role="group" aria-label={t.room.groups} className="-mx-6 -mb-2 flex gap-5 overflow-x-auto px-6 [scrollbar-width:none] md:-mx-[4vw] md:px-[4vw] lg:hidden">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                if (focus && isPart(id)) setFocus(id);
              }}
              className={`min-h-11 shrink-0 border-b text-sm transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink ${tab === id ? 'border-ink text-ink' : 'border-transparent text-warm-500'}`}
            >
              {t.room[id]}
            </button>
          ))}
        </div>

        <fieldset className={only('layout')}>
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

        {PART_ORDER.map((part) => (
          <fieldset key={part} className={only(part)}>
            <legend className={`${legend} w-full`}>
              <span>{t.room[part]}</span>
              <span className="text-ink">{surfaceOf(part).name}</span>
            </legend>
            {picker(part)}
          </fieldset>
        ))}

        <fieldset className={only('faucet')}>
          <legend className={`${legend} w-full`}>
            <span>{t.room.faucet}</span>
            <span className="text-ink">
              {faucet.name[lang]}
              {faucet.demo && <span className="ml-2 text-warm-500">{t.products.finishDemo}</span>}
            </span>
          </legend>
          <FinishDots finishes={FAUCET} value={picks.faucet} onChange={(id) => setPicks((p) => ({ ...p, faucet: id }))} />
        </fieldset>

        <fieldset className={only('faucet')}>
          <legend className={legend}>{t.room.faucetShape}</legend>
            <div className="flex flex-wrap gap-2">
              {FAUCET_SHAPES.map((s) => (
                <button key={s.id} type="button" aria-pressed={s.id === faucetShape.id} onClick={() => setPicks((p) => ({ ...p, faucetShape: s.id }))} className={`${button} ${picked(s.id === faucetShape.id)}`}>
                  {s.name[lang]}
                </button>
              ))}
            </div>
        </fieldset>

        <fieldset className={only('sink')}>
          <legend className={`${legend} w-full`}>
            <span>{t.room.sink}</span>
            <span className="text-ink">{sinkColor.name[lang]}</span>
          </legend>
              <div className="-ml-2 flex">
                {SINK_COLORS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={o.id === sinkColor.id}
                    aria-label={o.name[lang]}
                    title={o.name[lang]}
                    onClick={() => setPicks((p) => ({ ...p, sinkColor: o.id }))}
                    className="flex h-11 w-11 items-center justify-center transition-transform focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:scale-[0.92] motion-reduce:transition-none"
                  >
                    <span aria-hidden className={`block h-7 w-7 rounded-full border border-warm-300 ${o.id === sinkColor.id ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper' : ''}`} style={{ background: o.swatch }} />
                  </button>
                ))}
              </div>
            <div className="flex flex-wrap gap-2">
              {SINKS.map((s) => (
                <button key={s.id} type="button" aria-pressed={s.id === sink.id} onClick={() => setPicks((p) => ({ ...p, sink: s.id }))} className={`${button} ${picked(s.id === sink.id)}`}>
                  {s.name[lang]}
                </button>
              ))}
            </div>
        </fieldset>

        <fieldset className={only('light')}>
          <legend className={legend}>{t.room.light}</legend>
          <div className="flex flex-wrap gap-2">
            {LIGHTS.map((l) => (
              <button key={l.id} type="button" aria-pressed={light === l.id} onClick={() => setLight(l.id)} className={`${button} ${picked(light === l.id)}`}>
                {l.name[lang]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* จอแคบ: คำอธิบายของตัวเลือกที่เลือกอยู่ในหมวดนี้ (จอกว้างอยู่ในการ์ดบนฉาก) */}
        {isPart(tab) && (
          <p aria-live="polite" className="-mt-3 text-xs font-normal leading-relaxed text-stone-600 lg:hidden">
            {cardOf(tab).note}
          </p>
        )}

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
        <p className="text-sm font-light leading-relaxed text-stone-600 lg:hidden">{t.room.help}</p>
        <p className="text-xs font-normal leading-relaxed text-warm-500">{t.room.note}</p>
      </div>
    </section>
  );
}
