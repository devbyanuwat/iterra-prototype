'use client';

// ── SPIKE (ของทดลอง ยังไม่ใช่ของจริง) ──
// หน้าจำลองห้องครัว: ฉาก 3D + แผงเลือกหน้าบานและโทนแสง
// three.js โหลดเฉพาะหน้านี้ (dynamic import) หน้าอื่นไม่หนักขึ้น
// ข้อความไทยอย่างเดียว ยังไม่ผูกกับ lib/i18n.ts

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { DoorId, LightId, RoomHandle } from './RoomScene';

const Skeleton = () => <div className="absolute inset-0 animate-pulse bg-warm-200 motion-reduce:animate-none" aria-hidden />;
const RoomScene = dynamic(() => import('./RoomScene'), { ssr: false, loading: Skeleton });

const DOORS: { id: DoorId; name: string; swatch: string }[] = [
  { id: 'white', name: 'ขาวด้าน', swatch: '#eeece8' },
  { id: 'oak', name: 'ลายไม้โอ๊ค', swatch: 'linear-gradient(90deg, #b89468, #a47f52 40%, #c2a078 70%, #b08a5e)' },
];
const LIGHTS: { id: LightId; name: string }[] = [
  { id: 'day', name: 'กลางวัน' },
  { id: 'warm', name: 'วอร์มไวท์' },
];

const label = 'mb-3 text-xs font-normal text-warm-500';
const button =
  'border px-4 py-2.5 text-sm transition-[color,background-color,transform] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] motion-reduce:transition-none';
const picked = (on: boolean) => (on ? 'border-ink bg-ink text-paper' : 'border-warm-300 text-ink hover:border-ink');

export default function RoomContent() {
  const [door, setDoor] = useState<DoorId>('white');
  const [light, setLight] = useState<LightId>('day');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const scene = useRef<RoomHandle>(null);

  return (
    <section className="grid min-h-[100dvh] gap-8 px-6 pb-16 pt-28 md:px-[4vw] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:pb-10">
      <div className="relative h-[58dvh] min-h-[320px] overflow-hidden bg-warm-200 lg:h-auto">
        {state === 'error' ? (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-stone-600">
            อุปกรณ์นี้แสดงภาพ 3 มิติไม่ได้ ลองเปิดด้วยเบราว์เซอร์รุ่นใหม่หรืออุปกรณ์เครื่องอื่น
          </p>
        ) : (
          <>
            <RoomScene ref={scene} door={door} light={light} onReady={() => setState('ready')} onError={() => setState('error')} />
            {state === 'loading' && <Skeleton />}
          </>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:py-2">
        <div>
          <h1 className="text-3xl font-extralight leading-snug tracking-wide md:text-4xl">จำลองห้องครัว</h1>
          <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-stone-600">
            ลองสีหน้าบานและโทนแสงกับครัวผังตรง ลากที่ภาพเพื่อหมุน เลื่อนล้อเมาส์หรือจีบนิ้วเพื่อซูม
          </p>
        </div>

        <fieldset>
          <legend className={label}>หน้าบานตู้</legend>
          <div className="flex gap-3">
            {DOORS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={door === d.id}
                onClick={() => setDoor(d.id)}
                className={`${button} flex items-center gap-3 ${picked(door === d.id)}`}
              >
                <span aria-hidden className="block h-5 w-5 rounded-full border border-warm-300" style={{ background: d.swatch }} />
                {d.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>โทนแสง</legend>
          <div className="flex gap-3">
            {LIGHTS.map((l) => (
              <button key={l.id} type="button" aria-pressed={light === l.id} onClick={() => setLight(l.id)} className={`${button} ${picked(light === l.id)}`}>
                {l.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>มุมมอง</legend>
          <div className="flex gap-3">
            <button type="button" aria-label="ซูมออก" onClick={() => scene.current?.zoom(-0.15)} className={`${button} ${picked(false)}`}>
              −
            </button>
            <button type="button" aria-label="ซูมเข้า" onClick={() => scene.current?.zoom(0.15)} className={`${button} ${picked(false)}`}>
              +
            </button>
            <button type="button" onClick={() => scene.current?.reset()} className={`${button} ${picked(false)}`}>
              มุมเริ่มต้น
            </button>
          </div>
        </fieldset>

        <p className="mt-auto text-xs font-normal leading-relaxed text-warm-500">
          ภาพจำลองเพื่อประกอบการตัดสินใจ สีและผิววัสดุจริงอาจต่างจากที่เห็นบนจอ
        </p>
      </div>
    </section>
  );
}
