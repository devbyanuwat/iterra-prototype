import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ArticleContent from '@/components/ArticleContent';
import { postTitle, scriptOf, type Lang } from '@/lib/i18n';
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
    // ── task E1: <title> ของหน้าอังกฤษต้องเป็นอังกฤษ ─────────────────────────
    //
    // <title> เป็น element ที่มีลูกเป็น element ไม่ได้ จึงติด lang= ไม่ได้เลย
    // ทางเดียวที่มันจะไม่ใช่ "ข้อความที่ถูกติดป้ายผิดภาษา" คือเลือกคำให้ถูกภาษา
    // ตั้งแต่แรก — ต่างจากเนื้อความในหน้า ซึ่งติดป้ายได้และยังเป็นไทยตามต้นฉบับ
    const head = postTitle(post, lang);
    // คำโปรยไทยยังใช้ได้ในต้นไม้ไทย ส่วนต้นไม้อังกฤษบอกความจริงเรื่องภาษาแทน
    // ที่จะเสิร์ฟไทยลงผลค้นหาอังกฤษ (ท่าเดียวกับคำบรรยายของ /guides/[slug])
    const description =
      lang === 'th' || scriptOf(post.excerpt.en ?? '') === 'en'
        ? post.excerpt[lang]
        : `${head.text} — from KOHLER’s journal. The source publishes this article in Thai only, so the article text itself is Thai.`;
    return {
      title: head.text,
      description,
      alternates: alternates(lang, path(post.slug)),
      openGraph: { type: 'article', title: head.text, description },
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
  const head = postTitle(post, lang);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: head.text,
    // ไม่ใส่ description ที่เป็นไทยลงใน JSON-LD ของหน้าอังกฤษ — ถ้ามีแต่ไทย
    // ให้ alternativeHeadline ถือพาดหัวจริงไว้พร้อมประกาศภาษาของมันแทน
    description: scriptOf(post.excerpt[lang]) === 'th' && lang === 'en' ? undefined : post.excerpt[lang],
    alternativeHeadline: head.text === post.title.th ? undefined : post.title.th,
    datePublished: post.date,
    // ภาษาของ **เนื้อหา** ไม่ใช่ของ URL: ต้นทางตีพิมพ์บทความชุดนี้เป็นไทยอย่าง
    // เดียว ทั้งสองต้นไม้จึงเสิร์ฟตัวบทเดียวกันที่เป็นไทย การประกาศ en ตรงนี้
    // จะเป็นการอ้างว่ามีฉบับแปลอยู่ ซึ่งไม่มี
    inLanguage: scriptOf((post.bodyEn ?? post.body).join(' ')) ?? lang,
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
