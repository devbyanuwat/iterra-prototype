// เช็คว่าภาพจำลองถูกจับคู่กับสินค้าถูกชิ้น
// ลำดับคำใน KEYWORDS เปราะ: 'เตาอบ' ต้องมาก่อน 'เตา' ไม่งั้นเตาอบจะได้รูปเตาไฟ
// เช่นเดียวกับ 'อ่างอาบน้ำ' ต้องมาก่อน 'อ่าง'
//
// รัน: npm run build && node scripts/check-artwork.mjs

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const EXPECTED = [
  ['out/products/sink-pro-duo/index.html', 'sink'],
  ['out/products/faucet-pullout-arc/index.html', 'faucet'],
  ['out/products/induction-flex-90/index.html', 'hob'],
  ['out/products/oven-steam-pro/index.html', 'oven'],
  ['out/products/hood-slim-t90/index.html', 'hood'],
  ['out/products/dishwasher-s14/index.html', 'dishwasher'],
  ['out/products/smart-toilet-one/index.html', 'toilet'],
  ['out/products/rain-shower-cloud/index.html', 'shower'],
  ['out/products/basin-stone-oval/index.html', 'basin'],
  ['out/products/bathtub-freestand-arc/index.html', 'bathtub'],
  ['out/products/builtin-kitchen-set/index.html', 'kitchen'],
  ['out/about/index.html', 'interior'],
];

let failed = 0;

for (const [file, kind] of EXPECTED) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const found = [...html.matchAll(/data-art="([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(found.length > 0, `${file}: ไม่พบ <svg data-art> เลย — Placeholder อาจไม่ได้เรนเดอร์`);
  if (!found.includes(kind)) {
    console.error(`FAIL ${file}\n  คาดว่าจะเจอ "${kind}" แต่เจอ: ${[...new Set(found)].join(', ')}`);
    failed += 1;
  }
}

// ห้ามทุกภาพหน้าตาเหมือนกันหมด — ถ้า resolveKind พังจะตกมาที่ 'abstract' ทั้งเว็บ
const home = readFileSync(new URL('../out/index.html', import.meta.url), 'utf8');
const kinds = new Set([...home.matchAll(/data-art="([a-z]+)"/g)].map((m) => m[1]));
assert.ok(kinds.size >= 3, `หน้าแรกมีภาพแค่ ${kinds.size} แบบ — resolveKind น่าจะตกไป abstract หมด`);

// 'abstract' คือกรณีไม่มีคำไหนแมตช์เลย ตอนนี้ทุกป้ายมีคำครอบหมดแล้ว
// ถ้าเพิ่มสินค้า/บทความใหม่แล้วเช็คนี้แดง แปลว่าลืมเติมคำใน KEYWORDS
const strays = execSync('grep -rlo \'data-art="abstract"\' out || true', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
assert.equal(
  strays.length,
  0,
  `มีภาพที่ไม่มีคำแมตช์ ตกไปใช้รูป fallback ในไฟล์:\n  ${strays.join('\n  ')}\n  แก้โดยเติมคำใน KEYWORDS ที่ components/artwork.tsx`,
);

if (failed) {
  console.error(`\n${failed} รายการไม่ผ่าน`);
  process.exit(1);
}
console.log(`ผ่านทั้งหมด ${EXPECTED.length} รายการ · หน้าแรกมีภาพ ${kinds.size} แบบ`);
