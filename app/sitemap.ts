import type { MetadataRoute } from 'next';
import { finishIndex } from '@/components/finish-index';
import { contentPages } from '@/lib/pages';
import { paletteGroups } from '@/lib/editorial';
import { products } from '@/lib/products';
import { posts } from '@/lib/editorial';
import { guides } from '@/lib/editorial';
import { ideaHubs } from '@/lib/editorial';
import { DEFAULT_LANG } from '@/lib/i18n';
import { LANGS, STATIC_PATHS, treeUrl, treeUrls } from './_lib/routes';

export const dynamic = 'force-static';

/**
 * hreflang lives here now, and it is earned.
 *
 * The note this file used to carry was right for the site it described: both
 * languages came from ONE URL, hreflang points at alternate *URLs*, and two
 * annotations aimed at a single URL is not a weak signal but a wrong one. What
 * it asked for — "a real second route tree" — is what task D3 built. Every path
 * below is exported twice, English at the bare path and Thai under /th/, each
 * prerendered in its own language, and each declaring the other.
 *
 * So every entry appears twice, and each of the two carries the same
 * `alternates.languages` block naming both URLs plus x-default. That is what
 * reciprocation means: a crawler that arrives at either URL is told about the
 * other one, by the page (app/_lib/routes.ts writes the same set into
 * <link rel="alternate">) and by this file, with identical values from the same
 * function. robots.ts allows the whole site, so nothing here is advertised and
 * then blocked.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /**
   * เส้นทางหนึ่งเส้น → สองรายการ (ภาษาละหนึ่ง) พร้อม hreflang ชุดเดียวกันทั้งคู่
   *
   * เขียนไว้ที่เดียวเพราะทุกกลุ่มข้างล่างต้องการรูปแบบเดียวกันเป๊ะ ๆ ถ้าปล่อยให้
   * แต่ละกลุ่มประกอบเอง โอกาสที่กลุ่มใดกลุ่มหนึ่งลืมต้นไม้ไทยคือเรื่องของเวลา
   */
  const bothTrees = (
    path: string,
    extra: { lastModified?: Date; changeFrequency?: 'monthly' | 'yearly'; priority?: number } = {},
  ): MetadataRoute.Sitemap => {
    const urls = treeUrls(path);
    // x-default อยู่ในนี้ด้วย ไม่ใช่เฉพาะใน <head> ของหน้า — สองที่ประกาศชุด
    // เดียวกันเป๊ะ ๆ ไม่งั้น sitemap กับหน้าจะ "เกือบ" ตรงกัน ซึ่งเป็นสถานะที่
    // ตรวจสอบยากที่สุด
    const languages = { ...urls, 'x-default': urls[DEFAULT_LANG] };
    return LANGS.map((lang) => ({
      url: treeUrl(lang, path),
      lastModified: extra.lastModified ?? now,
      changeFrequency: extra.changeFrequency ?? ('monthly' as const),
      priority: extra.priority ?? 0.7,
      alternates: { languages },
    }));
  };

  // /gallery/ was missing — it has been a nav item and a real route since the
  // depth field shipped, so it was simply never added here.
  const staticPages = STATIC_PATHS.flatMap((p) => bothTrees(p, { priority: p === '/' ? 1 : 0.7 }));

  // หน้าเฉดคือตัวนำทางหลักของเว็บ (finish-first §2) จึงมี priority สูงกว่าหน้าสินค้า
  // และรองจากหน้าแรกเท่านั้น — ไม่ใช่หน้ารองที่จะปล่อยให้หายไปจาก sitemap
  const finishPages = finishIndex.flatMap((f) =>
    bothTrees(`/finish/${encodeURIComponent(f.code)}/`, { priority: 0.9 }),
  );

  // หน้าลูกของจานสี — เจ็ดหมวดอ้างอิง ไม่รวม index ที่เป็น /palette/ อยู่แล้ว
  const palettePages = paletteGroups
    .filter((g) => g.slug !== 'index')
    .flatMap((g) => bothTrees(`/palette/${g.slug}/`, { priority: 0.6 }));

  const productPages = products.flatMap((p) =>
    bothTrees(`/products/${p.slug}/`, { priority: 0.8 }),
  );

  // หน้าข้อมูล (task C3) — /info/faq อยู่ในนี้ด้วยแต่ priority ต่ำสุด: ต้นทางว่าง
  // หน้าของเราจึงเป็นหน้าส่งต่อ ไม่ใช่หน้าที่มีเนื้อหาของตัวเอง ตัดออกจาก sitemap
  // ไปเลยก็ไม่ถูก เพราะมันถูกลิงก์จากท้ายเว็บจริง ๆ — ลิงก์ไว้แต่ไม่โฆษณา
  const infoPages = contentPages.flatMap((page) =>
    bothTrees(`/info/${page.slug}/`, { priority: page.status === 'stub' ? 0.2 : 0.6 }),
  );

  const postPages = posts.flatMap((p) =>
    bothTrees(`/articles/${p.slug}/`, {
      lastModified: new Date(p.date),
      changeFrequency: 'yearly',
      priority: 0.6,
    }),
  );

  // task C1 — คู่มือเลือกซื้อสิบสามชุดกับไอเดียสองชุด
  const guidePages = guides.flatMap((g) => bothTrees(`/guides/${g.slug}/`, { priority: 0.6 }));
  const ideaPages = ideaHubs.flatMap((h) => bothTrees(`/ideas/${h.slug}/`, { priority: 0.6 }));

  // /gallery/[finish] (task B2) — สิบเอ็ดหน้าต่อภาษา
  const galleryFinishPages = finishIndex.flatMap((f) =>
    bothTrees(`/gallery/${encodeURIComponent(f.code)}/`, { priority: 0.5 }),
  );

  return [
    ...staticPages,
    ...finishPages,
    ...palettePages,
    ...productPages,
    ...infoPages,
    ...postPages,
    ...guidePages,
    ...ideaPages,
    ...galleryFinishPages,
  ];
}
