'use client';

// หน้ารวมไอเดีย (task C1)
//
// มีสองชุด (ห้องน้ำ กับ ครัว) การ์ดจึงกว้างครึ่งจอและใช้ภาพใหญ่ แทนที่จะเป็นกริด
// สามคอลัมน์ที่จะเหลือช่องว่างหนึ่งช่องค้างอยู่

import Link from '@/components/Link';
import Reveal from '@/components/Reveal';
import { useLang } from '@/components/LangProvider';
import type { Picture } from './idea-media';

export type HubCard = {
  slug: string;
  items: number;
  cover: Picture | null;
};

export default function IdeasContent({ hubs }: { hubs: HubCard[] }) {
  const { t } = useLang();

  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 micro">{t.ideas.kicker}</p>
          <h1 className="font-display text-hero font-normal text-ink">{t.ideas.title}</h1>
          <p className="mt-6 max-w-xl text-body text-dim">{t.ideas.intro(hubs.length)}</p>
        </Reveal>
      </section>

      <section className="px-6 pb-28 md:px-[8vw]">
        <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
          {hubs.map((hub, i) => (
            <li key={hub.slug}>
              <Reveal delay={i * 0.12} y={30}>
                <Link href={`/ideas/${hub.slug}/`} className="group block">
                  <div className="overflow-hidden border border-line-6 bg-surface">
                    <div
                      className="transition-transform duration-700 ease-out group-hover:scale-105"
                      style={{ aspectRatio: '3 / 2' }}
                    >
                      {hub.cover && (
                        /* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */
                        <img
                          src={hub.cover.src}
                          srcSet={hub.cover.srcSet}
                          sizes="(max-width: 768px) 100vw, 42vw"
                          alt=""
                          width={hub.cover.width}
                          height={hub.cover.height}
                          className="h-full w-full object-cover"
                          loading={i === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          fetchPriority={i === 0 ? 'high' : undefined}
                        />
                      )}
                    </div>
                  </div>
                  <p className="mt-5 micro">{t.ideas.stories(hub.items)}</p>
                  <h2 className="mt-2 font-display text-section font-normal text-ink">
                    {t.ideas.names[hub.slug] ?? hub.slug}
                  </h2>
                  <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
                    {t.common.readMore} →
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line-6 pt-8">
          <Link href="/articles/" className="micro underline-offset-8 hover:underline">
            {t.nav.articles} →
          </Link>
          <p className="w-full text-body-sm text-dim">{t.articles.sourceNote}</p>
        </Reveal>
      </section>
    </>
  );
}
