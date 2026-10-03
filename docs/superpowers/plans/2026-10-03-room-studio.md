# Kitchen Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/room/` page with one 3D hall that holds an I-shaped, an L-shaped and a U-shaped kitchen, where the visitor moves the camera between them and changes door, countertop, backsplash, floor, faucet and light choices.

**Architecture:** `lib/room.ts` is import-free MOCK data (options, light presets, the three layouts as runs of modules, camera limits) checked by a Node script. `components/room/kitchen.ts` turns a layout into three.js meshes with shared materials, `textures.ts` draws patterns on canvas, `RoomScene.tsx` owns the renderer, lights, orbit controls and camera flight and renders on demand, `RoomContent.tsx` is the page panel and loads the scene with a dynamic import so three.js stays out of every other page.

**Tech Stack:** Next.js 16.3 static export, React 19, Tailwind 3.4, three 0.170 (new dependency, with `@types/three`), Node 22 type stripping for the data check.

**Spec:** `docs/superpowers/specs/2026-10-03-room-studio-design.md`

## Global Constraints

- Branch `room-studio`. Never push to `main`, never open a PR, never use force flags. The controller pushes.
- New dependencies: `three@^0.170.0` and `@types/three@^0.170.0` (dev) only.
- `lib/room.ts` has no imports. `lib/finishes.ts` keeps only its `import type`.
- three.js is imported only inside `components/room/`. No GSAP in those files.
- Thai strings are copied byte for byte. After editing run the U+0E4E scan and expect no output:
  `perl -CSD -ne 'print "$ARGV:$.\n" if /\x{0E4E}/; close ARGV if eof' lib/room.ts lib/i18n.ts components/room/*.ts components/room/*.tsx app/room/page.tsx scripts/check-room.mjs`
- No em-dash or en-dash in any rendered string. At most one middle dot per rendered line. No numbered labels. No eyebrow above the heading.
- Shape lock: everything sharp-cornered; only colour dots are circles.
- Every button has a visible focus state and a pressed state (`active:scale-[0.98]`; colour dots use `active:scale-[0.92]`).
- Reduced motion: the camera jumps, light changes are instant, no damping.
- `/room/` is `noindex` and is not linked from the nav, the footer or the sitemap.
- The scene renders only when something changed. No more than 6 lights are on at any time.
- This Next.js differs from older versions (see `AGENTS.md`); read `node_modules/next/dist/docs/` before using a Next API that is not in this plan.
- Gates before every commit: `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` (empty), `npm run check:room`, `npm run check:filter`, `npm run build`, `npm run check:overflow` (dev server on port 4100 must already be running; do not start or stop one).
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

All code below was type-checked in a scratch copy against the installed `three@0.170.0`, and `check-room.mjs` was run green and red (a 0.4 m drawer unit changed to 0.6 m fails with "ความยาว run ไม่ตรง spec"). It has not been seen in a browser; the controller does that after Task 2.

The texture cache in `textures.ts` is keyed by pattern, colour and size, so it holds at most one entry per patterned option in `lib/room.ts` (11 today) and is emptied when the page unmounts.

---

### Task 1: Room data and its check

**Files:**
- Create: `lib/room.ts`, `scripts/check-room.mjs`
- Modify: `lib/finishes.ts` (export `FAUCET`), `package.json` (script), `README.md`

**Interfaces:**
- Consumes: `FAUCET` in `lib/finishes.ts` (currently a non-exported `const FAUCET: Finish[]`).
- Produces (from `lib/room.ts`): types `Name`, `Pattern`, `Look`, `Option`, `PartId`, `Picks`, `LightId`, `LightPreset`, `Module`, `Run`, `LayoutId`, `Layout`; values `PARTS`, `FAUCET_LOOKS`, `DEFAULT_PICKS`, `LIGHTS`, `LAYOUTS`, `BAY_PITCH`, `HALL`, `ORBIT`, `runLength(run)`. From `lib/finishes.ts`: `export const FAUCET`.

- [ ] **Step 1: Add the script entry**

In `package.json`, replace

```json
    "check:artwork": "node scripts/check-artwork.mjs"
```

with

```json
    "check:artwork": "node scripts/check-artwork.mjs",
    "check:room": "node --no-warnings --experimental-strip-types scripts/check-room.mjs"
```

- [ ] **Step 2: Write the check** — create `scripts/check-room.mjs`:

```js
// เช็กข้อมูลห้องจำลอง (lib/room.ts): npm run check:room
// ผังครัววาดจากตัวเลขล้วน ๆ ตัวเลขผิดนิดเดียวตู้จะซ้อนกันหรือลอยจากผนัง ด่านนี้จับก่อนเปิดเบราว์เซอร์
import assert from 'node:assert/strict';
import { PARTS, FAUCET_LOOKS, DEFAULT_PICKS, LIGHTS, LAYOUTS, BAY_PITCH, HALL, ORBIT, runLength } from '../lib/room.ts';
import { FAUCET } from '../lib/finishes.ts';

const named = (what, name) => assert.ok(name?.th?.trim() && name?.en?.trim(), `${what}: ต้องมีชื่อ th และ en`);
const unique = (what, ids) => assert.equal(new Set(ids).size, ids.length, `${what}: id ซ้ำ`);
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ── ตัวเลือกวัสดุ ──
for (const [part, options] of Object.entries(PARTS)) {
  unique(part, options.map((o) => o.id));
  for (const o of options) {
    named(`${part}.${o.id}`, o.name);
    assert.ok(o.swatch, `${part}.${o.id}: ไม่มี swatch`);
    if (o.look === 'top') assert.equal(part, 'splash', `${part}.${o.id}: look 'top' ใช้ได้เฉพาะผนังกันเปื้อน`);
  }
  assert.ok(options.some((o) => o.id === DEFAULT_PICKS[part]), `${part}: ค่าเริ่มต้น ${DEFAULT_PICKS[part]} ไม่อยู่ในตัวเลือก`);
}
// สีก๊อกต้องตรงกับ lib/finishes.ts ทุกตัว ไม่ขาดไม่เกิน
assert.deepEqual(Object.keys(FAUCET_LOOKS).sort(), FAUCET.map((f) => f.id).sort(), 'FAUCET_LOOKS ไม่ตรงกับ FAUCET ใน lib/finishes.ts');
assert.ok(FAUCET_LOOKS[DEFAULT_PICKS.faucet], 'ค่าเริ่มต้นของก๊อกไม่อยู่ใน FAUCET_LOOKS');

// ── แสง ──
unique('LIGHTS', LIGHTS.map((l) => l.id));
assert.deepEqual(LIGHTS.map((l) => l.id), ['day', 'warm', 'cool', 'night']);
LIGHTS.forEach((l) => named(`light.${l.id}`, l.name));

// ── ผังครัว ──
const EXPECTED = { i: [3.6], l: [3.0, 2.4], u: [3.2, 2.2, 2.2] }; // ความยาว run ตาม spec
assert.deepEqual(LAYOUTS.map((l) => l.id), ['i', 'l', 'u']);
let halfWidth = 0;
LAYOUTS.forEach((layout, index) => {
  const at = `layout ${layout.id}`;
  named(at, layout.name);
  assert.ok(near(layout.x, (index - 1) * BAY_PITCH), `${at}: x ต้องเป็น ${(index - 1) * BAY_PITCH}`);
  assert.deepEqual(layout.runs.map(runLength), EXPECTED[layout.id], `${at}: ความยาว run ไม่ตรง spec`);

  const [back, ...legs] = layout.runs;
  assert.ok(back.turn === 0 && back.back && near(back.z, 0), `${at}: run แรกต้องเป็น run หลัง ชิดผนัง`);
  const backEnd = back.x + runLength(back);
  halfWidth = Math.max(halfWidth, Math.abs(back.x), Math.abs(backEnd));

  for (const leg of legs) {
    assert.ok(leg.turn !== 0 && !leg.back, `${at}: ขาต้องมี turn 1 หรือ -1 และ back: false`);
    const corner = leg.turn === 1 ? back.modules[0] : back.modules.at(-1);
    assert.equal(corner.kind, 'corner', `${at}: ปลาย run หลังฝั่งที่ขามาชนต้องเป็น corner`);
    assert.ok(near(corner.w, 0.6), `${at}: corner ต้องกว้าง 0.6`);
    if (leg.turn === 1) assert.ok(near(leg.x, back.x) && near(leg.z, 0.6 + runLength(leg)), `${at}: ขาซ้ายไม่ต่อกับมุม`);
    else assert.ok(near(leg.x, backEnd) && near(leg.z, 0.6), `${at}: ขาขวาไม่ต่อกับมุม`);
    assert.ok(leg.z <= HALL.depth && leg.z + (leg.turn === -1 ? runLength(leg) : 0) <= HALL.depth, `${at}: ขายื่นเกินพื้นห้อง`);
  }
  assert.equal(back.modules.filter((m) => m.kind === 'corner').length, legs.length, `${at}: จำนวน corner ต้องเท่าจำนวนขา`);

  const all = layout.runs.flatMap((r) => r.modules);
  const count = (...kinds) => all.filter((m) => kinds.includes(m.kind)).length;
  assert.equal(count('sink'), 1, `${at}: ต้องมีซิงก์ 1 จุด`);
  assert.equal(count('hob'), 1, `${at}: ต้องมีเตา 1 จุด`);
  assert.equal(count('oven', 'tall'), 1, `${at}: ต้องมีเตาอบ 1 จุด (oven หรือ tall)`);
  assert.equal(back.modules.filter((m) => m.kind === 'hob').length, 1, `${at}: เตาต้องอยู่ run หลัง (ใต้ฮูด)`);
  legs.forEach((leg) => assert.ok(leg.modules.every((m) => !['tall', 'corner', 'hob'].includes(m.kind)), `${at}: ขาห้ามมี tall, corner, hob`));
  back.modules.forEach((m, i) => m.kind === 'tall' && assert.ok(i === 0 || i === back.modules.length - 1, `${at}: tall ต้องอยู่ปลาย run`));
  for (const m of all) {
    assert.ok(m.w >= 0.4 && m.w <= 0.8, `${at}: ${m.kind} กว้าง ${m.w} อยู่นอกช่วง 0.4-0.8`);
    if (m.kind === 'sink') assert.ok(m.w >= 0.8, `${at}: ตู้ซิงก์ต้องกว้างอย่างน้อย 0.8`);
    if (m.kind === 'hob') assert.ok(m.w >= 0.6, `${at}: ตู้เตาต้องกว้างอย่างน้อย 0.6`);
    if (m.kind === 'drawers') assert.ok(near(m.rows.reduce((s, h) => s + h, 0), 0.76), `${at}: ความสูงลิ้นชักรวมต้องได้ 0.76`);
  }

  const h = layout.home;
  assert.ok(Math.abs(h.azimuth) <= ORBIT.azimuth, `${at}: home.azimuth เกินขอบเขต`);
  assert.ok(h.polar >= ORBIT.polarMin && h.polar <= ORBIT.polarMax, `${at}: home.polar เกินขอบเขต`);
  assert.ok(h.distance >= ORBIT.zoomMin && h.distance <= ORBIT.zoomMax, `${at}: home.distance เกินขอบเขต`);
});

// กล้องซูมออกสุดแล้วหมุนไปด้านข้าง ต้องไม่เข้าไปอยู่ในตู้ของครัวข้าง ๆ
assert.ok(BAY_PITCH - ORBIT.zoomMax >= halfWidth, `bay ชิดกันเกินไป: ${BAY_PITCH} - ${ORBIT.zoomMax} < ${halfWidth}`);
assert.ok(HALL.width >= 2 * (BAY_PITCH + halfWidth), 'ห้องสั้นกว่าครัว 3 ชุด');

console.log('ผ่าน: ข้อมูลห้องจำลอง');
```

- [ ] **Step 3: Run it and see it fail**

Run: `npm run check:room`
Expected: fails with `ERR_MODULE_NOT_FOUND` naming `lib/room.ts`.

- [ ] **Step 4: Export the faucet list**

In `lib/finishes.ts`, replace `const FAUCET: Finish[] = [` with `export const FAUCET: Finish[] = [`.

- [ ] **Step 5: Write the data** — create `lib/room.ts`:

```ts
// ── MOCK เพื่อเดโม ──
// ข้อมูลของหน้าจำลองห้องครัว (/room/): ตัวเลือกวัสดุ โทนแสง ผังครัว 3 แบบ และมุมกล้อง
// ไฟล์นี้ห้าม import อะไร (scripts/check-room.mjs โหลดตรงด้วย Node)
// หน่วยเป็นเมตร · x = ตามผนังหลัง, y = สูง, z = ออกจากผนังเข้าหากล้อง · ผนังหลังอยู่ที่ z = 0

export type Name = { th: string; en: string };

// ── วัสดุ ──
// pattern = ลายที่วาดด้วยโค้ด (components/room/textures.ts) โดยใช้ color เป็นสีพื้น
// size = ลาย 1 ชุดกินกี่เมตร (ไม่ใส่ = 1) · ของจริงควรเปลี่ยนเป็นไฟล์ลายจากผู้ผลิต
export type Pattern = 'wood' | 'planks' | 'tile' | 'speckle';
export type Look = { color: string; roughness: number; metalness?: number; pattern?: Pattern; size?: number };
// look: 'top' = ใช้วัสดุเดียวกับท็อป (มีเฉพาะผนังกันเปื้อน)
export type Option = { id: string; name: Name; swatch: string; look: Look | 'top' };
export type PartId = 'doors' | 'top' | 'splash' | 'floor';

export const PARTS: Record<PartId, Option[]> = {
  doors: [
    { id: 'white', name: { th: 'ขาวด้าน', en: 'Matte White' }, swatch: '#eeece8', look: { color: '#eeece8', roughness: 0.62 } },
    { id: 'graphite', name: { th: 'เทาเข้ม', en: 'Graphite' }, swatch: '#45464a', look: { color: '#45464a', roughness: 0.58 } },
    {
      id: 'oak',
      name: { th: 'ลายไม้โอ๊ค', en: 'Oak' },
      swatch: 'linear-gradient(90deg, #b89468, #a47f52 40%, #c2a078 70%, #b08a5e)',
      look: { color: '#b89468', roughness: 0.55, pattern: 'wood' },
    },
    { id: 'sage', name: { th: 'เขียวหม่น', en: 'Sage' }, swatch: '#8f9c88', look: { color: '#8f9c88', roughness: 0.6 } },
  ],
  top: [
    { id: 'quartz-white', name: { th: 'ควอตซ์ขาว', en: 'White Quartz' }, swatch: '#e6e3dd', look: { color: '#e6e3dd', roughness: 0.3, pattern: 'speckle' } },
    { id: 'quartz-grey', name: { th: 'ควอตซ์เทา', en: 'Grey Quartz' }, swatch: '#8d8983', look: { color: '#8d8983', roughness: 0.3, pattern: 'speckle' } },
    { id: 'stone-black', name: { th: 'หินดำ', en: 'Black Stone' }, swatch: '#26262a', look: { color: '#26262a', roughness: 0.22, pattern: 'speckle' } },
    {
      id: 'wood',
      name: { th: 'ไม้จริง', en: 'Solid Wood' },
      swatch: 'linear-gradient(90deg, #a97c50, #8f6740 45%, #b58a5c)',
      look: { color: '#a97c50', roughness: 0.5, pattern: 'wood' },
    },
  ],
  splash: [
    { id: 'tile-white', name: { th: 'กระเบื้องขาวเงา', en: 'Gloss White Tile' }, swatch: '#efede8', look: { color: '#efede8', roughness: 0.18, pattern: 'tile', size: 0.5 } },
    { id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' }, swatch: '#a7a6a2', look: { color: '#a7a6a2', roughness: 0.3, pattern: 'tile', size: 0.5 } },
    { id: 'match', name: { th: 'วัสดุเดียวกับท็อป', en: 'Same as Countertop' }, swatch: 'linear-gradient(135deg, #e6e3dd 50%, #8d8983 50%)', look: 'top' },
  ],
  floor: [
    { id: 'oak-light', name: { th: 'ไม้โอ๊คอ่อน', en: 'Light Oak' }, swatch: '#b7a085', look: { color: '#b7a085', roughness: 0.62, pattern: 'planks' } },
    { id: 'walnut', name: { th: 'ไม้วอลนัต', en: 'Walnut' }, swatch: '#6f5340', look: { color: '#6f5340', roughness: 0.58, pattern: 'planks' } },
    { id: 'concrete', name: { th: 'ปูนขัดมัน', en: 'Polished Concrete' }, swatch: '#a3a09b', look: { color: '#a3a09b', roughness: 0.45, pattern: 'speckle', size: 2 } },
    { id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' }, swatch: '#b4b2ad', look: { color: '#b4b2ad', roughness: 0.4, pattern: 'tile', size: 3 } },
  ],
};

// สีก๊อก: ชื่อและจุดสีมาจาก lib/finishes.ts (FAUCET) · ที่นี่เก็บแค่ค่าวัสดุ 3D ต่อ id
export const FAUCET_LOOKS: Record<string, Look> = {
  chrome: { color: '#f1f2f3', roughness: 0.08, metalness: 1 },
  black: { color: '#1f1e1d', roughness: 0.55, metalness: 0.6 },
  brass: { color: '#c9a45c', roughness: 0.3, metalness: 1 },
  steel: { color: '#b9bbbd', roughness: 0.38, metalness: 1 },
};

export type Picks = Record<PartId, string> & { faucet: string };
export const DEFAULT_PICKS: Picks = { doors: 'white', top: 'quartz-grey', splash: 'tile-white', floor: 'oak-light', faucet: 'chrome' };

// ── แสง ──
// sun = แสงจากหน้าต่าง, hemi = แสงฟ้า, env = แรงของเงาสะท้อน, led = ไฟใต้ตู้แขวน, ceil = ไฟเพดาน
export type LightId = 'day' | 'warm' | 'cool' | 'night';
export type LightPreset = {
  id: LightId;
  name: Name;
  sun: number;
  sunColor: string;
  hemi: number;
  env: number;
  led: number;
  ledColor: string;
  ceil: number;
  ceilColor: string;
  bg: string;
  exposure: number;
};
export const LIGHTS: LightPreset[] = [
  { id: 'day', name: { th: 'กลางวัน', en: 'Daylight' }, sun: 3.1, sunColor: '#fff1dc', hemi: 0.38, env: 0.5, led: 0, ledColor: '#ffc98f', ceil: 0, ceilColor: '#ffbf80', bg: '#e9e6e1', exposure: 0.82 },
  { id: 'warm', name: { th: 'วอร์มไวท์ 3000K', en: 'Warm White 3000K' }, sun: 0.1, sunColor: '#ffd9a8', hemi: 0.1, env: 0.16, led: 6, ledColor: '#ffc98f', ceil: 7.5, ceilColor: '#ffbf80', bg: '#2a2420', exposure: 1 },
  { id: 'cool', name: { th: 'คูลไวท์ 6000K', en: 'Cool White 6000K' }, sun: 0.1, sunColor: '#dfe9ff', hemi: 0.12, env: 0.2, led: 6, ledColor: '#e4eeff', ceil: 8, ceilColor: '#dfe9ff', bg: '#22262b', exposure: 1 },
  { id: 'night', name: { th: 'กลางคืน', en: 'Night' }, sun: 0, sunColor: '#ffd9a8', hemi: 0.04, env: 0.06, led: 7, ledColor: '#ffc98f', ceil: 0, ceilColor: '#ffbf80', bg: '#141210', exposure: 1.05 },
];

// ── ผังครัว ──
// ครัว 1 ชุด = หลาย run · run = ตู้เรียงต่อกันเป็นเส้นตรง กว้างรวม = ผลรวม w ของ modules
// ทุก run ลึก 0.6 ม. · x, z = จุดเริ่มของ run นับจากกลาง bay
// turn 0  = run หลัง ชิดผนัง หน้าบานหันออก (+z) · modules เรียงจากซ้ายไปขวา
// turn 1  = ขาซ้าย หน้าบานหันขวา (+x) · modules เรียงจากปลายฝั่งกล้อง เข้าหาผนัง
// turn -1 = ขาขวา หน้าบานหันซ้าย (-x) · modules เรียงจากผนัง ออกมาฝั่งกล้อง
// back: true = มีตู้แขวน ผนังกันเปื้อน ฮูด (เฉพาะ run หลัง) · ขามีแค่ตู้ล่างกับท็อป
export type Module =
  | { kind: 'door'; w: number; doors: 1 | 2 }
  | { kind: 'drawers'; w: number; rows: number[] } // ความสูงหน้าลิ้นชักจากบนลงล่าง รวมต้องได้ 0.76
  | { kind: 'sink'; w: number }
  | { kind: 'hob'; w: number }
  | { kind: 'oven'; w: number } // เตาอบใต้เคาน์เตอร์
  | { kind: 'corner'; w: number } // มุมที่ขามาชน ไม่มีหน้าบาน
  | { kind: 'tall'; w: number }; // ตู้สูงพร้อมเตาอบฝัง
export type Run = { x: number; z: number; turn: -1 | 0 | 1; back: boolean; modules: Module[] };

export type LayoutId = 'i' | 'l' | 'u';
// home = มุมกล้องเริ่มต้นของ bay · target = [y, z] ของจุดที่กล้องมอง (x = กลาง bay)
export type Layout = {
  id: LayoutId;
  name: Name;
  x: number; // กลาง bay บนแกน x ของห้อง
  runs: Run[];
  home: { azimuth: number; polar: number; distance: number; target: [number, number] };
};

export const BAY_PITCH = 9; // ระยะห่างกลาง bay ถึงกลาง bay
export const HALL = { width: 27, depth: 5, height: 3.6 };
// ขอบเขตกล้อง: หมุนซ้ายขวาข้างละ azimuth (รวม 180 องศา) · polar วัดจากแนวดิ่ง · zoom เป็นเมตร
export const ORBIT = { azimuth: Math.PI / 2, polarMin: 0.95, polarMax: 1.52, zoomMin: 2.8, zoomMax: 7 };

const door = (w: number, doors: 1 | 2 = 1): Module => ({ kind: 'door', w, doors });

export const LAYOUTS: Layout[] = [
  {
    id: 'i',
    name: { th: 'ครัวตัว I', en: 'I-shaped' },
    x: -BAY_PITCH,
    runs: [
      {
        x: -1.8, z: 0, turn: 0, back: true,
        modules: [{ kind: 'tall', w: 0.6 }, door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, { kind: 'hob', w: 0.6 }, door(0.6)],
      },
    ],
    home: { azimuth: 0.42, polar: 1.36, distance: 5.2, target: [1.08, 0.3] },
  },
  {
    id: 'l',
    name: { th: 'ครัวตัว L', en: 'L-shaped' },
    x: 0,
    runs: [
      {
        x: -1.5, z: 0, turn: 0, back: true,
        modules: [{ kind: 'corner', w: 0.6 }, { kind: 'drawers', w: 0.6, rows: [0.2, 0.28, 0.28] }, { kind: 'hob', w: 0.6 }, door(0.6), { kind: 'tall', w: 0.6 }],
      },
      {
        x: -1.5, z: 3, turn: 1, back: false,
        modules: [door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, door(0.6)],
      },
    ],
    home: { azimuth: 0.55, polar: 1.25, distance: 6.2, target: [1, 1.1] },
  },
  {
    id: 'u',
    name: { th: 'ครัวตัว U', en: 'U-shaped' },
    x: BAY_PITCH,
    runs: [
      {
        x: -1.6, z: 0, turn: 0, back: true,
        modules: [{ kind: 'corner', w: 0.6 }, door(0.6), { kind: 'hob', w: 0.8 }, door(0.6), { kind: 'corner', w: 0.6 }],
      },
      {
        x: -1.6, z: 2.8, turn: 1, back: false,
        modules: [door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, door(0.4)],
      },
      {
        x: 1.6, z: 0.6, turn: -1, back: false,
        modules: [{ kind: 'drawers', w: 0.6, rows: [0.2, 0.28, 0.28] }, { kind: 'oven', w: 0.6 }, door(0.6), door(0.4)],
      },
    ],
    home: { azimuth: 0, polar: 1.18, distance: 6.6, target: [1, 1.2] },
  },
];

export const runLength = (run: Run) => Math.round(run.modules.reduce((sum, m) => sum + m.w, 0) * 1000) / 1000;
```

- [ ] **Step 6: Run the check and see it pass**

Run: `npm run check:room`
Expected: `ผ่าน: ข้อมูลห้องจำลอง`

- [ ] **Step 7: README**

After the line that starts with `npm run check:filter` add:

```
npm run check:room       # ตัวเลขผังครัวและตัวเลือกของหน้า /room/ (ไม่ต้องเปิด server · Node 22.6+)
```

After the table row that starts with `| \`lib/finishes.ts\`` add:

```
| `lib/room.ts` | ตัวเลือกวัสดุ โทนแสง และผังครัวของห้องจำลอง `/room/` (MOCK) → เปลี่ยนเป็นวัสดุที่ร้านมีจริง และลายจากผู้ผลิต |
```

- [ ] **Step 8: Gates and commit**

Run the gates from Global Constraints (all must pass; `check:overflow` is unchanged by this task but still runs), the U+0E4E scan, then:

```bash
git add lib/room.ts lib/finishes.ts scripts/check-room.mjs package.json README.md
git commit -m "feat: describe the kitchen studio layouts and material options as checked data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The 3D studio page

**Files:**
- Create: `components/room/textures.ts`, `components/room/kitchen.ts`, `components/room/RoomScene.tsx`, `components/room/RoomContent.tsx`, `app/room/page.tsx`
- Modify: `package.json` + `package-lock.json` (dependencies), `lib/i18n.ts` (`room` block, both languages), `scripts/check-overflow.mjs` (page list), `README.md`

**Interfaces:**
- Consumes: everything Task 1 produces; `useLang()` from `components/LangProvider.tsx` (returns `{ lang, t }`); `FinishDots` (`finishes`, `value`, `onChange`); `t.nav.showroom` and `t.products.finishDemo` (both exist).
- Produces: route `/room/`; `RoomScene` default export with props `{ layout, picks, light, label, onReady, onError }` and ref handle `RoomHandle = { zoom(step), rotate(step), reset() }`; `t.room.*`; debug numbers at `window.__room` (`stats.renderMs`, `stats.frames`, `info.render.calls`, `info.render.triangles`).

- [ ] **Step 1: Install three**

```bash
npm install three@^0.170.0
npm install -D @types/three@^0.170.0
```

Expected: `package.json` gains `"three"` under dependencies and `"@types/three"` under devDependencies; nothing else changes there.

- [ ] **Step 2: Patterns** — create `components/room/textures.ts`:

```ts
// ลายวัสดุวาดด้วยโค้ดลง canvas (ไม้ พื้นไม้ กระเบื้อง หินเม็ด) · ไม่มีไฟล์ภาพ
// ลาย 1 ชุด = 1 ตารางเมตร × look.size · กล่องและพื้นใช้ UV หน่วยเมตร ลายจึงไม่ยืดตามขนาดชิ้น
// ขีดจำกัด: ดูดีระยะโชว์รูม ซูมใกล้จะรู้ว่าไม่ใช่ลายจริง → ของจริงเปลี่ยนเป็นไฟล์ลายจากผู้ผลิต

import * as THREE from 'three';
import type { Look, Pattern } from '@/lib/room';

const PX = 512;
const cache = new Map<string, THREE.CanvasTexture>();

// สุ่มแบบกำหนด seed ให้ลายออกมาเหมือนเดิมทุกครั้ง
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function grain(g: CanvasRenderingContext2D, rnd: () => number, lines: number) {
  for (let i = 0; i < lines; i++) {
    const x = rnd() * PX;
    g.strokeStyle = rnd() > 0.5 ? `rgba(40,25,10,${0.04 + rnd() * 0.14})` : `rgba(255,240,215,${0.04 + rnd() * 0.12})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + (rnd() - 0.5) * 14, PX / 3, x + (rnd() - 0.5) * 14, (PX * 2) / 3, x, PX); // จบที่ x เดิม ลายต่อกันได้ตอนปูซ้ำ
    g.stroke();
  }
}

const DRAW: Record<Pattern, (g: CanvasRenderingContext2D, rnd: () => number) => void> = {
  wood: (g, rnd) => grain(g, rnd, 260),
  planks: (g, rnd) => {
    grain(g, rnd, 220);
    const n = 6; // 6 แผ่นต่อเมตร
    g.fillStyle = 'rgba(30,20,10,.4)';
    for (let i = 0; i < n; i++) {
      const x = (i * PX) / n;
      g.fillRect(x, 0, 1.5, PX);
      g.fillRect(x, (i * 197) % PX, PX / n, 1.5); // รอยต่อหัวแผ่น สลับตำแหน่งกัน
    }
  },
  tile: (g, rnd) => {
    const n = 5; // 5 x 5 แผ่นต่อชุด
    for (let i = 0; i < n * n; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.05})`;
      g.fillRect(((i % n) * PX) / n, (Math.floor(i / n) * PX) / n, PX / n, PX / n);
    }
    g.fillStyle = 'rgba(0,0,0,.2)'; // ร่องยาแนว
    for (let i = 0; i < n; i++) {
      g.fillRect((i * PX) / n, 0, 2, PX);
      g.fillRect(0, (i * PX) / n, PX, 2);
    }
  },
  speckle: (g, rnd) => {
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.09})`;
      g.fillRect(rnd() * PX, rnd() * PX, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
  },
};

function textureFor(look: Look) {
  if (!look.pattern) return null;
  const size = look.size ?? 1;
  const key = `${look.pattern}|${look.color}|${size}`;
  let texture = cache.get(key);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PX;
    const g = canvas.getContext('2d')!;
    g.fillStyle = look.color;
    g.fillRect(0, 0, PX, PX);
    DRAW[look.pattern](g, seeded(7));
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.setScalar(1 / size);
    texture.anisotropy = 8;
    cache.set(key, texture);
  }
  return texture;
}

// ใส่วัสดุตาม look · มีลาย = สีอยู่ในลายแล้ว ตัววัสดุเป็นขาว
export function applyLook(material: THREE.MeshStandardMaterial, look: Look) {
  const map = textureFor(look);
  material.map = map;
  material.color.set(map ? '#ffffff' : look.color);
  material.roughness = look.roughness;
  material.metalness = look.metalness ?? 0;
  material.needsUpdate = true;
}

export function disposeTextures() {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
```

- [ ] **Step 3: Kitchen builder** — create `components/room/kitchen.ts`:

```ts
// ปั้นครัว 1 ชุดจากผังใน lib/room.ts · รูปทรงสร้างในโค้ดทั้งหมด ไม่มีไฟล์โมเดล
// แต่ละ run ปั้นในพิกัดของตัวเอง: x = ตามแนว run (0 ถึงความยาว), z = 0 คือหลังตู้ 0.6 คือขอบท็อปด้านหน้า
// แล้วค่อยวางและหมุนทั้ง run ตาม run.x, run.z, run.turn
// ก๊อกเป็นทรงคอสูงทั่วไป ไม่ใช่รุ่นจริงของ KOHLER

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Layout, Module, Run } from '@/lib/room';

export type Mats = ReturnType<typeof makeMaterials>;

// วัสดุชุดเดียวใช้ร่วมกันทั้ง 3 ครัว · door, top, splash, floor, faucet เปลี่ยนตามที่ผู้ใช้เลือก (applyLook)
export function makeMaterials() {
  const standard = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    door: standard('#eeece8', 0.62),
    top: standard('#8d8983', 0.3),
    splash: standard('#efede8', 0.18),
    floor: standard('#b7a085', 0.62),
    faucet: standard('#f1f2f3', 0.08, 1),
    wall: standard('#dcd7cf', 0.95),
    kick: standard('#2a2725', 0.8), // ขาตู้ และพื้นมืดหลังร่องหน้าบาน
    steel: standard('#c8cacc', 0.32, 1), // ซิงก์ มือจับ ฮูด
    glass: standard('#0d0d0e', 0.06, 0.4), // เตา หน้าเตาอบ
    ring: new THREE.MeshBasicMaterial({ color: '#5a5a5c' }), // วงหัวเตา
    led: new THREE.MeshBasicMaterial({ color: '#000000' }), // เส้นไฟใต้ตู้แขวน (สีเปลี่ยนตามโทนแสง)
  };
}

// ระดับความสูงและความลึกมาตรฐานของตู้ (เมตร)
const KICK = 0.1; // ขาตู้
const BASE = 0.86; // ขอบบนตู้ล่าง
const TOP = 0.9; // ผิวท็อป
const DEPTH = 0.56; // ลึกตัวตู้ล่าง
const COUNTER = 0.6; // ลึกท็อป
const WALL_Y0 = 1.45;
const WALL_Y1 = 2.15;
const WALL_DEPTH = 0.32;
const GAP = 0.002; // ร่องรอบหน้าบาน

// BoxGeometry ให้ UV 0..1 ต่อหน้า → คูณด้วยขนาดจริงให้เป็นหน่วยเมตร ลายจะไม่ยืด
// ลำดับหน้าของ BoxGeometry: +x, -x, +y, -y, +z, -z (หน้าละ 4 จุด)
function metreUV(geo: THREE.BoxGeometry, w: number, h: number, d: number) {
  const uv = geo.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = faces[Math.floor(i / 4)];
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  }
}

function mesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// กล่องจากขอบเขต · radius > 0 = ขอบมน (UV 0..1 ต่อชิ้น ใช้กับหน้าบาน)
function box(group: THREE.Group, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius = 0) {
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
  let geo: THREE.BufferGeometry;
  if (radius) geo = new RoundedBoxGeometry(w, h, d, 3, radius);
  else {
    const plain = new THREE.BoxGeometry(w, h, d);
    metreUV(plain, w, h, d);
    geo = plain;
  }
  return mesh(group, geo, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

const front = (g: THREE.Group, m: Mats, x0: number, x1: number, y0: number, y1: number, z: number) =>
  box(g, m.door, x0 + GAP, x1 - GAP, y0 + GAP, y1 - GAP, z, z + 0.018, 0.004);

function handle(g: THREE.Group, m: Mats, x: number, y: number, z: number, vertical = false) {
  const bar = mesh(g, new RoundedBoxGeometry(0.16, 0.012, 0.012, 2, 0.005), m.steel, x, y, z + 0.034);
  if (vertical) bar.rotation.z = Math.PI / 2;
  for (const o of [-0.06, 0.06]) {
    mesh(g, new THREE.CylinderGeometry(0.004, 0.004, 0.022, 10), m.steel, vertical ? x : x + o, vertical ? y + o : y, z + 0.022).rotation.x = Math.PI / 2;
  }
}

// ตัวตู้ล่าง + ขาตู้ + พื้นมืดหลังร่องหน้าบาน
function carcass(g: THREE.Group, m: Mats, x0: number, x1: number, backing = true) {
  box(g, m.door, x0, x1, KICK, BASE, 0, DEPTH);
  box(g, m.kick, x0, x1, 0, KICK, 0.02, 0.5);
  if (backing) box(g, m.kick, x0 + 0.01, x1 - 0.01, KICK + 0.01, BASE - 0.01, DEPTH, DEPTH + 0.001);
}

const counter = (g: THREE.Group, m: Mats, x0: number, x1: number) => box(g, m.top, x0, x1, BASE, TOP, 0, COUNTER);

function doors(g: THREE.Group, m: Mats, x0: number, x1: number, count: 1 | 2) {
  const mid = (x0 + x1) / 2;
  if (count === 2) {
    front(g, m, x0, mid, KICK, BASE, DEPTH);
    front(g, m, mid, x1, KICK, BASE, DEPTH);
    handle(g, m, mid - 0.11, 0.79, DEPTH);
    handle(g, m, mid + 0.11, 0.79, DEPTH);
  } else {
    front(g, m, x0, x1, KICK, BASE, DEPTH);
    handle(g, m, mid, 0.79, DEPTH);
  }
}

function drawers(g: THREE.Group, m: Mats, x0: number, x1: number, rows: number[]) {
  let y = BASE;
  for (const h of rows) {
    front(g, m, x0, x1, y - h, y, DEPTH);
    handle(g, m, (x0 + x1) / 2, y - 0.07, DEPTH);
    y -= h;
  }
}

// ซิงก์ฝังใต้ท็อป: ท็อป 4 ชิ้นรอบช่อง + อ่างสเตนเลส + ก๊อก
function sink(g: THREE.Group, m: Mats, x0: number, x1: number) {
  const cx = (x0 + x1) / 2;
  const [a, b, z0, z1, floor] = [cx - 0.25, cx + 0.25, 0.12, 0.52, 0.68];
  box(g, m.top, x0, a, BASE, TOP, 0, COUNTER);
  box(g, m.top, b, x1, BASE, TOP, 0, COUNTER);
  box(g, m.top, a, b, BASE, TOP, 0, z0);
  box(g, m.top, a, b, BASE, TOP, z1, COUNTER);
  box(g, m.steel, a, b, floor, floor + 0.01, z0, z1);
  box(g, m.steel, a - 0.01, a, floor, TOP - 0.005, z0, z1);
  box(g, m.steel, b, b + 0.01, floor, TOP - 0.005, z0, z1);
  box(g, m.steel, a, b, floor, TOP - 0.005, z0 - 0.01, z0);
  box(g, m.steel, a, b, floor, TOP - 0.005, z1, z1 + 0.01);
  mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.004, 24), m.kick, cx, floor + 0.012, 0.32, false);

  mesh(g, new THREE.CylinderGeometry(0.024, 0.027, 0.05, 24), m.faucet, cx, TOP + 0.025, 0.07);
  const neck = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx, 0.94, 0.07),
    new THREE.Vector3(cx, 1.2, 0.07),
    new THREE.Vector3(cx, 1.31, 0.12),
    new THREE.Vector3(cx, 1.31, 0.22),
    new THREE.Vector3(cx, 1.22, 0.265),
  ]);
  mesh(g, new THREE.TubeGeometry(neck, 48, 0.013, 16), m.faucet, 0, 0, 0);
  mesh(g, new THREE.CylinderGeometry(0.016, 0.014, 0.05, 20), m.faucet, cx, 1.2, 0.268).rotation.x = -0.35;
  mesh(g, new THREE.CylinderGeometry(0.006, 0.008, 0.11, 12), m.faucet, cx + 0.065, 0.975, 0.07).rotation.z = -1.05;
}

function hob(g: THREE.Group, m: Mats, x0: number, x1: number) {
  const cx = (x0 + x1) / 2;
  box(g, m.glass, cx - 0.28, cx + 0.28, TOP, TOP + 0.006, 0.06, 0.54, 0.002);
  for (const [dx, z, r] of [[-0.13, 0.19, 0.075], [0.14, 0.19, 0.09], [-0.13, 0.42, 0.09], [0.14, 0.42, 0.075]]) {
    mesh(g, new THREE.RingGeometry(r - 0.003, r, 48), m.ring, cx + dx, TOP + 0.0066, z, false).rotation.x = -Math.PI / 2;
  }
}

// หน้าเตาอบ: กระจกดำ + แถบปุ่ม + มือจับยาว (y0..y1 = ขอบกระจก)
function ovenFront(g: THREE.Group, m: Mats, x0: number, x1: number, y0: number, y1: number) {
  box(g, m.glass, x0 + 0.01, x1 - 0.01, y0, y1, DEPTH, DEPTH + 0.015, 0.004);
  box(g, m.steel, x0 + 0.01, x1 - 0.01, y1 - 0.09, y1, DEPTH + 0.015, DEPTH + 0.018);
  mesh(g, new RoundedBoxGeometry(x1 - x0 - 0.14, 0.014, 0.014, 2, 0.006), m.steel, (x0 + x1) / 2, y1 - 0.14, DEPTH + 0.05);
}

// ตู้สูง: บานล่าง เตาอบฝัง บานบน
function tall(g: THREE.Group, m: Mats, x0: number, x1: number, handleX: number) {
  box(g, m.door, x0, x1, KICK, WALL_Y1, 0, DEPTH);
  box(g, m.kick, x0, x1, 0, KICK, 0.02, 0.5);
  box(g, m.kick, x0 + 0.01, x1 - 0.01, KICK + 0.01, WALL_Y1 - 0.01, DEPTH, DEPTH + 0.001);
  front(g, m, x0, x1, KICK, 0.72, DEPTH);
  front(g, m, x0, x1, 1.34, WALL_Y1, DEPTH);
  handle(g, m, handleX, 0.55, DEPTH, true);
  handle(g, m, handleX, 1.52, DEPTH, true);
  ovenFront(g, m, x0, x1, 0.73, 1.33);
}

// ตู้แขวน: หน้าบานยื่นลงใต้ตู้ 2 ซม. ใช้เป็นที่จับ · เหนือเตา = ฮูดฝัง · ที่อื่น = เส้นไฟใต้ตู้
function wallCabinet(g: THREE.Group, m: Mats, x0: number, x1: number, overHob: boolean) {
  box(g, m.door, x0, x1, WALL_Y0, WALL_Y1, 0, WALL_DEPTH);
  box(g, m.kick, x0 + 0.01, x1 - 0.01, WALL_Y0 + 0.01, WALL_Y1 - 0.01, WALL_DEPTH, WALL_DEPTH + 0.001);
  const mid = (x0 + x1) / 2;
  if (x1 - x0 >= 0.8) {
    front(g, m, x0, mid, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
    front(g, m, mid, x1, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
  } else front(g, m, x0, x1, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
  if (overHob) box(g, m.steel, mid - 0.27, mid + 0.27, WALL_Y0 - 0.015, WALL_Y0, 0.03, 0.3);
  else box(g, m.led, x0 + 0.02, x1 - 0.02, WALL_Y0 - 0.006, WALL_Y0, 0.24, 0.26).castShadow = false;
}

function buildModule(g: THREE.Group, m: Mats, mod: Module, x0: number, run: Run, last: boolean) {
  const x1 = x0 + mod.w;
  if (mod.kind === 'tall') {
    // มือจับอยู่ฝั่งที่ติดกับตู้อื่น (ตู้สูงอยู่ปลาย run เสมอ)
    tall(g, m, x0, x1, last ? x0 + 0.07 : x1 - 0.07);
    return;
  }
  carcass(g, m, x0, x1, mod.kind !== 'corner');
  if (mod.kind === 'sink') sink(g, m, x0, x1);
  else counter(g, m, x0, x1);

  if (mod.kind === 'door') doors(g, m, x0, x1, mod.doors);
  if (mod.kind === 'sink') doors(g, m, x0, x1, 2);
  if (mod.kind === 'drawers') drawers(g, m, x0, x1, mod.rows);
  if (mod.kind === 'hob') {
    drawers(g, m, x0, x1, [0.28, 0.48]);
    hob(g, m, x0, x1);
  }
  if (mod.kind === 'oven') {
    front(g, m, x0, x1, KICK, 0.24, DEPTH);
    ovenFront(g, m, x0, x1, 0.25, 0.85);
  }
  if (run.back) {
    box(g, m.splash, x0, x1, TOP, WALL_Y0, 0, 0.008);
    wallCabinet(g, m, x0, x1, mod.kind === 'hob');
  }
}

function buildRun(run: Run, m: Mats) {
  const g = new THREE.Group();
  let x = 0;
  run.modules.forEach((mod, i) => {
    buildModule(g, m, mod, x, run, i === run.modules.length - 1);
    x += mod.w;
  });
  g.position.set(run.x, 0, run.z);
  g.rotation.y = (run.turn * Math.PI) / 2;
  return g;
}

export function buildKitchen(layout: Layout, m: Mats) {
  const kitchen = new THREE.Group();
  layout.runs.forEach((run) => kitchen.add(buildRun(run, m)));
  kitchen.position.x = layout.x;
  return kitchen;
}

// ตำแหน่งไฟส่องใต้ตู้แขวนของครัวนี้ (x ในพิกัดห้อง) ไม่เกิน 4 ดวง: กลางตู้แขวนทุกช่องที่ไม่ใช่ฮูด
export function ledPositions(layout: Layout) {
  const back = layout.runs[0];
  const xs: number[] = [];
  let x = layout.x + back.x;
  for (const mod of back.modules) {
    if (mod.kind !== 'tall' && mod.kind !== 'hob') xs.push(x + mod.w / 2);
    x += mod.w;
  }
  return xs.slice(0, 4);
}
```

- [ ] **Step 4: Scene** — create `components/room/RoomScene.tsx`:

```tsx
'use client';

// ฉาก 3D ของหน้า /room/: ห้องโถงเดียว มีครัว I, L, U ตั้งเรียงตามผนังหลัง
// เปลี่ยนผัง = กล้องเลื่อนไปหาครัวนั้น · วัสดุและแสงใช้ร่วมกันทั้งห้อง
// วาดใหม่เฉพาะตอนมีอะไรเปลี่ยน (หมุน ซูม กล้องเลื่อน แสงไล่) ไม่วาดวนทุกเฟรม
// three.js อยู่เฉพาะในไฟล์กลุ่ม components/room/ และโหลดแบบ dynamic จาก RoomContent

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FAUCET_LOOKS, HALL, LAYOUTS, LIGHTS, ORBIT, PARTS, type LayoutId, type LightId, type Look, type Picks } from '@/lib/room';
import { buildKitchen, ledPositions, makeMaterials } from './kitchen';
import { applyLook, disposeTextures } from './textures';

export type RoomHandle = { zoom: (step: number) => void; rotate: (step: number) => void; reset: () => void };
type Props = { layout: LayoutId; picks: Picks; light: LightId; label: string; onReady: () => void; onError: () => void };
type Api = { setPicks: (p: Picks) => void; setLight: (l: LightId) => void; goTo: (l: LayoutId, jump?: boolean) => void; orbit: (dAzimuth: number, dZoom: number) => void };

const FLIGHT = 1.2; // วินาทีที่กล้องใช้เลื่อนไปครัวอื่น
const FADE = 0.6; // วินาทีที่แสงใช้ไล่ไปโทนใหม่
const layoutOf = (id: LayoutId) => LAYOUTS.find((l) => l.id === id)!;
const presetOf = (id: LightId) => LIGHTS.find((l) => l.id === id)!;
// look ของตัวเลือกที่เลือกอยู่ · 'top' (ผนังกันเปื้อนแบบวัสดุเดียวกับท็อป) = ใช้ look ของท็อปที่เลือก
const lookOf = (part: keyof typeof PARTS, picks: Picks): Look => {
  const look = PARTS[part].find((o) => o.id === picks[part])!.look;
  return look === 'top' ? lookOf('top', picks) : look;
};

const RoomScene = forwardRef<RoomHandle, Props>(function RoomScene({ layout, picks, light, label, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);

  useImperativeHandle(ref, () => ({
    zoom: (step) => api.current?.orbit(0, step),
    rotate: (step) => api.current?.orbit(step, 0),
    reset: () => api.current?.goTo(layout, true),
  }));

  useEffect(() => {
    const el = host.current!;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // เช็ก WebGL เองก่อน: ถ้าปล่อยให้ three.js ลองแล้วพลาด มันจะ console.error ซึ่งทำให้ด่าน check:overflow ตก
    if (!document.createElement('canvas').getContext('webgl2')) {
      onError();
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const background = new THREE.Color();
    scene.background = background;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // ── ห้องโถง: ผนังหน้าเดียว มองจากด้านนอกจะทะลุ กล้องจึงอยู่นอกห้องได้ ──
    const m = makeMaterials();
    const plane = (w: number, h: number, mat: THREE.Material) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv; // UV หน่วยเมตร ให้ลายพื้นไม่ยืด
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    const floor = plane(HALL.width, HALL.depth, m.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, HALL.depth / 2);
    plane(HALL.width, HALL.height, m.wall).position.set(0, HALL.height / 2, 0);
    for (const side of [-1, 1]) {
      const end = plane(HALL.depth, HALL.height, m.wall);
      end.position.set((side * HALL.width) / 2, HALL.height / 2, HALL.depth / 2);
      end.rotation.y = (-side * Math.PI) / 2;
    }
    LAYOUTS.forEach((l) => scene.add(buildKitchen(l, m)));

    // ── ไฟ: แดดดวงเดียวคลุมทั้งห้อง · ไฟใต้ตู้ 4 ดวง + ไฟเพดาน 1 ดวง ย้ายตามครัวที่กำลังดู (รวมไม่เกิน 6 ดวง) ──
    const small = window.innerWidth < 768;
    const sun = new THREE.DirectionalLight();
    sun.position.set(10.5, 11.5, 10.7); // แดดเฉียงจากหน้าขวา · อยู่ไกลพอให้เงาคลุมทั้งห้อง
    sun.target.position.set(0, 1, 0.5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(small ? 2048 : 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 11, bottom: -11, near: 1, far: 40 }); // แดดเฉียง 45 องศา ห้องยาว 27 ม. จึงต้องกว้างทั้งสองแกน
    const hemi = new THREE.HemisphereLight('#ffffff', '#b9ad9c');
    const leds = [0, 1, 2, 3].map(() => {
      const spot = new THREE.SpotLight('#ffffff', 0, 2.2, 1.15, 0.6, 2); // ส่องลงอย่างเดียว ไม่ย้อนขึ้นโดนขอบหน้าบาน
      spot.position.set(0, 1.43, 0.26);
      spot.target.position.set(0, 0.9, 0.3);
      scene.add(spot, spot.target);
      return spot;
    });
    const ceil = new THREE.PointLight('#ffffff', 0, 9, 2);
    ceil.position.set(0, 2.55, 1.7);
    ceil.castShadow = true;
    ceil.shadow.mapSize.set(1024, 1024);
    ceil.shadow.bias = -0.002;
    scene.add(sun, sun.target, hemi, ceil);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !still;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -ORBIT.azimuth;
    controls.maxAzimuthAngle = ORBIT.azimuth;
    controls.minPolarAngle = ORBIT.polarMin;
    controls.maxPolarAngle = ORBIT.polarMax;
    controls.minDistance = ORBIT.zoomMin;
    controls.maxDistance = ORBIT.zoomMax;

    let dirty = true;
    controls.addEventListener('change', () => (dirty = true));
    // วางกล้องจากมุมรอบจุดมอง (theta = ซ้ายขวา, phi = ก้มเงย, radius = ระยะ)
    const place = (target: THREE.Vector3, s: THREE.Spherical) => {
      controls.target.copy(target);
      camera.position.setFromSpherical(s).add(target);
      camera.lookAt(target);
      dirty = true;
    };

    // ── กล้องเลื่อนไปครัวอื่น ──
    const flight = { t: 1, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), from: new THREE.Spherical(), to: new THREE.Spherical() };
    let ledOn = 4; // จำนวนไฟใต้ตู้ที่ใช้กับครัวปัจจุบัน
    const goTo = (id: LayoutId, jump = false) => {
      const l = layoutOf(id);
      const xs = ledPositions(l);
      ledOn = xs.length;
      leds.forEach((spot, i) => {
        spot.position.x = spot.target.position.x = xs[i] ?? l.x;
      });
      ceil.position.x = l.x;
      applyLight();
      flight.toTarget.set(l.x, l.home.target[0], l.home.target[1]);
      flight.to.set(l.home.distance, l.home.polar, l.home.azimuth);
      if (jump || still) {
        flight.t = 1;
        controls.enabled = true;
        place(flight.toTarget, flight.to);
        controls.update();
        return;
      }
      flight.fromTarget.copy(controls.target);
      flight.from.setFromVector3(camera.position.clone().sub(controls.target));
      flight.t = 0;
      controls.enabled = false;
    };

    // ── แสง: ไล่จากค่าตอนกดไปค่าเป้าหมาย ──
    type Mix = { sun: number; hemi: number; env: number; led: number; ceil: number; exposure: number; sunColor: THREE.Color; ledColor: THREE.Color; ceilColor: THREE.Color; bg: THREE.Color };
    const NUMBERS = ['sun', 'hemi', 'env', 'led', 'ceil', 'exposure'] as const;
    const COLORS = ['sunColor', 'ledColor', 'ceilColor', 'bg'] as const;
    const mix = (id: LightId): Mix => {
      const p = presetOf(id);
      return { ...p, sunColor: new THREE.Color(p.sunColor), ledColor: new THREE.Color(p.ledColor), ceilColor: new THREE.Color(p.ceilColor), bg: new THREE.Color(p.bg) };
    };
    const copy = (a: Mix): Mix => ({ ...a, sunColor: a.sunColor.clone(), ledColor: a.ledColor.clone(), ceilColor: a.ceilColor.clone(), bg: a.bg.clone() });
    const now = mix(light);
    let from = copy(now);
    let goal = copy(now);
    let fade = 1;
    function applyLight() {
      sun.intensity = now.sun;
      sun.color.copy(now.sunColor);
      hemi.intensity = now.hemi;
      scene.environmentIntensity = now.env;
      leds.forEach((spot, i) => {
        spot.intensity = i < ledOn ? now.led : 0;
        spot.color.copy(now.ledColor);
      });
      ceil.intensity = now.ceil;
      ceil.color.copy(now.ceilColor);
      m.led.color.copy(now.ledColor).multiplyScalar(Math.min(1, now.led / 6));
      background.copy(now.bg);
      renderer.toneMappingExposure = now.exposure;
      dirty = true;
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // จอแนวตั้ง: ขยายมุมกล้องแนวตั้งให้ความกว้างที่เห็นเท่าเดิม ครัวจะไม่ตกขอบ
      camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(0.4245 / camera.aspect)), 38, 70);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const watcher = new ResizeObserver(resize);
    watcher.observe(el);
    resize();

    // ตัวเลขไว้วัดผล (ดูใน console: window.__room)
    const stats = { renderMs: 0, frames: 0 };
    (window as unknown as { __room?: unknown }).__room = { stats, info: renderer.info };

    const target = new THREE.Vector3();
    const spherical = new THREE.Spherical();
    let raf = 0;
    let last = performance.now();
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (fade < 1) {
        fade = still ? 1 : Math.min(1, fade + dt / FADE);
        const k = 1 - Math.pow(1 - fade, 3);
        for (const key of NUMBERS) now[key] = from[key] + (goal[key] - from[key]) * k;
        for (const key of COLORS) now[key].lerpColors(from[key], goal[key], k);
        applyLight();
      }
      if (flight.t < 1) {
        flight.t = Math.min(1, flight.t + dt / FLIGHT);
        const k = 1 - Math.pow(1 - flight.t, 3);
        target.lerpVectors(flight.fromTarget, flight.toTarget, k);
        spherical.set(
          THREE.MathUtils.lerp(flight.from.radius, flight.to.radius, k),
          THREE.MathUtils.lerp(flight.from.phi, flight.to.phi, k),
          THREE.MathUtils.lerp(flight.from.theta, flight.to.theta, k),
        );
        place(target, spherical);
        if (flight.t === 1) controls.enabled = true;
      } else controls.update();
      if (!dirty) return;
      dirty = false;
      const start = performance.now();
      renderer.render(scene, camera);
      stats.renderMs = performance.now() - start;
      stats.frames++;
    };

    api.current = {
      setPicks: (p) => {
        applyLook(m.door, lookOf('doors', p));
        applyLook(m.top, lookOf('top', p));
        applyLook(m.splash, lookOf('splash', p));
        applyLook(m.floor, lookOf('floor', p));
        applyLook(m.faucet, FAUCET_LOOKS[p.faucet]);
        dirty = true;
      },
      setLight: (id) => {
        from = copy(now);
        goal = mix(id);
        fade = 0;
      },
      goTo,
      orbit: (dAzimuth, dZoom) => {
        if (flight.t < 1) return;
        spherical.setFromVector3(camera.position.clone().sub(controls.target));
        spherical.theta = THREE.MathUtils.clamp(spherical.theta + dAzimuth, -ORBIT.azimuth, ORBIT.azimuth);
        spherical.radius = THREE.MathUtils.clamp(spherical.radius * (1 - dZoom), ORBIT.zoomMin, ORBIT.zoomMax);
        place(controls.target.clone(), spherical);
        controls.update();
      },
    };
    api.current.setPicks(picks);
    goTo(layout, true);
    raf = requestAnimationFrame(tick);
    onReady();

    return () => {
      cancelAnimationFrame(raf);
      watcher.disconnect();
      controls.dispose();
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      Object.values(m).forEach((mat) => mat.dispose());
      disposeTextures();
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // สร้างฉากครั้งเดียว · layout, picks, light เปลี่ยนผ่าน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // effect ทั้งสามทำงานตอน mount ด้วย แต่ค่าเท่ากับที่ฉากเพิ่งตั้ง จึงไม่มีผล (goTo ไปที่เดิม = กล้องอยู่ที่เดิม)
  const first = useRef(true);
  useEffect(() => api.current?.setPicks(picks), [picks]);
  useEffect(() => api.current?.setLight(light), [light]);
  useEffect(() => {
    if (first.current) first.current = false;
    else api.current?.goTo(layout);
  }, [layout]);

  const onKey = (e: React.KeyboardEvent) => {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], '+': [0, 0.12], '=': [0, 0.12], '-': [0, -0.12] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    api.current?.orbit(step[0], step[1]);
  };

  return (
    <div
      ref={host}
      role="application"
      tabIndex={0}
      aria-label={label}
      onKeyDown={onKey}
      data-lenis-prevent
      className="absolute inset-0 cursor-grab touch-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:cursor-grabbing [&>canvas]:block"
    />
  );
});

export default RoomScene;
```

- [ ] **Step 5: Translations**

In `lib/i18n.ts` the text `    catalog: {` followed by `      kicker: 'KOHLER KITCHENS 2026',` appears exactly twice: first in `th`, then in `en`. Insert a `room` block immediately before each.

Before the first (Thai):

```ts
    room: {
      title: 'จำลองห้องครัว',
      help: 'เลือกผังครัว แล้วลองสีและวัสดุกับแสงแต่ละแบบ ลากที่ภาพเพื่อหมุน เลื่อนล้อเมาส์หรือจีบนิ้วเพื่อซูม',
      layout: 'ผังครัว',
      doors: 'หน้าบานตู้',
      top: 'ท็อปเคาน์เตอร์',
      splash: 'ผนังกันเปื้อน',
      floor: 'พื้น',
      faucet: 'ก๊อก',
      light: 'โทนแสง',
      view: 'มุมมอง',
      zoomIn: 'ซูมเข้า',
      zoomOut: 'ซูมออก',
      reset: 'มุมเริ่มต้น',
      note: 'ภาพจำลองเพื่อประกอบการตัดสินใจ สีและผิววัสดุจริงอาจต่างจากที่เห็นบนจอ ก๊อกในภาพเป็นทรงตัวอย่าง ไม่ใช่รุ่นที่จำหน่าย',
      noWebgl: 'อุปกรณ์นี้แสดงภาพ 3 มิติไม่ได้ ลองเปิดด้วยเบราว์เซอร์รุ่นใหม่หรืออุปกรณ์เครื่องอื่น',
      sceneLabel: 'ห้องครัวจำลอง 3 มิติ กดลูกศรซ้ายขวาเพื่อหมุน กดบวกลบเพื่อซูม',
    },
```

Before the second (English):

```ts
    room: {
      title: 'Kitchen studio',
      help: 'Pick a layout, then try colours and materials under each light. Drag the scene to look around, scroll or pinch to zoom.',
      layout: 'Layout',
      doors: 'Cabinet doors',
      top: 'Countertop',
      splash: 'Backsplash',
      floor: 'Floor',
      faucet: 'Faucet',
      light: 'Light',
      view: 'View',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      reset: 'Reset view',
      note: 'A simulation to help you decide. Real colours and surfaces can differ from what the screen shows. The faucet shape is a sample, not a model on sale.',
      noWebgl: 'This device cannot show 3D. Try a newer browser or another device.',
      sceneLabel: '3D kitchen studio. Press the left and right arrow keys to look around, plus and minus to zoom.',
    },
```

- [ ] **Step 6: Panel** — create `components/room/RoomContent.tsx`:

```tsx
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

  return (
    <section className="px-6 pb-16 pt-24 md:px-[4vw] lg:grid lg:h-[100dvh] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:pb-8">
      {/* ต่ำกว่า lg: ฉากติดบนจอ แผงเลื่อนอยู่ข้างใต้ */}
      <div className="sticky top-20 z-10 h-[45dvh] min-h-[280px] overflow-hidden bg-warm-200 lg:relative lg:top-0 lg:h-auto">
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
              onReady={() => setState('ready')}
              onError={() => setState('error')}
            />
            {state === 'loading' && <Skeleton />}
          </>
        )}
      </div>

      <div className="flex flex-col gap-7 pt-8 lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:pt-1" data-lenis-prevent>
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
```

- [ ] **Step 7: Route** — create `app/room/page.tsx`:

```tsx
import type { Metadata } from 'next';
import RoomContent from '@/components/room/RoomContent';

// หน้านี้เข้าได้ด้วยลิงก์ตรงเท่านั้น: ไม่อยู่ในเมนู footer หรือ sitemap และไม่ให้เครื่องมือค้นหาเก็บ
export const metadata: Metadata = {
  title: 'จำลองห้องครัว 3 มิติ',
  description: 'ลองสีหน้าบาน ท็อป พื้น และโทนแสงกับครัวผัง I, L และ U ในห้องจำลอง หมุนและซูมดูได้ 180 องศา',
  alternates: { canonical: '/room/' },
  robots: { index: false, follow: false },
};

export default function RoomPage() {
  return <RoomContent />;
}
```

- [ ] **Step 8: Put `/room/` in the overflow gate**

Nothing links to `/room/`, so the crawler never finds it. In `scripts/check-overflow.mjs`, directly after the line that starts with `if (pages.length < 2) {` add:

```js
if (!pages.includes('/room/')) pages.push('/room/'); // หน้าห้องจำลองไม่มีลิงก์เข้า (ตั้งใจ) จึงต้องใส่เอง
```

- [ ] **Step 9: README**

After the table row that starts with `| \`lib/room.ts\`` (added in Task 1) add:

```
| `components/room/` | ห้องจำลอง 3D ที่ `/room/` (ไม่อยู่ในเมนู, noindex) · ครัวปั้นด้วยโค้ด ก๊อกเป็นทรงตัวอย่าง → ใส่ลิงก์ในเมนูเมื่อพร้อมเปิดจริง |
```

- [ ] **Step 10: Checks**

With the dev server already running on port 4100:

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'      # expect no output
npm run check:room                                    # ผ่าน: ข้อมูลห้องจำลอง
npm run check:filter                                  # ผ่าน
npm run build                                         # route list contains /room
npm run check:overflow                                # page count is one more than before; ผ่าน
curl -s http://localhost:4100/room/ | grep -c 'noindex'          # 1 or more
curl -s http://localhost:4100/ | grep -c 'href="/room/"'         # 0
grep -c "'/room/'\|\"/room/\"" app/sitemap.ts components/Nav.tsx components/Footer.tsx   # 0 for each file
```

Then the U+0E4E scan from Global Constraints (no output).

If `check:overflow` reports a console error on `/room/`, report it with the exact message instead of changing the gate.

- [ ] **Step 11: Commit**

```bash
git add components/room app/room lib/i18n.ts scripts/check-overflow.mjs README.md package.json package-lock.json
git commit -m "feat: add the kitchen studio page with three layouts in one 3D room

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After Task 2 (controller, not a subagent)

Browser checks from the spec at 1200, 768 and 375 px, Thai and English: each layout button lands on its kitchen; every option of every part; four light presets; orbit and zoom limits; keyboard; reduced motion; console clean; `window.__room` numbers against the budget (60 fps on this desktop, at most 300 draw calls and 80,000 triangles); panel contrast from pixels. Geometry, light values and home views are tuned here and fixed through one fix round. Then the final whole-branch review.
