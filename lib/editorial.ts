// ── ด่านกรองของเนื้อหาบรรณาธิการ: คู่มือ กลุ่มสี ไอเดีย คอลเลกชัน บทความ ────
//
// ห้าชุดนี้เคยถูก import จากไฟล์ .generated ตรง ๆ กระจายอยู่ 13 ไฟล์ ซึ่งแปลว่า
// กฎ "ไม่เอาห้องน้ำ" จะต้องถูกเขียนซ้ำ 13 ครั้งและลืมได้ 13 จุด รวมมาไว้ที่นี่
// รูปแบบเดียวกับ lib/products.ts และ lib/lifestyle.ts
//
// ของห้องน้ำยังอยู่ครบในไฟล์ .generated ไม่ได้ถูกลบ (ดู lib/scope.ts)

import { guides as allGuides, type Guide } from './guides.generated';
import { paletteGroups as allPaletteGroups, type PaletteGroup } from './palette.generated';
import { ideaHubs as allIdeaHubs, type IdeaHub } from './ideas.generated';
import { collectionCards as allCards, collectionFamilies as allFamilies } from './collections.generated';
import { posts as allPosts, type Post } from './posts';
import {
  allowGuide,
  allowIdea,
  allowPalette,
  allowPost,
  COLLECTIONS_ENABLED,
} from './scope';

export type { Guide, GuideOption, GuideSection } from './guides.generated';
export type { PaletteGroup, PaletteFinish, PaletteChild } from './palette.generated';
export type { IdeaHub, IdeaItem } from './ideas.generated';
export type { CollectionCard, CollectionFamily } from './collections.generated';
export type { Post, PostImage, PostVideo } from './posts';
export { CAPTURED } from './posts';

// ── คู่มือเลือกซื้อ · 13 → 2 ──────────────────────────────────────────────
export const guides: Guide[] = allGuides.filter((g) => allowGuide(g.slug));
export const getGuide = (slug: string) => guides.find((g) => g.slug === slug);

// ── กลุ่มสีและผิวเคลือบ · 8 → 3 ───────────────────────────────────────────
//
// หน้า 'index' เป็นสารบัญที่ชี้ไปทุกกลุ่ม ปล่อยผ่านทั้งดุ้นคือมีลิงก์ไปหน้า
// ห้องน้ำที่ไม่ถูก export แล้ว = 404 ลูกของมันจึงถูกกรองด้วยกฎเดียวกับตัวกลุ่ม
const paletteSlugOf = (href: string) => href.replace(/^.*\/colorpalette\//, '').replace(/\.html.*$/, '');

export const paletteGroups: PaletteGroup[] = allPaletteGroups
  .filter((g) => allowPalette(g.slug))
  .map((g) => ({
    ...g,
    children: g.children.filter((c) => allowPalette(paletteSlugOf(c.href))),
  }));

export const getPaletteGroup = (slug: string) => paletteGroups.find((g) => g.slug === slug);

// ── ฮับไอเดีย · 2 → 1 ─────────────────────────────────────────────────────
export const ideaHubs: IdeaHub[] = allIdeaHubs.filter((h) => allowIdea(h.slug));

// ── คอลเลกชัน · 14 → 0 ────────────────────────────────────────────────────
//
// การ์ดทั้ง 14 ใบเป็นชุดห้องน้ำล้วน หน้านี้จึงว่างทั้งหน้าและถูกปิด
// ไม่ใช่แค่การ์ดบางใบหาย — ดูเหตุผลเต็มที่ COLLECTIONS_ENABLED ใน scope.ts
export const collectionCards = COLLECTIONS_ENABLED ? allCards : [];
export const collectionFamilies = COLLECTIONS_ENABLED ? allFamilies : [];
export { COLLECTIONS_ENABLED };

// ── บทความ · 10 → 3 ───────────────────────────────────────────────────────
export const posts: Post[] = allPosts.filter((p) => allowPost(p.space));
export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
