// ── ด่านกรองของหน้า /info/ ─────────────────────────────────────────────────
//
// รูปแบบเดียวกับ lib/products.ts / lifestyle.ts / editorial.ts
//
// ต่างจากชุดอื่นตรงที่ **ไม่ตัดทั้งหน้า** เก้าหน้านี้เป็นของ KOHLER ระดับองค์กร
// ไม่ใช่หน้าสินค้า หน้าเดียวกันพูดถึงของครัวและของห้องน้ำปนกันอยู่แล้ว
// (/literature มีทั้ง "Bathtub Project Catalogue" และ "Faucets 2024/25 Linebook")
// ตัดทั้งหน้าจะทำให้แคตตาล็อกของครัวหายไปด้วย จึงกรองเป็นรายชิ้น
//
// ── ย่อหน้าและหัวข้อถูกกรองด้วย แต่ด้วยความระวังคนละแบบ ──────────────────
// ไทล์กับหัวข่าวเป็น "ของ" ตัดทั้งชิ้นแล้วรายการที่เหลือยังอ่านรู้เรื่อง
// ย่อหน้าเป็นเนื้อความต่อเนื่อง ตัดตรงกลางแล้วข้อความขาดตอน
//
// จึงตัดเฉพาะย่อหน้าที่เอ่ยชื่อของห้องน้ำจริง ๆ และวัดผลทุกครั้งว่าเหลือกี่ย่อหน้า
// — ถ้าหน้าไหนเหลือน้อยจนอ่านไม่รู้เรื่อง ต้องรู้ตัวตอน build ไม่ใช่ตอนลูกค้าเปิด
// (ดู assertReadable ท้ายไฟล์)

import { contentPages as allContentPages, type ContentPage } from './pages.generated';
import { allowText } from './scope';

export type { PageTile, PressItem, ContentPage } from './pages.generated';

/** ทั้งหมดรวมของห้องน้ำ — สำหรับสคริปต์ตรวจสอบเท่านั้น */
export { contentPages as allContentPages } from './pages.generated';

export const contentPages: ContentPage[] = allContentPages.map((page) => ({
  ...page,
  headings: page.headings.filter((h) => allowText(h.th, h.en)),
  paragraphs: page.paragraphs.filter((x) => allowText(x.th, x.en)),
  tiles: page.tiles.filter((t) =>
    allowText(t.heading.th, t.heading.en, t.blurb.th, t.blurb.en),
  ),
  press: page.press.filter((p) => allowText(p.headline.th, p.headline.en)),
  downloads: page.downloads.filter((d) => allowText(d.label.th, d.label.en)),
}));

/**
 * หน้าที่ยังมีเนื้อหาจริง ต้องยังมีเนื้อหาจริงหลังกรอง
 *
 * ตัวกรองเป็นการตัดข้อความออกจากหน้าที่คนเขียนไว้ให้อ่านทั้งหน้า ถ้าตัดแล้วเหลือ
 * ย่อหน้าเดียวจากสิบหก หน้านั้นไม่ได้ "สะอาดขึ้น" มันพัง และความพังแบบนี้เงียบ
 * — build ยังเขียว หน้ายังขึ้น แค่ไม่มีอะไรอยู่ในนั้น
 *
 * โยนตอนโหลดโมดูล = พังตอน `next build` พร้อมบอกว่าหน้าไหนเหลือเท่าไร
 * เกณฑ์ครึ่งหนึ่งไม่ใช่ค่าที่คิดขึ้นเอง: /careandclean เป็นหน้าที่ถูกกรองหนักสุด
 * และเหลือ 8 จาก 16 พอดี ถ้าวันหนึ่งตัวกรองเข้มขึ้นจนหน้านี้เหลือน้อยกว่านั้น
 * แปลว่ามีคนเปลี่ยนกฎโดยไม่ได้ดูผล
 */
function assertReadable(): void {
  const gutted = contentPages
    .map((page, i) => ({ page, before: allContentPages[i] }))
    .filter(({ page, before }) => before.paragraphs.length >= 4)
    .filter(({ page, before }) => page.paragraphs.length * 2 < before.paragraphs.length)
    .map(({ page, before }) => `${page.slug}: ${page.paragraphs.length}/${before.paragraphs.length}`);

  if (gutted.length) {
    throw new Error(
      `[pages] ตัวกรองห้องตัดย่อหน้าเกินครึ่งในหน้าเหล่านี้ จนอ่านไม่รู้เรื่อง:\n  ${gutted.join('\n  ')}`,
    );
  }
}

assertReadable();

export const getContentPage = (slug: string) => contentPages.find((p) => p.slug === slug);
