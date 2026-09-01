import type { MetadataRoute } from 'next';
import { finishIndex } from '@/components/finish-index';
import { products } from '@/lib/products';
import { posts } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ['', '/about/', '/products/', '/articles/', '/contact/'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: p === '' ? 1 : 0.7,
  }));

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
