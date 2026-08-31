import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import ArticleContent from '@/components/ArticleContent';
import { getPost, posts } from '@/lib/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title.th,
    description: post.excerpt.th,
    alternates: { canonical: `/articles/${post.slug}/` },
    openGraph: { type: 'article', title: post.title.th, description: post.excerpt.th },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // metadata กับ JSON-LD ถูกสร้างตอน build จึงเป็นภาษาเดียวได้เท่านั้น
  // ทั้งไซต์ประกาศ lang="th" อยู่แล้ว ตรงนี้จึงคงเป็นไทย
  // ปุ่ม TH/EN สลับเฉพาะเนื้อหาที่ผู้ใช้เห็น ซึ่งอยู่ใน ArticleContent
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title.th,
    description: post.excerpt.th,
    datePublished: post.date,
    inLanguage: 'th',
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/articles/${post.slug}/`,
  };

  return (
    <>
      <ArticleContent slug={post.slug} />
      <JsonLd data={jsonLd} />
    </>
  );
}
