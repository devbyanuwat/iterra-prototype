import type { MetadataRoute } from 'next';
import { finishIndex } from '@/components/finish-index';
import { products } from '@/lib/products';
import { posts } from '@/lib/posts';
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
  const staticPages = ['', '/about/', '/products/', '/gallery/', '/articles/', '/contact/'].map(
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

  const productPages = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const postPages = posts.map((p) => ({
    url: `${SITE_URL}/articles/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...finishPages, ...productPages, ...postPages];
}
