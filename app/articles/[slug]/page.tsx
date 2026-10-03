import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';
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

  // แทรกภาพ parallax หลังย่อหน้าที่ 2 และ 4
  const imageAfter: Record<number, string> = { 1: post.inline[0], 3: post.inline[1] };

  return (
    <article className="px-6 pb-28 pt-36 md:pt-44">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">
            {post.tag} ·{' '}
            {new Date(post.date).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="text-3xl font-extralight leading-snug tracking-wide md:text-5xl md:leading-[1.25]">
            {post.title.th}
          </h1>
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-12 max-w-4xl">
        <ParallaxImage src={post.cover} ratio="16/9" speed={-6} />
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl">
        {post.body.map((para, i) => (
          <div key={i}>
            <Reveal y={24}>
              <p className="mb-8 text-[15px] font-light leading-loose text-stone-700">{para}</p>
            </Reveal>
            {imageAfter[i] && (
              <Reveal className="mb-10">
                <ParallaxImage src={imageAfter[i]} ratio="3/2" speed={i % 2 ? 6 : -6} />
              </Reveal>
            )}
          </div>
        ))}

        <Reveal>
          <div className="mt-12 border-t border-warm-200 pt-8">
            <Link
              href="/articles/"
              className="text-[11px] uppercase tracking-widest2 underline-offset-8 hover:underline"
            >
              ← กลับไปหน้าบทความ
            </Link>
          </div>
        </Reveal>
      </div>

      <JsonLd data={jsonLd} />
    </article>
  );
}
