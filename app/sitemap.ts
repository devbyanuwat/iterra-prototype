import type { MetadataRoute } from 'next';
import { posts } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';
import { db } from '@/lib/db';
import { listPublished } from '@/lib/server/products';

// สินค้ามาจาก DB จึงสร้างตอน request (เดิม force-static ตอน build)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublished(db);
  const now = new Date();
  const staticPages = ['', '/about/', '/products/', '/catalog/', '/articles/', '/projects/', '/contact/', '/privacy/'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: p === '' ? 1 : 0.7,
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

  return [...staticPages, ...productPages, ...postPages];
}
