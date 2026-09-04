import type { Metadata } from 'next';
import InfoContent from '@/components/InfoContent';
import { contentPages, getContentPage } from '@/lib/pages';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

export const path = (slug: string) => `/info/${slug}/`;

export function staticParams() {
  return contentPages.map((page) => ({ slug: page.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const page = getContentPage(slug);
    if (!page) return {};
    const t = dict[lang].info;

    // /faq ว่างที่ต้นทาง — ชื่อหน้าของมันคือคำว่า "Empty" ตามตัวอักษร
    // เอาไปเป็น <title> ไม่ได้ และ description ก็ต้องบอกความจริงว่าทำไมมันว่าง
    if (page.status === 'stub') {
      return {
        title: t.stubTitle,
        description: t.stubBody,
        alternates: alternates(lang, path(slug)),
      };
    }

    // /kohler-service-solution ไม่มีทั้ง <h1> และหัวข้อใด ๆ ที่ต้นทาง
    // ตกกลับไปหาอีกภาษาก่อนจะยอมใช้ชื่อสำรอง — หน้าเหล่านี้บางหน้ามีหัวข้อ
    // ภาษาเดียวที่ต้นทาง และหัวข้อผิดภาษายังบอกได้มากกว่าคำว่า "บริการหลังการขาย"
    const title = page.title[lang] || page.title.th || page.title.en || t.untitled;
    const lead = page.paragraphs[0]?.[lang] ?? page.tiles[0]?.blurb[lang] ?? t.sub;

    return {
      title,
      description: lead.slice(0, 180),
      alternates: alternates(lang, path(slug)),
    };
  };

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  return <InfoContent slug={slug} />;
}
