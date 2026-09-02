import type { Metadata } from 'next';
import { PaletteIndex } from '@/components/PaletteContent';
import JsonLd from '@/components/JsonLd';
import { dict, type Lang } from '@/lib/i18n';
import { paletteGroups } from '@/lib/palette.generated';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { alternates, treeUrl } from '@/app/_lib/routes';

export const path = '/palette/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.palette.title,
  description: dict[lang].meta.palette.description,
  alternates: alternates(lang, path),
});

export default function PalettePage({ lang }: { lang: Lang }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: dict[lang].palette.title,
    url: treeUrl(lang, path),
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <PaletteIndex groups={paletteGroups} />
      <JsonLd data={jsonLd} />
    </>
  );
}
