import type { Metadata } from 'next';
import CollectionsContent, { type CollectionEntry } from '@/components/CollectionsContent';
import JsonLd from '@/components/JsonLd';
import { collectionCards, collectionFamilies } from '@/lib/collections.generated';
import { products } from '@/lib/products';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'The sixteen collections on KOHLER’s own index, with the pieces from each one that are in our catalogue — and a plain note where the source’s own page is gone.',
  alternates: { canonical: '/collections/' },
};

/** ชื่อคอลเลกชันของสองชุดข้อมูลเขียนไม่เหมือนกัน (Forefront ™ / Forefront™ / forefront) */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * slug ของหน้าตระกูลมาจาก URL ต้นทางที่เขียนเครื่องหมายการค้าเป็นตัวอักษร:
 * `/ProductFamily/Portrait(R)` → slug `portraitr` ส่วนการ์ดเขียนว่า `Portrait ®`
 * normalise เฉย ๆ จึงได้ portraitr ≠ portrait — ตัด r ท้ายที่มาจาก (R) ออกด้วย
 */
const familyKey = (slug: string) => normalise(slug).replace(/r$/, '');

// สินค้าในแคตตาล็อกจัดกลุ่มตามค่า "คอลเลกชัน" ในสเปก — คำนวณตอน build ครั้งเดียว
const productsByCollection = new Map<string, CollectionEntry['products']>();
for (const product of products) {
  const value = product.specs.find((s) => s.label === 'คอลเลกชัน')?.value;
  if (!value) continue;
  const key = normalise(value);
  const list = productsByCollection.get(key) ?? [];
  list.push({
    slug: product.slug,
    name: product.name,
    image: product.finishes[0]?.image700 ?? product.finishes[0]?.image ?? '',
  });
  productsByCollection.set(key, list);
}

export default function CollectionsPage() {
  const entries: CollectionEntry[] = collectionCards.map((card) => {
    const key = normalise(card.name);
    return {
      card,
      family:
        collectionFamilies.find((f) => normalise(f.slug) === key) ??
        collectionFamilies.find((f) => familyKey(f.slug) === key) ??
        null,
      products: productsByCollection.get(key) ?? [],
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Collections',
    url: `${SITE_URL}/collections/`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <CollectionsContent entries={entries} />
      <JsonLd data={jsonLd} />
    </>
  );
}
