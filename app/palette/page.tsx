import type { Metadata } from 'next';
import { PaletteIndex } from '@/components/PaletteContent';
import JsonLd from '@/components/JsonLd';
import { paletteGroups } from '@/lib/palette.generated';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Colours & Finishes',
  description:
    'Every colour and finish KOHLER publishes, harvested from the source reference — and the eleven finishes we actually stock, each one a click from the room it fills.',
  alternates: { canonical: '/palette/' },
};

export default function PalettePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Colours & Finishes',
    url: `${SITE_URL}/palette/`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <PaletteIndex groups={paletteGroups} />
      <JsonLd data={jsonLd} />
    </>
  );
}
