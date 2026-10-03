// เช็กตรรกะตัวกรองหน้าสินค้ารวมกับข้อมูลสินค้าจริง: npm run check:filter
import assert from 'node:assert/strict';
import { products, filterProducts } from '../lib/products.ts';

const none = { category: [], series: [], material: [] };
const slugs = (picked) => filterProducts(products, { ...none, ...picked }).map((p) => p.slug);

// ไม่เลือกอะไร = ได้ทุกชิ้น
assert.equal(slugs({}).length, products.length);
// กลุ่มเดียว
assert.ok(slugs({ category: ['sink'] }).length > 0);
assert.ok(slugs({ category: ['sink'] }).every((s) => products.find((p) => p.slug === s).category === 'sink'));
// ในกลุ่มเดียวกัน = หรือ
const elateOrTaut = slugs({ series: ['Elate', 'Taut'] });
assert.ok(elateOrTaut.includes('elate-13963t-c4') && elateOrTaut.includes('taut-21366t-4'));
assert.ok(!elateOrTaut.includes('kumin-30946t-4'));
// ข้ามกลุ่ม = และ
assert.deepEqual(slugs({ category: ['sink'], material: ['castIron'] }), ['indio-3885x-2sd']);
assert.deepEqual(slugs({ category: ['faucet'], material: ['stainless'] }), []);
// สินค้าที่ไม่มีข้อมูลวัสดุไม่ผ่านตัวกรองวัสดุ
assert.ok(!slugs({ material: ['brass'] }).includes('kumin-99480t-4'));
assert.ok(slugs({ series: ['Kumin'] }).includes('kumin-99480t-4'));

console.log('ผ่าน: ตัวกรองสินค้า');
