# Kitchen studio gallery showroom — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three kitchens on `/room/` stand in a dressed gallery hall: skirting, ceiling, track rails, pilasters, layout signs, two windows with a drawn view, a bench, a plant, a sample table, and props on every counter.

**Architecture:** All positions are data in `lib/room.ts` (`SHOWROOM`, `Layout.props`, `LightPreset.view`) and are checked by `check:room`. A new `components/room/hall.ts` turns that data into geometry. Static geometry is collected per material and merged (`mergeGeometries`), so the whole hall costs about one draw call per material. `RoomScene` calls `buildHall`, fades the window view with the light preset, and redraws the signs when the language changes.

**Tech Stack:** Next.js 16.3 static export, React 19, three@0.170 (`three/examples/jsm/utils/BufferGeometryUtils.js` is part of the installed package). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-04-room-showroom-design.md`

**Execution:** inline by the controller on branch `room-studio` (owner: "ไม่ต้องแตก branch", "ลุยเลย"). Scene geometry needs the browser to tune, so the code is written and tuned in the session, then reviewed once over the whole range.

## Global Constraints

- Branch `room-studio`. Commit and push to `origin room-studio` after each task. No PR, no merge, no push to `main`.
- three.js only in `components/room/RoomScene.tsx`, `kitchen.ts`, `textures.ts`, `hall.ts`. `lib/room.ts` imports nothing.
- No new dependency, no downloaded asset.
- No new light source: at most 6 lights stay on.
- Budget after every task, any shapes chosen: at most 200 draw calls and 45,000 triangles, read from `window.__room.info.render`.
- Everything `hall.ts` builds is inert: `userData.inert = true`, and `partAt` in `RoomScene` returns `null` for it.
- No em-dash or en-dash and no U+0E4E in any rendered string.
- Gates for every task: `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` prints nothing; `npm run check:room`; `npm run check:filter`; `npm run build`; `npm run check:overflow` (dev server on 4100 already running); `perl -CSD -ne 'print "$ARGV:$.\n" if /\x{0E4E}/; close ARGV if eof' lib/room.ts lib/i18n.ts components/room/*.tsx` prints nothing.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Hall coordinates (from `lib/room.ts` at 75722c4)

Kitchens occupy these x spans on the back wall: I `-10.8..-7.2`, L `-1.5..1.5`, U `7.4..10.6`. The gaps are `-7.2..-1.5` and `1.5..7.4`. The furthest a leg reaches from the wall is z 3. The hall is 27 wide, 5 deep, 4.6 high.

---

### Task 1: Hall structure and windows

**Files:**
- Create: `components/room/hall.ts`
- Modify: `lib/room.ts`, `scripts/check-room.mjs`, `components/room/kitchen.ts`, `components/room/RoomScene.tsx`, `components/room/RoomContent.tsx`

**Interfaces (produced):**
- `lib/room.ts`: `LightPreset.view: number` with day 1, warm 0.35, cool 0.4, night 0.06.
- `lib/room.ts`:
  ```ts
  export const SHOWROOM = {
    skirting: 0.1, // height in metres
    pilasters: { xs: [-6.7, -2.0, 2.0, 6.9], w: 0.4, d: 0.4 },
    windows: { xs: [-4.35, 4.45], w: 2.4, y0: 0.5, y1: 2.9 },
    rails: { y: 3.0, zs: [1.4], heads: [-0.9, 0, 0.9] }, // heads: x offsets from each bay centre
    sign: { y: 2.62, w: 1.2, h: 0.42 },
    bench: { x: -4.35, z: 0.9, w: 1.6, d: 0.4 },
    plant: { x: -6.0, z: 0.55, r: 0.3 },
    table: { x: 4.45, z: 0.9, w: 1.6, d: 0.7 },
  };
  ```
  (bench, plant, table are consumed by Task 2 and checked from Task 1 on.)
- `components/room/kitchen.ts`: exports `metreUV`; `makeMaterials()` gains `wood`, `leaf`, `ceramic`, `fruit`, `paper` (`MeshStandardMaterial`) and `view` (`MeshBasicMaterial`).
- `components/room/hall.ts`:
  ```ts
  export type Hall = { group: THREE.Group; setSigns: (lang: 'th' | 'en') => void; dispose: () => void };
  export function buildHall(m: Mats, lang: 'th' | 'en'): Hall;
  ```
  `buildHall` sets `m.view.map` to the drawn view texture; `dispose` frees the view and sign textures (geometries and materials are freed by the existing scene cleanup).
- `RoomScene` gains prop `lang: 'th' | 'en'`; `RoomContent` passes `lang` from `useLang()`.

- [ ] Step 1: add `view` to `LightPreset` and `LIGHTS`, add `SHOWROOM`.
- [ ] Step 2: add checks to `scripts/check-room.mjs`: every preset `view` in 0..1; pilasters and windows are pairwise disjoint on x and disjoint from every kitchen's back-run span; bench, plant and table are pairwise disjoint on x, disjoint from kitchens and pilasters, and sit between z 0.3 and z 1.5; everything is inside the hall width. Run `npm run check:room`, expect pass. Then move `windows.xs[0]` to `-7.5`, expect a failure naming the window, and restore.
- [ ] Step 3: write `hall.ts`: a per-material bag of translated geometries merged at the end; skirting (back wall and both end walls), ceiling (single-sided plane facing down), one rail with three heads above each bay, four pilasters, two windows (view plane 5 mm off the wall, frame and one mullion and one transom from thin boxes), three signs (one canvas texture each: the layout letter large, the layout name small, ink on transparent).
- [ ] Step 4: in `RoomScene`, call `buildHall` after the kitchens, add `'view'` to the light mix so the view fades with the preset (`m.view.color.setScalar(now.view)`), make `partAt` return `null` for inert objects, call `hall.setSigns(lang)` in an effect on `lang`, call `hall.dispose()` in cleanup.
- [ ] Step 5: gates; browser at 1200 and 375: home view and orbit extremes of each kitchen, all four presets, both languages; read the budget numbers.
- [ ] Step 6: commit `feat: dress the studio hall with skirting, pilasters, signs and windows`, push, send a screenshot to the owner.

### Task 2: Showroom furniture

**Files:** Modify `components/room/hall.ts`.

**Interfaces:** consumes `SHOWROOM.bench`, `SHOWROOM.plant`, `SHOWROOM.table` and `m.wood`, `m.leaf`, `m.ceramic`, `m.kick`, `m.door`, `m.top`, `m.splash`, `m.floor`.

- [ ] Step 1: bench (seat slab on two slab legs, `m.wood`), plant (ceramic pot, trunk, a cluster of low-poly leaf balls), sample table (wood top on four dark legs) with four slabs, one each of `m.door`, `m.top`, `m.splash`, `m.floor`, with metre-scaled UVs.
- [ ] Step 2: gates; browser: change each of the four materials and see the slab follow; orbit extremes of the L kitchen (the furniture must not hide the kitchen); budget numbers.
- [ ] Step 3: commit `feat: furnish the studio hall with a bench, a plant and a sample table`, push.

### Task 3: Counter props

**Files:** Modify `lib/room.ts`, `scripts/check-room.mjs`, `components/room/hall.ts`.

**Interfaces:**
- `lib/room.ts`: `export type Prop = { kind: 'board' | 'bowl' | 'vase' | 'books'; x: number; z: number }`; `Layout.props: Prop[]`, in bay coordinates:
  - I: board `(-0.9, 0.36)`, vase `(-1.05, 0.14)`, bowl `(1.36, 0.36)`, books `(1.62, 0.18)`
  - L: bowl `(-1.2, 0.3)`, vase `(0.6, 0.15)`, board `(-1.2, 2.7)`, books `(-1.2, 0.9)`
  - U: vase `(-1.3, 0.25)`, bowl `(1.3, 0.3)`, board `(1.3, 2.1)`, books `(-1.3, 2.5)`
- `hall.ts`: props are added inside `buildHall`, at `layout.x + prop.x`, counter height 0.9.

- [ ] Step 1: add the type, the data and the check: every kitchen has all four kinds; every prop lies at least 0.1 m inside the footprint of one module that is not `sink`, `hob` or `tall`. Run the check, expect pass; move the I bowl to `(0.9, 0.3)` (the hob), expect a failure naming it, restore.
- [ ] Step 2: build the four prop shapes in `hall.ts` (board: thin wood slab; bowl: lathe bowl with three fruit; vase: lathe vase with three stems; books: three stacked boxes).
- [ ] Step 3: gates; browser: every kitchen's home view, hover and click on the countertop next to a prop still focus the countertop, a prop itself shows no label; budget numbers.
- [ ] Step 4: commit `feat: set props on the studio kitchen counters`, push.

### After the tasks (controller)

- One whole-range review (most capable model), one fix wave, one scoped re-review.
- Final report in Thai with the budget numbers read live, decisions made alone, what was not verified.
