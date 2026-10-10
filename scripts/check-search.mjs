// เช็กการค้นหาในเว็บ (lib/search.ts) กับข้อมูลจริง: npm run check:search
import assert from 'node:assert/strict';
import { buildIndex, search, GROUPS } from '../lib/search.ts';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { PAGES } from '../lib/i18n.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT, shouldShow, markSeen } from '../lib/announcement.ts';
import { CONSENT_KEY, ALL, NONE, parseConsent, readConsent, writeConsent } from '../lib/consent.ts';

const index = buildIndex({ products, posts, projects, pages: PAGES });
const hrefs = (q) => search(index, q).map((e) => e.href);

// ดัชนีครบทุกรายการ
assert.equal(index.length, products.length + posts.length + projects.length + PAGES.length);
for (const p of products) assert.ok(index.some((e) => e.href === `/products/${p.slug}/`), `ไม่มีสินค้า ${p.slug}`);
for (const p of posts) assert.ok(index.some((e) => e.href === `/articles/${p.slug}/`), `ไม่มีบทความ ${p.slug}`);
assert.ok(!index.some((e) => e.href.endsWith('/room/')), 'หน้าจำลองห้องครัวซ่อนไว้ ต้องไม่อยู่ในผลค้นหา');
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
assert.deepEqual(hrefs('studio'), []);
assert.ok(hrefs('ติดต่อ').includes('/contact/'));

// ── ผลงาน ──
assert.equal(projects.length, 6);
assert.equal(new Set(projects.map((p) => p.slug)).size, projects.length);
for (const p of projects) {
  assert.ok(index.some((e) => e.href === `/projects/#${p.slug}`), `ไม่มีผลงาน ${p.slug}`);
  for (const n of [p.name, p.location, p.type]) assert.ok(n.th.trim() && n.en.trim() && !/[\u0E4E\u2013\u2014]/.test(n.th + n.en));
  assert.ok(p.image.startsWith('/media/') && p.year > 2000);
  assert.ok(p.products.length > 0);
  for (const slug of p.products) assert.ok(products.some((x) => x.slug === slug), `${p.slug}: ไม่มีสินค้า ${slug}`);
}
assert.ok(hrefs('เขาใหญ่').includes('/projects/#khao-yai-villa'));
assert.ok(hrefs('penthouse').includes('/projects/#sukhumvit-penthouse'));
assert.ok(PAGES.some((p) => p.href === '/projects/'), 'เมนูต้องมี /projects/');

// ── ประกาศตอนเข้าเว็บ (อยู่ในด่านเดียวกัน: ตรรกะสั้น ไม่คุ้มแยกสคริปต์) ──
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
const on = { enabled: true, id: 'a1' };
const s = mem();
assert.equal(shouldShow(on, s), true);
markSeen('a1', s);
assert.equal(shouldShow(on, s), false);
assert.equal(shouldShow({ enabled: true, id: 'a2' }, s), true); // id ใหม่ = แสดงอีกครั้ง
assert.equal(shouldShow({ enabled: false, id: 'a3' }, s), false);
assert.equal(shouldShow(on, null), true); // ไม่มี storage: แสดงทุกครั้งที่โหลดหน้า
assert.equal(shouldShow(on, broken), true);
assert.doesNotThrow(() => markSeen('a1', broken));
assert.ok(ANNOUNCEMENT.id && ANNOUNCEMENT.image.startsWith('/media/'));
for (const n of [ANNOUNCEMENT.title, ANNOUNCEMENT.body, ANNOUNCEMENT.cta.label]) assert.ok(n.th.trim() && n.en.trim() && !/[\u0E4E\u2013\u2014]/.test(n.th + n.en));

// ── ตัวเลือกคุกกี้ ──
assert.equal(parseConsent(null), null); // ยังไม่เคยเลือก = ต้องถาม
for (const bad of ['', 'x', '{}', '[]', 'null', '{"analytics":"yes","marketing":true}', '{"analytics":true}']) assert.equal(parseConsent(bad), null, `ค่าเสีย ${bad} ต้องถามใหม่`);
assert.deepEqual(parseConsent('{"analytics":true,"marketing":false,"extra":1}'), { analytics: true, marketing: false });
assert.deepEqual(NONE, { analytics: false, marketing: false });
assert.deepEqual(ALL, { analytics: true, marketing: true });
const cs = mem();
assert.equal(readConsent(cs), null);
writeConsent(NONE, cs);
assert.deepEqual(readConsent(cs), NONE); // ปฏิเสธแล้วจำไว้ ไม่ถามซ้ำ และสถิติปิด
writeConsent({ analytics: true, marketing: false }, cs);
assert.deepEqual(JSON.parse(cs.getItem(CONSENT_KEY)), { analytics: true, marketing: false });
assert.equal(readConsent(null), null);
assert.equal(readConsent(broken), null);
assert.doesNotThrow(() => writeConsent(ALL, broken));

console.log('ผ่าน: การค้นหา ประกาศ และคุกกี้');
