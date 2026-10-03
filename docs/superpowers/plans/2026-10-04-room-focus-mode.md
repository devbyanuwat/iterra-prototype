# Kitchen studio part focus mode — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/room/`, pointing at a part shows a leader line and a label; clicking it flies the camera close and shows a card on the scene with a description and the colour choices.

**Architecture:** Descriptions and close-view camera data live in `lib/room.ts` and are checked by `check:room`. `RoomScene` gets a `focus` prop, flies to the close view, switches orbit limits, and draws the leader line into an SVG overlay after every rendered frame. `FocusCard` is a plain React component rendered by `RoomContent`, which owns the `focus` state.

**Tech Stack:** Next.js 16.3 static export, React 19, Tailwind 3.4, three@0.170 (already installed). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-04-room-focus-mode-design.md` (extends `2026-10-03-room-studio-design.md`).

## Global Constraints

- Branch `room-studio`. No PR, no merge, no push to `main`. Push to `origin room-studio` is done by the controller, not by a task implementer.
- three.js only in `components/room/RoomScene.tsx`, `kitchen.ts`, `textures.ts`. `FocusCard.tsx` and `RoomContent.tsx` import no three.js. `lib/room.ts` imports nothing.
- No new dependency.
- Light theme tokens only (`paper`, `ink`, `warm-*`, `stone-600`); sharp corners; circles only for colour dots; every button has visible focus and pressed states.
- No em-dash or en-dash and no U+0E4E in any rendered string.
- The code for both tasks is delivered as patches that were type-checked and run against `check:room` in a scratch copy: `docs/superpowers/plans/2026-10-04-room-focus-mode/task-1.patch` and `task-2.patch`. Apply them with `git apply`; do not retype them (they contain Thai text). If a patch does not apply, stop and report; do not hand-merge.
- Gates for every task: `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` prints nothing; `npm run check:room`; `npm run check:filter`; `npm run build`; `npm run check:overflow` (the dev server on port 4100 is already running; do not start or stop one); `perl -CSD -ne 'print "$ARGV:$.\n" if /\x{0E4E}/; close ARGV if eof' lib/room.ts lib/i18n.ts components/room/*.tsx` prints nothing.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Descriptions and close-view data, checked

**Files:**
- Modify: `lib/room.ts`, `scripts/check-room.mjs` (both through `task-1.patch`)

**Interfaces:**
- Produces, all exported from `lib/room.ts`:
  - `Option` gains `note: Name`
  - `FAUCET_NOTES: Record<string, Name>` (keys `chrome`, `black`, `brass`, `steel`)
  - `type Part = keyof Picks` (`'doors' | 'top' | 'splash' | 'floor' | 'faucet'`)
  - `type Focus = { at: [number, number, number]; azimuth: number; polar: number; distance: number }`
  - `FOCUS = { azimuth: 0.61, zoomMin: 1.2, zoomMax: 3.2 }`
  - `Layout` gains `focus: Record<Part, Focus>`
- After this task `components/room/RoomScene.tsx` still exports its own `Part`; that is fine and Task 2 removes it. The repo type-checks at this commit.

- [ ] **Step 1: Apply the patch**

```bash
git apply --check docs/superpowers/plans/2026-10-04-room-focus-mode/task-1.patch
git apply docs/superpowers/plans/2026-10-04-room-focus-mode/task-1.patch
```

- [ ] **Step 2: Run the check, expect pass**

Run: `npm run check:room`
Expected: last line `ผ่าน: ข้อมูลห้องจำลอง`

- [ ] **Step 3: Prove the new assertions are real (red, then restore)**

In `lib/room.ts`, in the `i` layout's `focus`, change `faucet: { at: [-0.2, 1.1, 0.07], azimuth: 0.4, polar: 1.3, distance: 1.4 }` to `distance: 0.9`.
Run: `npm run check:room`
Expected: FAIL with a message containing `layout i focus.faucet: distance เกินขอบเขต`.
Edit `0.9` back to `1.4`, then confirm `git diff --stat` lists only `lib/room.ts` and `scripts/check-room.mjs` and `npm run check:room` passes again.

- [ ] **Step 4: Run all gates** (Global Constraints)

- [ ] **Step 5: Commit**

```bash
git add lib/room.ts scripts/check-room.mjs
git commit -m "feat: describe each studio material and the close view of every part" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Leader line, focus flight and the focus card

**Files:**
- Modify: `components/room/RoomScene.tsx`, `components/room/RoomContent.tsx`, `lib/i18n.ts`
- Create: `components/room/FocusCard.tsx`
- (all four through `task-2.patch`)

**Interfaces:**
- Consumes from Task 1: `FOCUS`, `FAUCET_NOTES`, `type Part`, `Layout.focus`, `Option.note`.
- `RoomScene` props become `{ layout, focus: Part | null, picks, light, label, tipText, onPick, onReady, onError }`; `RoomHandle` gains `focusScene(): void`; `RoomScene` no longer exports `Part`.
- `FocusCard` props: `{ part: string; title: string; name: string; tag?: string; note: string; choices: { id: string; label: string; swatch: string }[]; value: string; onChange(id: string): void; back: string; onBack(): void }`. Its root element carries `data-focus-card`, which `RoomScene` looks up to end the leader line at the card.
- `lib/i18n.ts`: new key `room.back` in both languages; `room.help` and `room.sceneLabel` reworded.

What the patch does, for the reviewer:
- `goTo(id, part, jump)` replaces `goTo(id, jump)`: with a part it flies to `layout.focus[part]` and sets the orbit and zoom limits to `FOCUS` around that view; without one it flies to the home view and restores `ORBIT`. Lights move only when the kitchen changes.
- `drawGuide()` runs after every `renderer.render`: projects the anchor of the focused part (or, when not focused, the hovered part) and writes the dot, the two polylines and the label position straight to the DOM.
- The pointer-following label, the click-scrolls-the-panel code and its flash (added 2026-10-03) are removed.
- `RoomContent` owns `focus`; `Esc` on the scene wrapper, the card's back button, a layout button and "Reset view" all clear it.

- [ ] **Step 1: Apply the patch**

```bash
git apply --check docs/superpowers/plans/2026-10-04-room-focus-mode/task-2.patch
git apply docs/superpowers/plans/2026-10-04-room-focus-mode/task-2.patch
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v '\.next/types'`
Expected: no output.

- [ ] **Step 3: Confirm the removed code is gone and three.js stayed where it belongs**

Run: `grep -n "jumpTo\|scrollIntoView\|flash" components/room/RoomContent.tsx; grep -ln "from 'three" components/room/*.tsx components/room/*.ts`
Expected: the first grep prints nothing; the second prints `RoomScene.tsx`, `kitchen.ts`, `textures.ts` only.

- [ ] **Step 4: Run all gates** (Global Constraints)

- [ ] **Step 5: Commit**

```bash
git add components/room/RoomScene.tsx components/room/RoomContent.tsx components/room/FocusCard.tsx lib/i18n.ts
git commit -m "feat: point at a studio part for a guide line and click it for a close view with choices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

There is no automated test for the scene: it needs WebGL. The controller verifies it in the browser after this task (spec, Verification) and tunes anchors, camera views and card placement in `lib/room.ts` and the two components, in a follow-up commit `fix: tune the studio close views`.

---

### After the tasks (controller)

- Browser checks from the spec at 1200 and 375 px, Thai and English.
- Update `docs/room/room-usage-flow.html` and re-export the PNG: the box "ชี้หรือกดชิ้นส่วนในฉาก / แผงเลื่อนไปหมวดของชิ้นนั้น" becomes "ชี้หรือกดชิ้นส่วนในฉาก / กล้องเข้าใกล้ การ์ดขึ้นบนฉาก", and the arrow to "เลือกสีและวัสดุ" stays.
- Add one line to `2026-10-03-room-studio-design.md` pointing at the focus-mode spec where it describes clicking a part.
