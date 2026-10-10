'use client';

// หน้าผลงานอ้างอิง: การ์ดโครงการ (ภาพ ชื่อ ที่ตั้ง ประเภท ปี สินค้าที่ใช้) · ไม่มีหน้ารายละเอียดรายโครงการ
// id ของการ์ด = slug ให้ผลค้นหาลิงก์มาที่ /projects/#slug ได้

import Link from 'next/link';
import Reveal from './Reveal';
import ProjectSlides from './ProjectSlides';
import { useLang } from './LangProvider';
import { projects } from '@/lib/projects';
import { getProduct } from '@/lib/products';

export default function ProjectsContent() {
  const { lang, t } = useLang();
  return (
    <>
      <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">PROJECT REFERENCE</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.projects.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.projects.sub}</p>
          <p className="mt-2 text-xs font-normal text-stone-600">{t.projects.sample}</p>
        </Reveal>
      </section>
      <section className="px-6 pb-28 md:px-[8vw]">
        <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 0.12} y={30} className="spot-lift">
              <article id={p.slug} className="spot -m-4 scroll-mt-28 bg-paper p-4">
                <ProjectSlides images={p.images} alt={p.name[lang]} />
                <p className="mt-5 text-[10px] uppercase tracking-widest2 text-warm-500">
                  {p.type[lang]} · {p.location[lang]} · {p.year}
                </p>
                <h2 className="mt-2 text-lg font-light leading-snug tracking-wide">{p.name[lang]}</h2>
                <p className="mt-3 text-[11px] font-normal uppercase tracking-widest2 text-warm-500">{t.projects.used}</p>
                <ul className="mt-1">
                  {p.products.map((slug) => {
                    const product = getProduct(slug);
                    return product ? (
                      <li key={slug}>
                        <Link href={`/products/${slug}/`} className="inline-flex min-h-11 items-center text-[13px] font-light underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink">
                          {product.name[lang]}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
