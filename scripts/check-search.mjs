// เช็กการค้นหาในเว็บ (lib/search.ts) กับข้อมูลจริง: npm run check:search
import assert from 'node:assert/strict';
import { buildIndex, search, GROUPS } from '../lib/search.ts';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { PAGES } from '../lib/i18n.ts';

const projects = [];
const index = buildIndex({ products, posts, projects, pages: PAGES });
const hrefs = (q) => search(index, q).map((e) => e.href);

// ดัชนีครบทุกรายการ
assert.equal(index.length, products.length + posts.length + projects.length + PAGES.length);
for (const p of products) assert.ok(index.some((e) => e.href === `/products/${p.slug}/`), `ไม่มีสินค้า ${p.slug}`);
for (const p of posts) assert.ok(index.some((e) => e.href === `/articles/${p.slug}/`), `ไม่มีบทความ ${p.slug}`);
assert.ok(PAGES.some((p) => p.href === '/room/'), 'หน้าเว็บต้องมี /room/');
assert.ok(index.every((e) => GROUPS.includes(e.group) && e.title.th && e.title.en));

// ไทย และอังกฤษ (ไม่สนตัวพิมพ์)
assert.ok(hrefs('ซิงก์').includes('/products/toccata-3644x-2kd/'));
assert.ok(hrefs('ELATE').includes('/products/elate-13963t-c4/'));
// ทุกคำต้องตรง
assert.deepEqual(hrefs('indio cast-iron'), ['/products/indio-3885x-2sd/']);
assert.deepEqual(hrefs('indio stainless'), []);
// ตรงชื่อมาก่อนตรงเนื้อหา
const kitchen = search(index, 'ครัว').filter((e) => e.group === 'articles');
const inTitle = (e) => e.title.th.includes('ครัว');
assert.ok(kitchen.findIndex((e) => !inTitle(e)) === -1 || kitchen.findIndex((e) => !inTitle(e)) > kitchen.findLastIndex(inTitle));
// จำกัดจำนวนต่อกลุ่ม
assert.ok(search(index, 'kohler', 2).filter((e) => e.group === 'products').length <= 2);
// ไม่พบ · ช่องว่างล้วน · อักขระพิเศษ
assert.deepEqual(hrefs('zzzzqqq'), []);
assert.deepEqual(hrefs('   '), []);
assert.deepEqual(hrefs(''), []);
assert.doesNotThrow(() => search(index, '( + [ \\ *'));
// หน้าเว็บ
assert.ok(hrefs('studio').includes('/room/'));
assert.ok(hrefs('ติดต่อ').includes('/contact/'));

console.log('ผ่าน: การค้นหา');
