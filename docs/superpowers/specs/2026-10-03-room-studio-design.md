# Kitchen studio (3D room preview) — design

Date: 2026-10-03 · Branch: `room-studio` (from `preview-products-works` @ `7c8a2c3`) · Requested in chat by anuwat
after the spike on `spike-room-3d` (`e9ca10b`). Status: written, waiting for the owner's review. No PR until asked.

## Goal

The client wants a room where a visitor can see an I-shaped, an L-shaped and a U-shaped kitchen, click to change
colours and surface materials, see them under different light, look around 180 degrees and zoom.

One page, `/room/`, shows **one studio that holds all three kitchens side by side**. A button per layout moves the
camera to that kitchen. The material and light choices apply to the whole studio.

## What the spike settled

- A kitchen modelled in code (three.js geometry, no model files) looks good enough at showroom distance and is cheap:
  about 1 ms per frame, 17,500 triangles and 83 draw calls for one kitchen on a desktop GPU.
- three.js is about 524 KB before compression and loads only on `/room/`.
- The spike code is a reference, not a base. This work is written fresh on `room-studio`; pieces may be copied.
- Not measured: a real phone. The owner opens the Vercel preview on a phone before this is called done.

## Design read (taste-skill, owner asked for it)

Configurator page for homeowners choosing materials, in the existing ITERRA showroom language (paper, ink, warm
tokens, sharp corners, light theme only). The skill targets landing pages, so only the rules that fit a tool page are
taken: the scene is the hero, one heading with no eyebrow, no numbered labels, no em-dash or en-dash, at most one
middle dot per line, circles only for colour dots, every button has focus and pressed states, motion only for state
changes, reduced motion respected, a loading skeleton and a no-WebGL message.

## The studio

Units are metres. `x` runs along the back wall, `y` is up, `z` comes out of the wall toward the camera. The back wall
is at `z = 0`.

- One hall, back wall 21 m long, 3.6 m high, floor 5 m deep. Walls are single-sided planes so the camera can sit
  outside the hall and still see in.
- Three bays along the back wall, centres 6.5 m apart: I at `x = -6.5`, L at `x = 0`, U at `x = 6.5`. No partitions
  between bays; from the side a neighbouring kitchen is visible in the background, as in a real showroom.

Kitchens are built from **runs**. A run is a line of modules with an origin and a direction. Wall cabinets, the tall
oven unit, the hood and the backsplash exist **only on the back run**. Leg runs are base units and countertop only, so
a side view always looks over a 0.9 m counter instead of into the back of a cabinet.

| layout | runs | fixtures |
|---|---|---|
| I | back 3.6 m | tall oven unit at the left end, sink, hob under a built-in hood |
| L | back 3.0 m + left leg 2.4 m | tall oven unit at the right end of the back run, hob on the back run, sink on the leg |
| U | back 3.2 m + left leg 2.2 m + right leg 2.2 m | hob on the back run, sink on the left leg, tall oven unit replaced by an under-counter oven on the right leg |

Module kinds: door (1 or 2 doors), drawers (2 or 3), sink base, hob base, oven base, corner (blind, no front), tall
oven unit, wall cabinet. Fronts have 2 mm gaps on a dark backing, bar handles, a recessed toe kick. Where two runs meet,
the countertops share the corner square.

The faucet is a generic gooseneck, not a Kohler model. The page says so in its note line.

## What the visitor can change

Choices apply to all three kitchens at once (shared materials), so moving between layouts compares shape, not colour.

| part | options (id: th / en) |
|---|---|
| Doors | `white`: ขาวด้าน / Matte White · `graphite`: เทาเข้ม / Graphite · `oak`: ลายไม้โอ๊ค / Oak · `sage`: เขียวหม่น / Sage |
| Countertop | `quartz-white`: ควอตซ์ขาว / White Quartz · `quartz-grey`: ควอตซ์เทา / Grey Quartz · `stone-black`: หินดำ / Black Stone · `wood`: ไม้จริง / Solid Wood |
| Backsplash | `tile-white`: กระเบื้องขาวเงา / Gloss White Tile · `tile-grey`: กระเบื้องเทา / Grey Tile · `match`: วัสดุเดียวกับท็อป / Same as Countertop |
| Floor | `oak-light`: ไม้โอ๊คอ่อน / Light Oak · `walnut`: ไม้วอลนัต / Walnut · `concrete`: ปูนขัดมัน / Polished Concrete · `tile-grey`: กระเบื้องเทา / Grey Tile |
| Faucet | the four finishes already in `lib/finishes.ts` (chrome, matte black, brushed brass, brushed stainless); the same "สีตัวอย่าง / Sample finish" label for the three demo finishes. The sink stays stainless steel. |
| Light | `day`: กลางวัน / Daylight · `warm`: วอร์มไวท์ 3000K / Warm White 3000K · `cool`: คูลไวท์ 6000K / Cool White 6000K · `night`: กลางคืน / Night (under-cabinet lights only) |

Every option is MOCK data for the demo. Wood, stone and tile patterns are drawn in code on a canvas. That is the known
ceiling: fine at showroom distance, visibly synthetic up close, and veined marble is not attempted. Real pattern
images from the supplier replace them later (out of scope).

## Camera

- Three layout buttons. Choosing one moves the camera target and position to that bay's home view in 1.2 s with an
  ease-out curve. Under reduced motion the camera jumps.
- Inside a bay: drag to orbit 90 degrees each side of the front (180 in total), tilt limited so the camera never goes
  below the counter or above the wall top, zoom by wheel, pinch, the + and − buttons and the keyboard, clamped between
  2.8 m and 7 m. No panning by drag. "มุมเริ่มต้น / Reset view" returns to the bay's home view.
- Keyboard on the scene: left and right arrows orbit, `+` and `-` zoom. The layout, option and view buttons are
  ordinary buttons.
- On portrait screens the vertical field of view widens so the kitchen keeps its width in frame.
- The wheel zooms the scene while the pointer is over it (`data-lenis-prevent`); a touch drag on the scene orbits
  instead of scrolling the page.

## Light

Each preset sets sun, sky, environment reflection, under-cabinet lights, ceiling light, background colour and
exposure. A preset change fades over 0.6 s (instant under reduced motion). A material change swaps at once.

Cost rule: the sun covers the whole hall with one shadow map (4096 × 1024, 2048 × 512 below 768 px). Under-cabinet
and ceiling lights exist only for the active bay; they move with the camera flight. No more than 6 lights are on at
any time.

## Page

- `/room/`, `noindex`, not linked from the nav, the footer or the sitemap (owner's choice). Thai and English through
  `lib/i18n.ts` (`room` block).
- `lg` and up: scene on the left filling the height under the nav, a 320 px panel on the right that scrolls on its
  own if it is taller than the screen. Below `lg`: the scene is sticky at the top at 45dvh, the panel scrolls under it.
- Panel order: heading "จำลองห้องครัว / Kitchen studio" and one line of help; layout (I, L, U); doors; countertop;
  backsplash; floor; faucet; light; view (−, +, reset); one link "นัดชมโชว์รูม / Book a showroom visit" to
  `/contact/`; a note that colours on screen differ from real materials and that the faucet shape is generic.
- Colour options are circles with the name beside the group as text for the selected one (`aria-pressed`, name as
  `aria-label` and `title`). Layout and light options are text buttons.
- While three.js loads: a grey skeleton the size of the scene. No WebGL: a sentence in place of the scene; the panel
  still renders.
- State lives in React state only. Nothing is saved, nothing is in the URL.

## Code layout

| file | job |
|---|---|
| `lib/room.ts` | MOCK data, no imports: option lists (id, names, swatch, material numbers), light presets, the three layouts as runs of modules, bay centres, camera home views. |
| `scripts/check-room.mjs` (`npm run check:room`) | Node type stripping, like `check:filter`. Asserts: module widths add up to each run length; no fixture is missing or doubled per layout; every option has `th` and `en`; ids are unique per part; home views sit inside the orbit and zoom limits. |
| `components/room/textures.ts` | canvas patterns (wood, planks, tile, stone speckle). |
| `components/room/kitchen.ts` | builds one kitchen (a `THREE.Group`) from a layout and the shared materials. |
| `components/room/RoomScene.tsx` | renderer, hall, three kitchens, lights, orbit controls, camera flight, render on demand, dispose on unmount. Exposes `zoom`, `rotate`, `reset`. |
| `components/room/RoomContent.tsx` | the page: scene (dynamic import, no SSR), panel, state. |
| `app/room/page.tsx` | metadata. |
| `lib/i18n.ts` | `room` block, both languages. |
| `scripts/check-overflow.mjs` | `/room/` added to the page list by hand, since nothing links to it. |
| `package.json` | `three`, `@types/three` (dev), `check:room`. |
| `README.md` | rows for `lib/room.ts` and the page. |

three.js stays in its own client components and is never mixed into a GSAP tree. The scene renders only when
something changed (orbit, flight, fade, resize).

## Budget

On the desktop used for the spike: 60 fps while orbiting, at most 300 draw calls and 80,000 triangles with all three
kitchens in view. If draw calls pass 300, static meshes are merged per material. The three.js chunk is requested only
by `/room/`; the home page's script list does not contain it.

## Verification

`npx tsc --noEmit` (ignoring stale `.next/types`), `npm run build`, `npm run check:overflow` (now including
`/room/`), `npm run check:room`, `npm run check:filter`, the U+0E4E scan. Browser checks at 1200, 768 and 375 px in
Thai and English: each layout button lands on its kitchen; every option of every part changes the scene; the four
light presets; orbit stops at 90 degrees each side; zoom stops at both ends; keyboard control; reduced motion (jump
and instant swaps); no console errors; panel text contrast measured from pixels. The owner checks the Vercel preview
on a real phone.

## Decisions made without asking (say so in review if any is wrong)

1. Materials are shared by the three kitchens, not chosen per kitchen.
2. Legs of the L and the U carry base units only; wall cabinets and the tall unit stay on the back wall.
3. The sink stays stainless; only the faucet takes the four finishes.
4. Backsplash and floor are two separate choices.
5. The camera flight is a straight sideways move along the hall, not a cut and not a fly-through.

## Out of scope

Saving or sharing a configuration, state in the URL, prices or quotes, real product models (GLB) and exact Kohler
faucet shapes, pattern images from suppliers, veined marble, moving or resizing modules, custom room sizes, per-kitchen
materials, sink colours, AR, image export, a nav or footer link, dark theme, the works page and the home contact
photo (tasks 3 and 4 of the earlier plan), PR, merge, deploy.
