import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ArticleContent from '@/components/ArticleContent';
import type { Lang } from '@/lib/i18n';
import { getPost, posts } from '@/lib/posts';
import { SITE_NAME } from '@/lib/site';
import { alternates, treeUrl } from '@/app/_lib/routes';

type Params = { slug: string };
export type Props = { params: Promise<Params> };

export const path = (slug: string) => `/articles/${slug}/`;

export function staticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { slug } = await params;
    const post = getPost(slug);
    if (!post) return {};
    return {
      title: post.title[lang],
      description: post.excerpt[lang],
      alternates: alternates(lang, path(post.slug)),
      openGraph: { type: 'article', title: post.title[lang], description: post.excerpt[lang] },
    };
  };

export default async function ArticlePage({ params, lang }: Props & { lang: Lang }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // metadata กับ JSON-LD ถูกสร้างตอน build จึงเป็นภาษาเดียวได้เท่านั้น — และ
  // ตอนนี้ "ภาษาเดียว" นั้นคือภาษาของต้นไม้ ไม่ใช่ไทยตายตัวเหมือนเดิม
  //
  // ข้อจำกัดที่ยังอยู่และไม่ควรซ่อน: บทความสิบชิ้นนี้เป็นของ KOHLER และต้นทาง
  // ตีพิมพ์เป็นไทยอย่างเดียว ฟิลด์ en ของมันจึงถือข้อความไทยอยู่จริง (ดู
  // lib/posts.ts) หน้าอังกฤษของบทความจึงประกาศ inLanguage เป็นภาษาของเอกสาร
  // แต่ตัวเนื้อความยังเป็นไทย — ซึ่ง ArticleContent จัดการด้วย lang ระดับ
  // element ผ่าน resolve() ไม่ใช่ด้วยการโกหกที่ระดับหน้า
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title[lang],
    description: post.excerpt[lang],
    datePublished: post.date,
    inLanguage: lang,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: treeUrl(lang, path(post.slug)),
  };

  return (
    <>
      <ArticleContent slug={post.slug} />
      <JsonLd data={jsonLd} />
    </>
  );
}
