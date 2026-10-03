# Kitchen studio: part focus mode — design

Date: 2026-10-04 · Branch: `room-studio` · Requested in chat by anuwat ("we sell products": a guide line that points
out of an object on hover or click, a description, a zoom into a narrow camera with the description, and colour and
material choices inside that narrow view). Design approved in chat ("ทำได้"). Extends
`2026-10-03-room-studio-design.md`. This is job B of two; job A (dress the hall as a gallery showroom: skirting,
ceiling, track lights, partitions, layout signs, counter props, furniture, a window) gets its own spec afterwards.

## Goal

A visitor points at a part of the kitchen and sees what it is. A click takes the camera close to that part and shows
a card on the scene with a short description and the colour choices, so the visitor compares materials while looking
at the part up close. The side panel stays and stays in sync.

## Parts

The five changeable parts of the existing page: doors, countertop, backsplash, floor, faucet. Fixed parts (hob, oven,
sink, handles, walls) do not respond. Choices are still shared by the three kitchens.

## Behaviour

**Hover (mouse only).** The part's material brightens (as today). A dot sits on the part's anchor in the kitchen being
viewed; a thin line with one right-angle elbow runs from the dot to a label reading "part · current choice"
("ท็อปเคาน์เตอร์ · ควอตซ์เทา"). The label sits at a fixed offset up and to the side of the anchor, flipped to the
other side when it would leave the scene. This replaces the label that follows the pointer. Leaving the part removes
dot, line and label.

**Click or tap** (under 5 px of movement, so a drag still orbits). The camera flies to that part's close view in the
kitchen being viewed (1.2 s, same curve as the layout flight; a jump under reduced motion). The focus card appears.
This replaces "click scrolls the side panel", added on 2026-10-03.

**Focus card** (HTML over the scene, not a 3D object):

- part name (small label), current choice name, a description of the current choice (one or two short lines);
- the same colour dots as the side panel for that part (`aria-pressed`, name as `aria-label`), 44 px targets;
- the faucet keeps its "Sample finish" tag for the three demo finishes;
- a "กลับมุมกว้าง / Back to full view" button.

Choosing a dot changes the scene, the description and the side panel at once (one `picks` state). While focused the
dot and line stay, running from the anchor to the card's nearest edge.

**While focused.** Drag orbits within 35 degrees each side of the close view; zoom is clamped between 1.2 m and
3.2 m. Clicking another part flies to that part. Hover labels are off (the card already names the part).

**Leaving focus.** The back button, `Esc` (when the scene or the card has focus), a layout button, or "Reset view".
The camera flies back to the kitchen's home view; a layout button flies to the new kitchen's home view.

**Focus management.** On entering, keyboard focus moves to the pressed dot in the card. On leaving, it returns to
the scene. The side panel remains a complete keyboard path to every choice; focus mode adds nothing a keyboard user
cannot reach there.

**Layout of the card.** `lg` and up: bottom-left of the scene, 300 px wide, `bg-paper`, 1 px `warm-300` border, sharp
corners, no shadow. Below `lg`: a strip along the bottom edge of the scene, full width, with the part and choice name on the first row, the dots
and the back button on the second row and the description under them. The view shifts up by half the strip's height so
the focused part stays clear of it. The sticky scene height does not
change.

## Data (`lib/room.ts`, still import-free, MOCK)

- `Option` gains `note: Name`: the description of that choice, Thai and English, one or two short lines, written for a
  homeowner (what it feels like, how it wears, how to care for it). No prices, no brand claims, no numbers that
  could be read as a specification.
- `FAUCET_NOTES: Record<string, Name>` for the four faucet finishes (names and swatches stay in `lib/finishes.ts`).
- `Part = keyof Picks` moves here from `RoomScene.tsx`. `Layout` gains `focus: Record<Part, Focus>` with
  `Focus = { at: [x, y, z]; azimuth: number; polar: number; distance: number }`. `at` is the anchor (dot position and
  camera target) in bay coordinates: x from the bay centre, y up, z out of the back wall.
- `FOCUS = { azimuth: 0.61, zoomMin: 1.2, zoomMax: 3.2 }` (orbit half-range in radians, zoom in metres).

Anchors are picked by hand per kitchen: a door near the middle of the back run, the open stretch of countertop
beside the hob, the backsplash above it, a floor point in front of the kitchen, the faucet. The controller tunes them
in the browser.

## Checks (`scripts/check-room.mjs`)

- every option of every part and every faucet finish has `note.th` and `note.en`, non-empty, no U+0E4E, no em-dash
  or en-dash;
- every layout has a focus entry for all five parts; `distance` is inside `FOCUS.zoomMin..zoomMax`; `polar` is
  inside `ORBIT.polarMin..polarMax`; `azimuth ± FOCUS.azimuth` stays inside `±ORBIT.azimuth`;
- every anchor lies inside its bay (|x| ≤ half the bay's width, 0 ≤ z ≤ `HALL.depth`, 0 ≤ y ≤ 2.4).

## Code

| file | change |
|---|---|
| `lib/room.ts` | `note` on options, `FAUCET_NOTES`, `Focus`, `FOCUS`, `focus` per layout |
| `scripts/check-room.mjs` | the checks above |
| `components/room/RoomScene.tsx` | prop `focus: Part \| null`; flight to and from the close view; orbit and zoom limits switch with focus; projects the anchor to screen each rendered frame and writes it to the overlay; `onPick` now means "focus this part"; the pointer-following label is removed |
| `components/room/FocusCard.tsx` (new) | the card: names, description, dots, back button. No three.js. |
| `components/room/RoomContent.tsx` | `focus` state; renders the card and the overlay (dot, line, hover label); `Esc`; clears focus on layout change and reset; the click-scrolls-the-panel code and its flash are removed |
| `lib/i18n.ts` | `room.back`, updated `room.help` and `room.sceneLabel` |
| `docs/room/room-usage-flow.html` + `.png` | the "click a part" box now reads focus mode |

The line is an SVG `<polyline>` in an overlay the size of the scene, `pointer-events: none`, stroke `ink` 1 px on a
2 px `paper` under-stroke so it reads on dark and light materials. The scene writes the anchor's screen position
straight to the DOM (no React state per frame).

## Verification

`npx tsc --noEmit`, `npm run build`, `npm run check:room`, `npm run check:overflow`, the U+0E4E scan. Browser at 1200
and 375 px, Thai and English: hover each of the five parts in each kitchen (dot on the part, label inside the scene);
click each part (camera lands with the part in frame and not hidden behind the card); change every option from the
card and see scene, description and side panel agree; orbit and zoom stop at the focus limits; back button, `Esc`,
layout button and reset all leave focus; a drag never enters focus; console clean. Not verifiable in the browser
pane: reduced motion, a real phone.

## Decisions made without asking (say so in review if any is wrong)

1. The card and the label are HTML over the scene, not 3D objects (sharp Thai text, real buttons).
2. Click enters focus mode; it no longer scrolls the side panel.
3. One anchor per part per kitchen, not per cabinet: the line always points at the same door.
4. Descriptions are sample copy written by the assistant and marked MOCK; the owner replaces them.
5. Touch has no hover step; a tap goes straight to focus.

## Out of scope

Dressing the hall (job A), linking parts to Kohler products or the product pages, prices, focusing fixed parts (hob,
oven, sink), per-kitchen materials, 3D text, a tour that visits parts automatically, saving a configuration, PR,
merge, deploy.

## Addendum 2026-10-04: faucet and sink shapes, motion

Requested in chat by anuwat during execution ("ลองปั้นก๊อกและซิงก์ในแต่ละรูปแบบ แล้วให้ user เลือกเปลี่ยนได้", then
"ใส่ motion ultrasmooth"). Built without a separate approval round because both arrived with or during "ลุยเลย".

- **Shapes.** `FAUCET_SHAPES` (gooseneck, square, spring) and `SINKS` (single, double, round) in `lib/room.ts`, names and
  notes in Thai and English, MOCK. `Picks` gains `faucetShape` and `sink`. All shapes are built once in `kitchen.ts`
  and `RoomScene` shows the chosen one. They are sample forms, not models on sale; the page note says so.
- **Sink is now a focusable part** (this replaces "sink" in the list of fixed parts and in Out of scope). Its card has
  shape buttons and no colour dots. The faucet card has both colour dots and shape buttons. The side panel has two new
  groups, "Faucet shape" and "Sink".
- **The faucet has an invisible hit box** around its stem so a thin spout is easy to click.
- **Motion.** Flights last 1.4 s and ease in and out (this replaces 1.2 s). The zoom and rotate buttons glide over
  0.5 s. The card rises in over 0.5 s, the guide line and label fade, and a newly chosen faucet settles onto the
  counter. Under reduced motion everything still jumps.
- Not done: a cross-fade between materials when a colour changes (the swap is instant), and a transition for the sink
  shape (its countertop cut-out changes with it).
