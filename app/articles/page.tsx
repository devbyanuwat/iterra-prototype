import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';
import { posts } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'บทความ — ไอเดียครัวสไตล์โชว์รูม',
  description:
    'รวมบทความไอเดียครัวและห้องน้ำจากทีม ITERRA — วิธีจัดครัวให้เหมือนโชว์รูม คู่มือเลือกซื้อ และเทรนด์วัสดุพรีเมียม',
  alternates: { canonical: '/articles/' },
};

export default function ArticlesPage() {
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">JOURNAL</p>
          <h1 className="font-display text-4xl font-extralight tracking-wide text-cream md:text-5xl">บทความ</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-dim">
            ไอเดียครัวสไตล์โชว์รูม คู่มือเลือกซื้อ และเรื่องเล่าจากหน้างานจริง
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={(i % 3) * 0.12} y={30}>
              <Link href={`/articles/${post.slug}/`} className="group block">
                <div className="overflow-hidden">
                  <div className="transition-transform duration-700 ease-out group-hover:scale-105">
                    <ParallaxImage ratio="16/9" speed={i % 2 ? 5 : -5} sizes="(max-width: 768px) 100vw, 30vw" />
                  </div>
                </div>
                <p className="mt-5 micro">
                  {post.tag} ·{' '}
                  {new Date(post.date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <h2 className="mt-2 text-lg font-light leading-snug tracking-wide text-cream">{post.title.th}</h2>
                <p className="mt-2 text-[13px] font-light leading-relaxed text-dim">{post.excerpt.th}</p>
                <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
                  อ่านต่อ →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
