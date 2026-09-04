// ── URL ของหน้าเดียวกันในทั้งสองต้นไม้ (task D3) ─────────────────────────────
//
// ทุกเส้นทางถูก export สองชุด: อังกฤษที่ path เปล่า และไทยใต้ /th/ ที่นี่คือที่
// เดียวที่รู้วิธีเขียน URL เต็มของทั้งคู่ และเป็นที่เดียวที่ประกาศความสัมพันธ์
// ระหว่างมัน — canonical, hreflang และ sitemap จึงพูดตรงกันโดยโครงสร้าง
// ไม่ใช่เพราะมีใครไล่แก้ให้ตรงกันสามที่
//
// ก่อนหน้านี้ทั้งเว็บไม่มี hreflang เลย และเหตุผลที่เขียนไว้ใน app/sitemap.ts
// กับ lib/i18n.ts ถูกต้องตามสถานะตอนนั้น: hreflang อธิบาย "URL ทางเลือก" ต่อ
// ภาษา ส่วนเรามี URL เดียวที่เสิร์ฟสองภาษาผ่าน JS จึงไม่มีอะไรให้ชี้ไปหา
// เงื่อนไขนั้นหมดไปแล้ว — มีสอง URL จริง ต่างประกาศถึงกัน และต่างมีเนื้อหาใน
// ภาษาของตัวเองอยู่ใน HTML ตั้งแต่ไบต์แรก

import type { Metadata } from 'next';
import { ALT_LANG, DEFAULT_LANG, LANG_PREFIX, langPath, type Lang } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import { COLLECTIONS_ENABLED } from '@/lib/scope';

/**
 * เติมคำนำหน้าภาษาให้ href ที่มาจาก "ข้อมูล" ไม่ใช่จาก JSX
 *
 * ระนาบของสนามภาพเชิงลึกกับรายการในดัชนีถือ href ที่ประกอบไว้ตั้งแต่ตอนสร้าง
 * ชุดข้อมูล (components/depth-field.ts) แล้ว DepthField กับ DepthGallery เอาไป
 * ใส่ <Link> ตรง ๆ — components/DepthField.tsx ยัง import next/link ตัวจริง
 * เพราะเป็นไฟล์ที่งานนี้ห้ามแก้ ทางเดียวที่เหลือคือทำให้ href ถูกตั้งแต่ก่อน
 * ถึงมือมัน ซึ่งคือที่นี่ (ถูกเรียกจาก app/_routes/home.tsx และ gallery)
 */
export function fieldHrefs<T extends { href?: string }>(lang: Lang, items: T[]): T[] {
  if (!LANG_PREFIX[lang]) return items;
  return items.map((item) => (item.href ? { ...item, href: langPath(lang, item.href) } : item));
}

/** ทั้งสองภาษา เรียงตามภาษาที่อยู่ที่ path เปล่าก่อน */
export const LANGS: readonly Lang[] = [DEFAULT_LANG, ALT_LANG];

/** URL เต็มของเส้นทางนี้ในต้นไม้ของภาษานั้น */
export const treeUrl = (lang: Lang, path: string) => `${SITE_URL}${langPath(lang, path)}`;

/** `{ en: …, th: … }` ของเส้นทางเดียว */
export function treeUrls(path: string): Record<Lang, string> {
  return Object.fromEntries(LANGS.map((l) => [l, treeUrl(l, path)])) as Record<Lang, string>;
}

/**
 * canonical + hreflang ของหน้าหนึ่ง
 *
 * canonical ชี้มาที่ตัวเอง ไม่ใช่ชี้ข้ามไปอีกภาษา — สองหน้านี้ไม่ใช่หน้าซ้ำกัน
 * มันคือคนละเนื้อหาสำหรับคนละผู้อ่าน hreflang ต่างหากที่บอกความสัมพันธ์
 *
 * x-default ชี้ไปที่ภาษาที่อยู่ path เปล่า ซึ่งเป็นสิ่งที่ผู้ใช้จะได้เมื่อเดินเข้ามา
 * ที่รากของเว็บโดยไม่ระบุภาษา — คำประกาศจึงตรงกับพฤติกรรมจริงของเซิร์ฟเวอร์
 */
export function alternates(lang: Lang, path: string): Metadata['alternates'] {
  const languages = treeUrls(path);
  return {
    canonical: languages[lang],
    languages: { ...languages, 'x-default': languages[DEFAULT_LANG] },
  };
}

/**
 * เส้นทางทั้งหมดที่ static export สร้างไว้ ใช้ร่วมกันระหว่าง sitemap กับหน้าอื่น
 * ที่ต้องรู้ว่ามีอะไรอยู่บ้าง เก็บเป็น path ของเว็บ (ไม่มีคำนำหน้าภาษา) เพราะ
 * คำนำหน้าเป็นเรื่องของต้นไม้ ไม่ใช่ของเส้นทาง
 */
const ALL_STATIC_PATHS = [
  '/',
  '/about/',
  '/products/',
  '/palette/',
  '/collections/',
  '/gallery/',
  '/articles/',
  '/guides/',
  '/ideas/',
  '/stores/',
  '/info/',
  '/contact/',
] as const;

/**
 * เส้นทางคงที่ที่ยังมีหน้าจริงอยู่ — sitemap อ่านจากตัวนี้
 *
 * /collections/ ถูกปิดตอนเว็บเหลือเฉพาะห้องครัว (ดู lib/scope.ts) การประกาศมัน
 * ใน sitemap ทั้งที่ไม่มีหน้าให้เข้าคือการบอก search engine ว่ามี URL ที่ตอบ 404
 */
export const STATIC_PATHS = ALL_STATIC_PATHS.filter(
  (p) => p !== '/collections/' || COLLECTIONS_ENABLED,
);
