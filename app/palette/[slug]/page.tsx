import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaletteGroupContent } from '@/components/PaletteContent';
import JsonLd from '@/components/JsonLd';
import { paletteGroups } from '@/lib/palette.generated';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

// หน้าดัชนีอยู่ที่ /palette/ อยู่แล้ว จึงไม่สร้าง /palette/index/ ซ้ำอีกใบ
const groups = paletteGroups.filter((g) => g.slug !== 'index');

export function generateStaticParams() {
  return groups.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = groups.find((g) => g.slug === slug);
  if (!group) return {};
  return {
    title: group.title.en,
    description: `${group.finishes.length} colours and finishes in KOHLER's ${group.title.en} reference.`,
    alternates: { canonical: `/palette/${slug}/` },
  };
}

export default async function PaletteGroupPage({ params }: Props) {
  const { slug } = await params;
  const group = groups.find((g) => g.slug === slug);
  if (!group) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: group.title.en,
    url: `${SITE_URL}/palette/${slug}/`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <PaletteGroupContent group={group} />
      <JsonLd data={jsonLd} />
    </>
  );
}
