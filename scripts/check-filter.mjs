// เช็กตรรกะตัวกรองหน้าสินค้ารวมกับข้อมูลสินค้าจริง: npm run check:filter
import assert from 'node:assert/strict';
import { products, CATEGORIES } from '../lib/products.ts';
import { filterProducts, facetOptions, SUB_FACETS } from '../lib/product-filters.ts';

const none = { category: [], series: [], material: [], brand: [] };
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

// 7 หมวด · แบรนด์แสดงเฉพาะหมวดที่มีหลายผู้ผลิต
assert.equal(CATEGORIES.length, 7);
assert.ok(SUB_FACETS(true).includes('brand'));
assert.ok(!SUB_FACETS(false).includes('brand'));
assert.ok(CATEGORIES.find((c) => c.key === 'faucet').multiBrand && !CATEGORIES.find((c) => c.key === 'wardrobe').multiBrand);
// ตัวเลือกนับเฉพาะหมวดที่เลือก: ซีรีส์ของอ่างไม่โผล่ในก๊อก · หมวดที่ยังไม่มีสินค้า = ไม่มีตัวเลือก
assert.ok(!facetOptions(products, 'faucet', 'series').some(([v]) => v === 'Toccata'));
assert.deepEqual(facetOptions(products, 'wardrobe', 'series'), []);
assert.deepEqual(slugs({ category: ['wardrobe'] }), []);
assert.equal(slugs({ brand: ['KOHLER'] }).length, products.length);

console.log('ผ่าน: ตัวกรองสินค้า');
