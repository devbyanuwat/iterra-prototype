# Kitchen studio: wall and base cabinets apart, material and colour apart, custom colour

Branch `room-studio`. Page `/room/`. Extends `2026-10-03-room-studio-design.md` and `2026-10-04-room-focus-mode-design.md`.

## What the owner asked for

1. Wall cabinets and base cabinets are chosen separately.
2. Material and colour are two separate choices.
3. Colour has a custom mode: a colour picker and a field for typing a colour code, per material.

Decided with the owner: this applies to the five surfaces (wall cabinets, base cabinets, countertop, backsplash, floor). Faucet and sink keep their preset finishes. No mockup, build on the real page.

## Data (`lib/room.ts`)

`PARTS` and `Option`-per-surface go away. In their place:

```ts
export type SurfaceId = 'upper' | 'lower' | 'top' | 'splash' | 'floor';
export type Material = { id: string; name: Name; note: Name; look: Omit<Look, 'color'> | 'top' };
export type Colour = { hex: string; name: Name };
export const SURFACES: Record<SurfaceId, { materials: Material[]; colours: Colour[] }>;
export type Surface = { material: string; color: string }; // color = '#rrggbb', preset or custom
export type Picks = Record<SurfaceId, Surface> & { faucet; faucetShape; sink; sinkColor };
export const HEX = /^#[0-9a-f]{6}$/;
```

| Surface | Materials | Preset colours |
|---|---|---|
| upper, lower (same lists) | matte, gloss, wood grain | white, graphite, oak brown, sage |
| top | quartz, polished stone, solid wood | white, grey, black, wood brown |
| splash | gloss tile, satin tile, same as countertop | white, grey |
| floor | wood planks, polished concrete, tile | light oak, walnut, grey, pale grey |

- The note text belongs to the material, not the colour.
- A colour is custom when its hex is not in the surface's preset list.
- Backsplash material "same as countertop" (`look: 'top'`) takes the countertop's material and colour. Its own colour row is hidden while that material is chosen.
- Defaults reproduce today's first view: matte white cabinets, grey quartz top, gloss white tile, light oak planks.
- The tall cabinet stands on the floor and belongs to `lower`.
- `Part = SurfaceId | 'faucet' | 'sink'`. Every layout's `focus` has all seven parts. `lower` takes over the old `doors` camera; `upper` is new and points at a wall cabinet front.

## Scene

- `makeMaterials()`: `door` becomes `upper` and `lower`. Wall cabinet carcass and fronts use `upper`; everything else that used `door` uses `lower`.
- Picking: `upper` and `lower` map to their own parts, so a click on a wall cabinet opens the wall cabinet card.
- The sample slab on the showroom table that showed the door finish shows `lower`.
- `lookOf(part, picks)` = material look + picked colour.
- Textures stay baked per pattern + colour + size (light flecks on dark stone need the baked base). Dragging a colour picker creates a texture per colour, so the cache becomes a small least-recently-used cache that disposes what falls out.

## Interface

One component, `SurfacePicker`, used in the side panel, in the small-screen tab, and inside the focus card:

- a row of material buttons;
- a row of preset colour dots, then a "custom colour" dot;
- when custom is open: the browser's `<input type="color">` and a text field for `#rrggbb`.

The text field accepts six hex digits with or without `#`, any case. Anything else leaves the scene colour unchanged and marks the field invalid (`aria-invalid`, dark border, a one-line hint).

Selected-value text (panel legend, card header, hover label): material name, then the preset colour name or the hex code.

Small screens: the "cabinet doors" tab becomes two tabs, "wall cabinets" and "base cabinets".

## Not in this change

Saving choices between visits, shareable links, custom colour for faucet or sink, a hand-drawn colour picker, real manufacturer swatches.

## Checks

`npm run check:room` gains: every surface has unique material ids and named materials with notes; preset hexes match `HEX` and are unique per surface; `look: 'top'` only on the backsplash; every default material exists and every default colour matches `HEX`; every layout has focus for all seven parts.

Other gates unchanged: `tsc`, `check:filter`, `build`, `check:overflow`, the U+0E4E scan, and a browser pass at 1280 and 375 wide with draw calls read at the side view.

## Tasks

1. Data, scene, check script: the model above, `upper`/`lower` materials, new focus entries, texture cache bound. The page keeps working with preset dots only.
2. `SurfacePicker`, wired into panel, tabs and focus card; i18n strings; custom colour mode.
