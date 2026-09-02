import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ProductDetail from '@/components/ProductDetail';
import { ALT_LANG, DEFAULT_LANG, type Lang } from '@/lib/i18n';
import { getProduct, products } from '@/lib/products';
import { SITE_NAME } from '@/lib/site';
import { alternates, treeUrl } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

export const path = (slug: string) => `/products/${slug}/`;

export function staticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const product = getProduct(slug);
    if (!product) return {};
    return {
      // ชื่อสินค้าอีกภาษาอยู่ในวงเล็บเหมือนเดิม แต่ตัวนำเป็นภาษาของหน้า ไม่ใช่
      // ไทยเสมอ — ผลค้นหาของหน้าอังกฤษเคยขึ้นเป็นไทยล้วนเพราะบรรทัดนี้
      title: `${product.name[lang]} (${product.name[lang === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG]})`,
      description: product.desc[lang],
      alternates: alternates(lang, path(product.slug)),
      openGraph: { title: product.name[lang], description: product.desc[lang] },
    };
  };

export default async function ProductPage({ params, lang }: Props & { lang: Lang }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const other = lang === DEFAULT_LANG ? ALT_LANG : DEFAULT_LANG;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name[lang],
    alternateName: product.name[other],
    description: product.desc[lang],
    // JSON-LD ประกาศภาษาของหน้าที่มันอยู่ ไม่ใช่ของทั้งเว็บ — หน้าเดียวกันถูก
    // export สองครั้ง และ url ข้างล่างชี้มาที่ URL ของต้นไม้นี้เท่านั้น
    inLanguage: lang,
    category: product.category === 'kitchen' ? 'Kitchen Equipment' : 'Bathroom Fixtures',
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: treeUrl(lang, path(product.slug)),
    additionalProperty: product.specs.map((s) => ({
      '@type': 'PropertyValue',
      name: s.label,
      value: s.value,
    })),
  };

  return (
    <>
      <ProductDetail slug={product.slug} />
      <JsonLd data={jsonLd} />
    </>
  );
}
