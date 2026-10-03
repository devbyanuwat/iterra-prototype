// เช็กข้อมูลห้องจำลอง (lib/room.ts): npm run check:room
// ผังครัววาดจากตัวเลขล้วน ๆ ตัวเลขผิดนิดเดียวตู้จะซ้อนกันหรือลอยจากผนัง ด่านนี้จับก่อนเปิดเบราว์เซอร์
import assert from 'node:assert/strict';
import { PARTS, FAUCET_LOOKS, FAUCET_NOTES, FAUCET_SHAPES, SINKS, DEFAULT_PICKS, LIGHTS, LAYOUTS, BAY_PITCH, HALL, ORBIT, FOCUS, runLength } from '../lib/room.ts';
import { FAUCET } from '../lib/finishes.ts';

const named = (what, name) => assert.ok(name?.th?.trim() && name?.en?.trim(), `${what}: ต้องมีชื่อ th และ en`);
// คำอธิบายตัวเลือก: ครบสองภาษา ไม่มีไม้ตรีเพี้ยน (U+0E4E) ไม่มีขีดยาว
const noted = (what, note) => {
  named(what, note);
  for (const text of [note.th, note.en]) assert.ok(!/[\u0E4E\u2013\u2014]/.test(text), `${what}: note มีอักขระต้องห้าม`);
};
const unique = (what, ids) => assert.equal(new Set(ids).size, ids.length, `${what}: id ซ้ำ`);
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ── ตัวเลือกวัสดุ ──
for (const [part, options] of Object.entries(PARTS)) {
  unique(part, options.map((o) => o.id));
  for (const o of options) {
    named(`${part}.${o.id}`, o.name);
    noted(`${part}.${o.id}.note`, o.note);
    assert.ok(o.swatch, `${part}.${o.id}: ไม่มี swatch`);
    if (o.look === 'top') assert.equal(part, 'splash', `${part}.${o.id}: look 'top' ใช้ได้เฉพาะผนังกันเปื้อน`);
  }
  assert.ok(options.some((o) => o.id === DEFAULT_PICKS[part]), `${part}: ค่าเริ่มต้น ${DEFAULT_PICKS[part]} ไม่อยู่ในตัวเลือก`);
}
// สีก๊อกต้องตรงกับ lib/finishes.ts ทุกตัว ไม่ขาดไม่เกิน
assert.deepEqual(Object.keys(FAUCET_LOOKS).sort(), FAUCET.map((f) => f.id).sort(), 'FAUCET_LOOKS ไม่ตรงกับ FAUCET ใน lib/finishes.ts');
assert.ok(FAUCET_LOOKS[DEFAULT_PICKS.faucet], 'ค่าเริ่มต้นของก๊อกไม่อยู่ใน FAUCET_LOOKS');
assert.deepEqual(Object.keys(FAUCET_NOTES).sort(), FAUCET.map((f) => f.id).sort(), 'FAUCET_NOTES ไม่ตรงกับ FAUCET ใน lib/finishes.ts');
for (const [id, note] of Object.entries(FAUCET_NOTES)) noted(`faucet.${id}.note`, note);
// ทรงก๊อกและซิงก์: id ต้องตรงกับที่ kitchen.ts ปั้น (userData.faucet / userData.sink)
for (const [what, shapes, ids, pick] of [['faucetShape', FAUCET_SHAPES, ['gooseneck', 'square', 'spring'], DEFAULT_PICKS.faucetShape], ['sink', SINKS, ['single', 'double', 'round'], DEFAULT_PICKS.sink]]) {
  assert.deepEqual(shapes.map((s) => s.id), ids, `${what}: id ไม่ตรงกับทรงที่ปั้นไว้`);
  shapes.forEach((s) => (named(`${what}.${s.id}`, s.name), noted(`${what}.${s.id}.note`, s.note)));
  assert.ok(ids.includes(pick), `${what}: ค่าเริ่มต้นไม่อยู่ในตัวเลือก`);
}

// ── แสง ──
unique('LIGHTS', LIGHTS.map((l) => l.id));
assert.deepEqual(LIGHTS.map((l) => l.id), ['day', 'warm', 'cool', 'night']);
LIGHTS.forEach((l) => named(`light.${l.id}`, l.name));
// ไฟติดพร้อมกันไม่เกิน 6 ดวง: hemi 1 + ไฟใต้ตู้ 4 + (แดด หรือ ไฟเพดาน) 1
for (const l of LIGHTS) {
  const on = [l.sun, l.hemi].filter((v) => v > 0).length + (l.led > 0 ? 4 : 0);
  assert.ok(on <= 6, `light.${l.id}: ไฟติดพร้อมกัน ${on} ดวง เกิน 6`);
}

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

  // มุมเจาะดูชิ้นส่วน: ครบ 5 หมวด อยู่ในขอบเขตกล้อง และจุดชี้อยู่ในครัวของตัวเอง
  assert.deepEqual(Object.keys(layout.focus).sort(), ['doors', 'faucet', 'floor', 'sink', 'splash', 'top'], `${at}: focus ต้องมีครบทุกหมวด`);
  const reach = Math.max(Math.abs(back.x), Math.abs(backEnd));
  for (const [part, f] of Object.entries(layout.focus)) {
    const where = `${at} focus.${part}`;
    assert.ok(f.distance >= FOCUS.zoomMin && f.distance <= FOCUS.zoomMax, `${where}: distance เกินขอบเขต`);
    assert.ok(f.polar >= ORBIT.polarMin && f.polar <= ORBIT.polarMax, `${where}: polar เกินขอบเขต`);
    assert.ok(Math.abs(f.azimuth) + FOCUS.azimuth <= ORBIT.azimuth, `${where}: หมุนสุดแล้วเกิน 90 องศา`);
    const [x, y, z] = f.at;
    assert.ok(Math.abs(x) <= reach && y >= 0 && y <= 2.4 && z >= 0 && z <= HALL.depth, `${where}: จุดชี้อยู่นอกครัว`);
  }
});

// กล้องซูมออกสุดแล้วหมุนไปด้านข้าง ต้องไม่เข้าไปอยู่ในตู้ของครัวข้าง ๆ
assert.ok(BAY_PITCH - ORBIT.zoomMax >= halfWidth, `bay ชิดกันเกินไป: ${BAY_PITCH} - ${ORBIT.zoomMax} < ${halfWidth}`);
assert.ok(HALL.width >= 2 * (BAY_PITCH + halfWidth), 'ห้องสั้นกว่าครัว 3 ชุด');

console.log('ผ่าน: ข้อมูลห้องจำลอง');
