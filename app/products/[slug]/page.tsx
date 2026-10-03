import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ProductDetail from '@/components/ProductDetail';
import { getProduct, products } from '@/lib/products';
import { SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name.th} (${product.name.en})`,
    description: product.desc.th,
    alternates: { canonical: `/products/${product.slug}/` },
    openGraph: { title: product.name.th, description: product.desc.th },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.th,
    alternateName: product.name.en,
    description: product.desc.th,
    category: 'Kitchen Equipment',
    brand: { '@type': 'Brand', name: 'KOHLER' },
    url: `${SITE_URL}/products/${product.slug}/`,
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
