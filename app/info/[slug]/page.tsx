import type { Metadata } from 'next';
import InfoContent from '@/components/InfoContent';
import { contentPages, getContentPage } from '@/lib/pages.generated';
import { dict, DEFAULT_LANG } from '@/lib/i18n';

const t = dict[DEFAULT_LANG];

export function generateStaticParams() {
  return contentPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getContentPage(slug);
  if (!page) return {};

  // /faq ว่างที่ต้นทาง — ชื่อหน้าของมันคือคำว่า "Empty" ตามตัวอักษร
  // เอาไปเป็น <title> ไม่ได้ และ description ก็ต้องบอกความจริงว่าทำไมมันว่าง
  if (page.status === 'stub') {
    return {
      title: t.info.stubTitle,
      description: t.info.stubBody,
      alternates: { canonical: `/info/${slug}/` },
    };
  }

  // /kohler-service-solution ไม่มีทั้ง <h1> และหัวข้อใด ๆ ที่ต้นทาง
  const title = page.title[DEFAULT_LANG] || page.title.th || t.info.untitled;
  const lead = page.paragraphs[0]?.[DEFAULT_LANG] ?? page.tiles[0]?.blurb[DEFAULT_LANG] ?? t.info.sub;

  return {
    title,
    description: lead.slice(0, 180),
    alternates: { canonical: `/info/${slug}/` },
  };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <InfoContent slug={slug} />;
}
