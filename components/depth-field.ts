// ข้อมูลของ "สนามภาพเชิงลึก" (spec 2026-09-01-kohler-depth-field §4)
//
// ลูกค้าชี้ michaelgatt.com — ภาพกระจายอยู่ในอวกาศ ซูมเข้ามาจากข้างนอก เดินดูด้วยเมาส์
// เว็บเขาเป็น WebGL2 + three.js: canvas เดียว `<img>` ศูนย์ตัว (§2)
// เราไม่ทำแบบนั้นด้วยเหตุผลที่ §3 เขียนไว้เจาะจงกับเว็บนี้ ไม่ใช่แบบลอย ๆ —
// เว็บเราเป็นแคตตาล็อกสินค้า 182 ชิ้นที่ต้องถูกค้นเจอและใช้คีย์บอร์ดได้
// canvas ไม่มี alt ไม่มี lazy load crawler มองไม่เห็น และไม่มี DOM ให้โฟกัสเกาะ
//
// ไฟล์นี้เป็นข้อมูลล้วน ไม่มี 'use client' — server component import ตรง ๆ ได้
// เหตุผลเดียวกับ wall-products.ts: ตัวสนาม (DepthField) เป็น client component
// ถ้ามัน import lib/products (424KB) เอง แคตตาล็อกทั้งก้อนจะกลายเป็น client chunk
//
// ── ทำไมประตูเข้าถึงต้องรับข้อมูลผ่าน <script type="application/json"> ──
// Preloader อยู่ใน app/layout.tsx จึงอยู่ "ทุกหน้า" การให้มัน import โมดูลนี้
// แปลว่า /about กับ /contact ต้องโหลดแคตตาล็อก + คลังไลฟ์สไตล์ทั้งก้อนเพื่อโชว์
// หน้าโหลด ซึ่งย้อนแย้งในตัวเอง (เหตุผลเดียวกับที่ Preloader เคยอ่าน src จาก DOM
// ของกำแพงแทนการ import ข้อมูล) app/page.tsx ซึ่งเป็น server component จึงเป็น
// คนคำนวณชุดระนาบแล้วฝากไว้ใน HTML ให้ Preloader อ่าน — หน้าที่ไม่มี seed
// ก็ไม่มีสนาม ซึ่งถูกแล้ว: สนามมีไว้โฆษณาหน้าถัดไป

import { finishIndex, finishOf } from './finish-index';
import { WALL_PANEL_PRODUCTS } from './wall-products';
import { lifestyleByCategory } from '@/lib/lifestyle';

/** id ของ <script type="application/json"> ที่ app/page.tsx ฝากชุดระนาบไว้ให้ Preloader */
export const DEPTH_SEED_ID = 'depth-field-seed';

export type FieldPlane = {
  id: string;
  /** ไฟล์ 700 (สินค้า) หรือ 900 (ห้อง) เท่านั้น — §5 ข้อ 6 ห้าม 1400/1800 */
  src: string;
  alt: { th: string; en: string };
  /**
   * ห้องอยู่ชั้นลึกทำหน้าที่ฉากหลัง · สินค้าพื้นโปร่งอยู่ชั้นหน้า
   * (ความเสี่ยง §7 ข้อ 4 — รูปสองชนิดในสนามเดียวกันจะดูมั่วถ้าอยู่ชั้นเดียวกัน)
   */
  kind: 'product' | 'room';
  /** สนามแกลเลอรีเท่านั้น: ปลายทางพร้อมเฉดที่เห็นอยู่ (§4.2) */
  href?: string;
  title?: { th: string; en: string };
  sub?: { th: string; en: string };
  model?: string;
};

/**
 * §7 ข้อ 1: 40 ระนาบใต้ preserve-3d = compositing layer เยอะ
 * ของ michaelgatt วัดได้ ~40 ระนาบ สเปกให้เพดานไว้ 40–60 เราอยู่ที่ขอบล่าง
 * แล้ววัด FPS จริงแทนการเดา (ตัวเลขที่วัดได้อยู่ในรายงานท้ายงาน)
 */
// สเปกให้ช่วงไว้ 40–60 ระนาบ — เดิมอยู่ที่ 40 ซึ่งเป็นขอบล่าง
// รอบนี้ขยับขึ้นเพราะระนาบถูกกดขนาดลงเพื่อ AC ข้อ 7 (ดูหมายเหตุ `apparent` ใน
// DepthField) ความหนาแน่นที่หายไปจากขนาดต้องได้คืนมาจากจำนวน
export const ENTRY_PLANES = 58;
export const GALLERY_PLANES = 48;

/**
 * ระนาบที่ "สนามของ /gallery" แสดงจริง — น้อยกว่าชุดของหน้า (task D1)
 *
 * กล่องสนามที่ 1440 มีพื้นที่ราว 1310×700 = 917,000 px² ระนาบที่อ่านออกว่าเป็น
 * สินค้าชิ้นหนึ่งต้องกว้างราว 150px (สูง ~190 เมื่อเป็นการ์ดแนวตั้ง) = ~29,000 px²
 * ต่อใบ 48 ใบจึงกินพื้นที่ 1.4 ล้าน px² — มากกว่ากล่องทั้งใบ 1.5 เท่า **ก่อน**
 * จะเว้นช่องว่างระหว่างใบสักพิกเซลเดียว การซ้อนทับจึงไม่ใช่ผลของการจัดวางที่แย่
 * มันเป็นผลลัพธ์ทางเลขคณิตของการยัด 48 ใบลงในกล่องเดียว
 *
 * 18 ใบในกริด 6×3 ให้ช่องละ ~198×213px ซึ่งใหญ่พอให้ระนาบทั้งใบอยู่ในช่องของตัวเอง
 * และเหลือขอบว่างให้ตาแยกออกว่าเป็นคนละชิ้น
 *
 * **ดัชนียังเป็นชุดเต็ม 48 รายการ** ไม่ได้หดตาม: ดัชนีคือทางออกสำหรับคนที่หาของ
 * เฉพาะเจาะจง การตัดมันให้สั้นลงเพราะสนามวาดไม่ไหวคือการลงโทษผิดตัว
 * ทุกใบในสนามอยู่ในดัชนีเสมอ (สนามคือ 18 ใบแรกของชุดเดียวกัน)
 */
export const FIELD_PLANES = 18;

/**
 * จำนวนระนาบ "ห้อง" ในประตูเข้า — ที่เหลือเป็นสินค้า
 *
 * ระนาบห้องถูกเลื่อนให้โหลดทีหลัง (ดู `deferRooms` ใน DepthField) ระหว่างที่ยังไม่มา
 * สนามมีแต่ระนาบสินค้า จำนวนสินค้าจึงต้อง **ไม่ต่ำกว่า 30** ด้วยตัวมันเอง ไม่งั้น
 * AC ข้อ 1 ("≥ 30 ระนาบ เป็น `<img>` ทั้งหมด") จะผ่านเฉพาะตอนโหลดจบ ซึ่งไม่ใช่
 * ตอนที่คนดูหน้าโหลด — สินค้าจึงตรึงไว้ที่ 30 และห้องคือส่วนที่เพิ่มได้
 *
 * 28 ไม่ใช่ 10: รูปสินค้าเป็นภาพตัดพื้นโปร่งบนการ์ดขาว สนามที่มีแต่การ์ดอ่านเป็น
 * กระดาษเปล่าซ้อนกัน ภาพถ่ายห้องคือระนาบเดียวที่มีเนื้อภาพเต็มกรอบจริง มันจึงเป็น
 * ตัวที่ทำให้กำแพงอ่านออกว่าเป็นกำแพงรูป — และเมื่อระนาบถูกกดขนาดลงเพื่อ AC ข้อ 7
 * จำนวนคือทางเดียวที่เหลือในการรักษาความหนาแน่น
 *
 * รอบห้อง (งาน W) ขยับจาก 52 เป็น 58 อีกครั้ง: ความลึกจริงทำให้ใบไกลเล็กลงมาก
 * พื้นที่ที่มันเคยกินหายไป ต้องเติมด้วยจำนวน (58 ยังอยู่ในช่วง 40–60 ของสเปก)
 */
const ENTRY_ROOMS = 28;

/**
 * ระนาบสินค้าของประตูเข้า = ของบนกำแพงที่หน้านี้เรนเดอร์อยู่แล้ว
 *
 * นี่คือชุดที่ "หน้าแรกต้องใช้อยู่แล้ว" จึงเป็นชุดเดียวที่ตัวเลขความคืบหน้าควรจะรอ
 * ส่วนระนาบห้องเป็นของแถมทางสายตา — ดู entryPlanes และ `deferRooms` ใน DepthField
 *
 * §5 ข้อ 6 (กติกาเดิมจากงาน J): รูปในสนามต้องเป็นไฟล์ที่หน้าอื่นใช้อยู่แล้ว
 * ไม่งั้นหน้าโหลดกลายเป็นตัวเพิ่มงานโหลด ซึ่งย้อนแย้งในตัวเอง
 * WALL_PANEL_PRODUCTS คือชุดเดียวกับที่ FinishWall วนแสดงบนแผง และ `src` ของมัน
 * เป็น image700 อยู่แล้วตามหมายเหตุในไฟล์นั้น จึงตรงทั้งสองข้อในคราวเดียว
 *
 * วนตามเฉด (ชิ้นที่ 0 ของทุกเฉดก่อน แล้วชิ้นที่ 1 ...) ไม่ใช่ตักเฉดละ 3 เรียงกัน
 * เฉดที่ปรากฏในสนามจึงกระจายครบ 11 เฉดก่อนจะซ้ำเฉดเดิม
 */
function entryProducts(limit: number): FieldPlane[] {
  const out: FieldPlane[] = [];
  const depth = Math.max(...finishIndex.map((f) => WALL_PANEL_PRODUCTS[f.code]?.length ?? 0));

  for (let rank = 0; rank < depth && out.length < limit; rank++) {
    for (const entry of finishIndex) {
      if (out.length >= limit) break;
      const item = WALL_PANEL_PRODUCTS[entry.code]?.[rank];
      if (!item) continue;
      out.push({
        id: `p-${entry.code}-${item.slug}`,
        src: item.src,
        alt: {
          th: `${item.name.th} — ${item.finishName.th}`,
          en: `${item.name.en} — ${item.finishName.en}`,
        },
        kind: 'product',
      });
    }
  }
  return out;
}

/**
 * ระนาบห้องของประตูเข้า — จากคลังไลฟ์สไตล์ที่ /about และ /articles ใช้อยู่แล้ว
 *
 * เอาเฉพาะหมวด `room` (มี 68 ใบ) ไม่ใช่ `detail`: ระนาบพวกนี้อยู่ชั้นลึกและถูกย่อ
 * ด้วยเปอร์สเปกทีฟจนเหลือไม่กี่ร้อยพิกเซล ภาพระยะใกล้จึงอ่านเป็นสีเลอะ
 * ส่วนห้องทั้งห้องยังอ่านออกว่าเป็นห้อง
 *
 * เดินทีละ `step` แทนการหยิบ 12 ใบแรก — 12 ใบแรกของคลังมาจากคอลเลกชันเดียวกัน
 * สนามจะได้ครัวไม้โทนเดียวกัน 12 ใบ ซึ่งอ่านว่า "ของน้อย" แบบเดียวกับที่
 * wall-products กันไว้ตอนเลือกตัวชูโรง
 */
function entryRooms(limit: number): FieldPlane[] {
  // §5 ข้อ 6 บอกว่า "900 ไม่ใช่ 1800" — และมันหมายถึงพิกเซลจริง ไม่ใช่ชื่อฟิลด์
  //
  // `src.w900` นิยามว่า "เรนดิชันที่ใหญ่ที่สุดที่ไม่เกิน 900px" แต่ภาพที่มีไฟล์เดียว
  // และไฟล์นั้นใหญ่กว่า 900 ก็จะคืนไฟล์นั้นมาอยู่ดี (เจอจริง 1 ใบ: brazn… 961px)
  // ตัดทิ้งแล้วเลื่อนไปใบถัดไป ดีกว่าปล่อยให้ข้อบังคับหลุดไปหนึ่งใบเงียบ ๆ
  const rooms = lifestyleByCategory('room').filter((image) =>
    image.sources.some((s) => s.width <= 900),
  );
  if (!rooms.length) return [];
  const step = Math.max(1, Math.floor(rooms.length / limit));
  const out: FieldPlane[] = [];
  for (let i = 0; out.length < limit && i * step < rooms.length; i++) {
    const image = rooms[i * step];
    out.push({
      id: `r-${image.id}`,
      // `src.w900` = "เรนดิชันที่ใหญ่ที่สุดที่ไม่เกิน 900px" ตามนิยามในไฟล์ข้อมูล
      // ไม่ใช้ helper `lifestyleSrc(image, cssWidth, dpr)` ที่เพิ่งเพิ่มเข้ามา
      // ทั้งที่มันฉลาดกว่า: ระนาบห้องมี element กว้าง ~360–560px คูณ dpr 2 แล้ว
      // helper จะเลือกไฟล์ 1800 ให้ ซึ่ง §5 ข้อ 6 ห้ามไว้ตรง ๆ
      // เพดาน 900 ที่นี่เป็นข้อบังคับของสเปก ไม่ใช่การประมาณขนาดที่เหมาะสม
      src: image.src.w900,
      alt: image.alt,
      kind: 'room',
    });
  }
  return out;
}

/**
 * ชุดระนาบของประตูเข้า — สินค้า 28 + ห้อง 12 สลับกันไป
 *
 * สลับใน "ลำดับอาร์เรย์" ไม่ใช่ปล่อยห้องไปกองท้าย เพราะตัวจัดวางใน DepthField
 * กระจายตำแหน่งตามดัชนี (sunflower) ถ้าห้องอยู่ท้ายทั้งก้อน ห้องทั้ง 12 ใบ
 * จะไปเรียงกันอยู่ขอบนอกสุดของสนามพอดี
 */
export function entryPlanes(): FieldPlane[] {
  const rooms = entryRooms(ENTRY_ROOMS);
  const items = entryProducts(ENTRY_PLANES - rooms.length);
  const out: FieldPlane[] = [];
  const every = rooms.length ? Math.round(items.length / rooms.length) : 0;

  let r = 0;
  for (let i = 0; i < items.length; i++) {
    out.push(items[i]);
    if (every && r < rooms.length && (i + 1) % every === 0) out.push(rooms[r++]);
  }
  while (r < rooms.length) out.push(rooms[r++]);
  return out;
}

export type IndexItem = {
  slug: string;
  model: string;
  name: { th: string; en: string };
  finishName: { th: string; en: string };
  src: string;
  href: string;
  alt: { th: string; en: string };
};

/**
 * ชุดระนาบของแกลเลอรี — สินค้าล้วน (§4.2) ชิ้นละหนึ่งเฉด
 *
 * วนเฉดทีละรอบเหมือน HomeContent.FEATURED และด้วยเหตุผลเดียวกัน: CP มี 74 ชิ้น
 * เยอะพอจะกินสนามทั้งสนามคนเดียว แล้วสนามก็เลิกพูดเรื่อง "เลือกจากผิวเคลือบ"
 *
 * `finishOf` ไม่ใช่ `finishes[0]` — ระนาบต้องเป็นรูปของเฉดที่ลิงก์พาไป ไม่งั้น
 * ข้อกำหนด "เฉดตรงกับที่เห็น" (AC ข้อ 6) พังตั้งแต่ยังไม่ได้คลิก
 */
export function galleryPlanes(limit = GALLERY_PLANES): { planes: FieldPlane[]; index: IndexItem[] } {
  const out: FieldPlane[] = [];
  const index: IndexItem[] = [];
  const seen = new Set<string>();
  const queues = finishIndex.map((entry) => ({
    entry,
    list: [...entry.products].sort((a, b) => Number(!!b.featured) - Number(!!a.featured)),
    i: 0,
  }));

  while (out.length < limit) {
    let progressed = false;
    for (const q of queues) {
      if (out.length >= limit) break;
      while (q.i < q.list.length && seen.has(q.list[q.i].slug)) q.i++;
      if (q.i >= q.list.length) continue;
      const product = q.list[q.i++];
      const finish = finishOf(product, q.entry.code);
      // เข้าไม่ถึงในทางปฏิบัติ — q.entry.products สร้างจากเฉดนี้อยู่แล้ว
      if (!finish) continue;
      seen.add(product.slug);
      // image700 เท่ากับ image เมื่อไม่มีไฟล์ครึ่งขนาด ซึ่งเป็นค่าที่ถูกอยู่แล้ว
      const src = finish.image700 || finish.image;
      const alt = {
        th: `${product.name.th} — ${finish.name.th}`,
        en: `${product.name.en} — ${finish.name.en}`,
      };
      // ?finish= คือกลไกที่ ProductDetail ต่อสายไว้แล้ว (ดู FinishFromQuery)
      // trailing slash บังคับ: next.config ตั้ง trailingSlash: true
      const href = `/products/${product.slug}/?finish=${encodeURIComponent(finish.code)}`;

      out.push({
        id: `${product.slug}-${finish.code}`,
        src,
        alt,
        kind: 'product',
        href,
        title: product.name,
        sub: finish.name,
        model: product.model,
      });
      // มุมมองดัชนีสร้างจากลูปเดียวกัน ไม่ใช่ derive ทีหลังด้วยการแกะสตริง —
      // "ทางออก" ต้องเป็นทางออกของสิ่งที่เห็นในสนามจริง ๆ ชิ้นต่อชิ้น (§4.2)
      index.push({
        slug: product.slug,
        model: product.model,
        name: product.name,
        finishName: finish.name,
        src,
        href,
        alt,
      });
      progressed = true;
    }
    // ของหมดก่อนครบ — กัน while วนไม่รู้จบถ้าแคตตาล็อกหดลง
    if (!progressed) break;
  }
  // สนามได้ 18 ใบแรก ดัชนีได้ทั้งชุด — เหตุผลอยู่ที่ FIELD_PLANES ด้านบน
  // ทั้งสองมาจากลูปเดียวกันและเรียงเหมือนกัน สิ่งที่อยู่ในสนามจึงเป็นสับเซตของดัชนี
  // เสมอโดยโครงสร้าง ไม่ใช่โดยข้อตกลงที่อาจเพี้ยนทีหลัง
  return { planes: out.slice(0, FIELD_PLANES), index };
}
