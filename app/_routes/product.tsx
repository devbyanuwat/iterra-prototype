import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ProductDetail from '@/components/ProductDetail';
import { ALT_LANG, DEFAULT_LANG, dict, scriptOf, type Lang } from '@/lib/i18n';
import { getProduct, products, type Product } from '@/lib/products';
import { SITE_NAME } from '@/lib/site';
import { alternates, treeUrl } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

export const path = (slug: string) => `/products/${slug}/`;

export function staticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/**
 * <title> ของหน้าสินค้า — ภาษาเดียว ภาษาของหน้า (task E1)
 *
 * เคยเป็น `ชื่อภาษาของหน้า (ชื่ออีกภาษา)` ซึ่งอ่านดีบนหน้าจอแต่ผิดที่: <title>
 * เป็น element ที่ติด lang= ให้ส่วนย่อยไม่ได้ ข้อความอีกภาษาที่อยู่ในนั้นจึงถูก
 * ประกาศเป็นภาษาของเอกสารเสมอ — QA-F5 นับได้ 90 หน้าที่ <title> อังกฤษมีวงเล็บ
 * ไทยห้อยอยู่ท้าย ชื่ออีกภาษาไม่ได้หายไปไหน มันย้ายไปอยู่ใต้ <h1> ในหน้า ซึ่ง
 * ติดป้าย lang="th" ได้จริง (ดู components/ProductDetail.tsx)
 *
 * สินค้าสองชิ้นในแคตตาล็อก (800-18384t, kohler-8623x) ไม่มีชื่ออังกฤษที่ต้นทาง
 * เลย ทั้ง name.th และ name.en เป็นไทยเหมือนกัน ชื่ออังกฤษของหน้าจึงประกอบจาก
 * ของที่เป็นอังกฤษอยู่แล้วและเป็นความจริงเกี่ยวกับสินค้าชิ้นนั้น: เลขรุ่นกับหมวด
 * — สั้นแต่ไม่ได้แต่งขึ้น ส่วนชื่อไทยตัวจริงยังอยู่บนหน้าและติดป้ายไว้
 */
export function productTitle(product: Product, lang: Lang): string {
  const name = product.name[lang];
  if (scriptOf(name) !== 'th' || lang === 'th') return name;
  return `${product.model} — ${dict[lang].common.category[product.category]}`;
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const product = getProduct(slug);
    if (!product) return {};
    const title = productTitle(product, lang);
    return {
      title,
      description: product.desc[lang],
      alternates: alternates(lang, path(product.slug)),
      openGraph: { title, description: product.desc[lang] },
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
