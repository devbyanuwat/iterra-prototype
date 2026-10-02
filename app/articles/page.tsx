import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';
import { posts } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'บทความ — ไอเดียครัวสไตล์โชว์รูม',
  description:
    'รวมบทความไอเดียครัวจากทีม ITERRA — วิธีจัดครัวให้เหมือนโชว์รูม คู่มือเลือกซื้อ และเทรนด์วัสดุพรีเมียม',
  alternates: { canonical: '/articles/' },
};

export default function ArticlesPage() {
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">JOURNAL</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">บทความ</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">
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
                    <ParallaxImage label={post.cover} ratio="16/9" speed={i % 2 ? 5 : -5} />
                  </div>
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-widest2 text-warm-500">
                  {post.tag} ·{' '}
                  {new Date(post.date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <h2 className="mt-2 text-lg font-light leading-snug tracking-wide">{post.title.th}</h2>
                <p className="mt-2 text-[13px] font-light leading-relaxed text-warm-500">{post.excerpt.th}</p>
                <span className="mt-4 inline-block text-[11px] uppercase tracking-widest2 underline-offset-8 group-hover:underline">
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
