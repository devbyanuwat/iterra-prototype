# Kitchen studio: the hall as a gallery showroom — design

Date: 2026-10-04 · Branch: `room-studio` · Requested in chat by anuwat ("อยากให้ออกแบบห้อง เหมือนเป็น showroom ไม่อยากให้
เป็นพื้นหลังโล่งๆ"; style and scope chosen in chat: calm gallery; hall structure, counter props, showroom furniture, a
window with a view). Design approved in chat ("ทำได้"). This is job A; job B is
`2026-10-04-room-focus-mode-design.md`. Extends `2026-10-03-room-studio-design.md`.

## Goal

The three kitchens stand in a room that reads as a showroom gallery, not on an empty backdrop. Nothing added changes
how the page is used: the same camera, the same parts to point at, the same choices.

## What is added

**Hall structure**

- A dark skirting board along the back wall and both end walls.
- A ceiling at `HALL.height`, with three black track-light rails running the length of the hall and spot heads above
  each kitchen. The heads are scenery (a dark body and a small bright face); they add no light source.
- Shallow pilasters (0.4 m deep, full height) on the back wall between the kitchens. Shallow, because a deep partition
  would block the camera when it orbits to the side.
- A sign above each kitchen: the layout's name in the page language ("ครัวตัว I", "I-shaped") over a short rule, drawn
  on a canvas texture. (A separate large letter was dropped: a lone "I" reads as a stray bar.)

**Windows and view**

- Two tall windows in the back wall, one in each gap between kitchens, each with a thin dark frame.
- The view is a canvas texture drawn in code: a sky gradient and a soft line of trees. No image file is loaded.
- The view's brightness follows the light preset (bright by day, dim at night) through one new number per preset.

**Showroom furniture** (in the two gaps, in front of the windows, clear of every kitchen)

- Left gap: a wooden bench and a potted plant.
- Right gap: a sample table carrying four sample slabs that use the same materials as the kitchens (doors, countertop,
  backsplash, floor), so a choice made in the panel shows on the slab too.

**Counter props** (every kitchen)

- A cutting board, a bowl of fruit, a vase with stems, a short stack of books.
- Props are not parts: pointing at them shows nothing and clicking them does nothing.

## Data (`lib/room.ts`, still import-free)

- `Layout` gains `props: { kind: 'board' | 'bowl' | 'vase' | 'books'; x: number; z: number }[]`, positions in bay
  coordinates on the countertop of that kitchen.
- `SHOWROOM`: window positions and size, pilaster positions, furniture positions (x along the hall, z out of the wall).
- Each light preset gains `view: number` (0 to 1), the brightness of the window view.

## Checks (`scripts/check-room.mjs`)

- every prop sits on a countertop run of its kitchen and not over a sink or hob module, with its footprint inside the
  counter depth;
- every kitchen has all four prop kinds;
- windows, pilasters and furniture lie inside the hall and do not overlap any kitchen's footprint or each other;
- every preset has `view` between 0 and 1.

## Code

| file | change |
|---|---|
| `components/room/hall.ts` (new) | builds skirting, ceiling, rails, pilasters, signs, windows, furniture and counter props; exports `buildHall`, `buildProps`, `setSigns(lang)` and the view material |
| `components/room/RoomScene.tsx` | calls `buildHall` in place of the bare wall and floor planes; adds props to each kitchen; fades the view with the light preset; redraws signs on language change |
| `components/room/kitchen.ts` | `makeMaterials` gains the few fixed materials the hall needs (frame, wood, leaf, view) |
| `lib/room.ts`, `scripts/check-room.mjs` | data and checks above |
| `lib/i18n.ts` | nothing new: signs reuse the layout names already there |

three.js stays in `components/room/` scene files only. No new dependency, no downloaded asset.

## Budget

Limit: 300 draw calls, 80,000 triangles, 6 lights, in every view the camera can reach. Read from
`window.__room.info.render`.

Found while building: the limit was only ever measured at a home view. From the side (orbit extreme, all three
kitchens in frame) the kitchens alone drew about 425 calls, because every cabinet part was its own mesh. So the static
parts of each kitchen are now merged per material too (`mergeStatic` in `kitchen.ts`); faucet and sink variants and
the click targets stay separate. Measured on 2026-10-04 at 1280 px with the default choices: home view of kitchen I
36 calls and 25,446 triangles; side view from kitchen U 88 calls and 71,324 triangles. The first draft's target of
45,000 triangles is not met in the side view: merged kitchens are drawn whole. It stays under the 80,000 limit.

## Verification

`npx tsc --noEmit`, `npm run build`, `npm run check:room`, `npm run check:filter`, `npm run check:overflow`, the U+0E4E
scan. Browser at 1200 and 375 px: home view of each kitchen (signs readable, nothing floating or intersecting), the
orbit extremes of each kitchen (no added object blocks the kitchen or hides the camera's view), each light preset (view
dims at night), a colour change shows on the sample slabs, hover and click on parts still work with props on the
counter, both languages for the signs, console clean, budget numbers. Not verifiable in the browser pane: reduced
motion, a real phone's frame rate.

## Tasks

1. Hall structure and windows. 2. Showroom furniture. 3. Counter props. One commit each; a screenshot goes to the
owner after task 1 as the first checkpoint.

## Decisions made without asking (say so in review if any is wrong)

1. Pilasters, not deep partitions, between kitchens.
2. Track lights are scenery; lighting stays as tuned on 2026-10-03.
3. The view is drawn in code, generic sky and trees, not a photograph of a real place.
4. Windows go in the back wall between kitchens, not in the end walls (the end walls are rarely in frame).
5. Props and furniture are fixed: no choices, no hover, no focus.

## Out of scope

Walking through the room, wider camera limits, people, real product models, downloaded models or textures, extra real
lights, animated props, a different floor per zone, PR, merge, deploy.
