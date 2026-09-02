import type { MetadataRoute } from 'next';
import { finishIndex } from '@/components/finish-index';
import { contentPages } from '@/lib/pages.generated';
import { paletteGroups } from '@/lib/palette.generated';
import { products } from '@/lib/products';
import { posts } from '@/lib/posts';
import { guides } from '@/lib/guides.generated';
import { ideaHubs } from '@/lib/ideas.generated';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * NO hreflang / `alternates.languages` here, and that is deliberate.
 *
 * The site now ships English in the exported HTML and restores Thai from
 * localStorage — but both languages come from the SAME URL. hreflang exists to
 * point at an alternate *URL* per language; pointing two hreflang entries at
 * one URL is not a weaker signal, it is a wrong one, and Google drops the
 * annotation when the pages do not reciprocate. Nothing here can reciprocate,
 * because there is nothing to reciprocate with.
 *
 * What would earn it: a real second route tree (/en or /th). That is the change
 * that makes the second language crawlable, shareable and readable without JS —
 * costed in scratchpad/task-b3.md §5. Until then the only honest declarations
 * are <html lang>, og:locale + og:locale:alternate, and schema.org inLanguage,
 * all of which are in app/layout.tsx and all of which describe one document.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // /gallery/ was missing — it has been a nav item and a real route since the
  // depth field shipped, so it was simply never added here.
  const staticPages = [
    '',
    '/about/',
    '/products/',
    '/palette/',
    '/collections/',
    '/gallery/',
    '/articles/',
    // task C1
    '/guides/',
    '/ideas/',
    // task C3 — ร้านค้าเป็นหน้าที่ตอบว่า "ไปดูของจริงได้ที่ไหน" priority เท่ากับ
    // หน้าอื่นในระดับนี้ ไม่ใช่หน้ารอง
    '/stores/',
    '/info/',
    '/contact/',
  ].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: p === '' ? 1 : 0.7,
    }),
  );

  // หน้าเฉดคือตัวนำทางหลักของเว็บ (finish-first §2) จึงมี priority สูงกว่าหน้าสินค้า
  // และรองจากหน้าแรกเท่านั้น — ไม่ใช่หน้ารองที่จะปล่อยให้หายไปจาก sitemap
  const finishPages = finishIndex.map((f) => ({
    url: `${SITE_URL}/finish/${encodeURIComponent(f.code)}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  // หน้าลูกของจานสี — เจ็ดหมวดอ้างอิง ไม่รวม index ที่เป็น /palette/ อยู่แล้ว
  const palettePages = paletteGroups
    .filter((g) => g.slug !== 'index')
    .map((g) => ({
      url: `${SITE_URL}/palette/${g.slug}/`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  const productPages = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // หน้าข้อมูล (task C3) — /info/faq อยู่ในนี้ด้วยแต่ priority ต่ำสุด: ต้นทางว่าง
  // หน้าของเราจึงเป็นหน้าส่งต่อ ไม่ใช่หน้าที่มีเนื้อหาของตัวเอง ตัดออกจาก sitemap
  // ไปเลยก็ไม่ถูก เพราะมันถูกลิงก์จากท้ายเว็บจริง ๆ — ลิงก์ไว้แต่ไม่โฆษณา
  const infoPages = contentPages.map((page) => ({
    url: `${SITE_URL}/info/${page.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: page.status === 'stub' ? 0.2 : 0.6,
  }));

  const postPages = posts.map((p) => ({
    url: `${SITE_URL}/articles/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // task C1 — คู่มือเลือกซื้อสิบสามชุดกับไอเดียสองชุด
  const guidePages = guides.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const ideaPages = ideaHubs.map((h) => ({
    url: `${SITE_URL}/ideas/${h.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // /gallery/[finish] (task B2) — สิบเอ็ดหน้าที่ประกาศไว้ตอนนั้นแต่ไม่ได้ใส่ที่นี่
  const galleryFinishPages = finishIndex.map((f) => ({
    url: `${SITE_URL}/gallery/${encodeURIComponent(f.code)}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

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
