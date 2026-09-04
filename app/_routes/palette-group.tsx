import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaletteGroupContent } from '@/components/PaletteContent';
import JsonLd from '@/components/JsonLd';
import type { Lang } from '@/lib/i18n';
import { paletteGroups } from '@/lib/editorial';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { alternates, treeUrl } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

export const path = (slug: string) => `/palette/${slug}/`;

// หน้าดัชนีอยู่ที่ /palette/ อยู่แล้ว จึงไม่สร้าง /palette/index/ ซ้ำอีกใบ
const groups = paletteGroups.filter((g) => g.slug !== 'index');

export function staticParams() {
  return groups.map((g) => ({ slug: g.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const group = groups.find((g) => g.slug === slug);
    if (!group) return {};
    return {
      title: group.title[lang],
      // ชื่อหมวดเป็นอังกฤษทั้งสองภาษาโดยตัวข้อมูลเอง (ต้นทางตีพิมพ์หน้าอ้างอิง
      // ชุดนี้เป็นอังกฤษล้วนทั้งใน URL ไทยและอังกฤษ — ดู palette.sourceNote)
      // ประโยคที่ห่อมันไว้ยังต้องเป็นภาษาของหน้า
      description:
        lang === 'th'
          ? `${group.finishes.length} สีและผิวเคลือบในหมวดอ้างอิง ${group.title.en} ของ KOHLER`
          : `${group.finishes.length} colours and finishes in KOHLER's ${group.title.en} reference.`,
      alternates: alternates(lang, path(slug)),
    };
  };

export default async function PaletteGroupPage({ params, lang }: Props & { lang: Lang }) {
  const { slug } = await params;
  const group = groups.find((g) => g.slug === slug);
  if (!group) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: group.title[lang],
    url: treeUrl(lang, path(slug)),
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <PaletteGroupContent group={group} />
      <JsonLd data={jsonLd} />
    </>
  );
}
