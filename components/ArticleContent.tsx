'use client';

// หน้าบทความเดี่ยว — เนื้อหาเป็นของ KOHLER ทั้งหมด (ดู header ของ lib/posts.ts)
//
// สามอย่างที่ต่างจากเดิม:
//
// 1. ภาพทั้งหมดมาจากบทความต้นทางเอง ไม่ใช่ lifestyle registry อีกแล้ว
// alt ของแต่ละภาพก็เป็น alt ที่ KOHLER เขียนไว้จริง ไม่ใช่ที่เราแต่ง
//
// 2. วิดีโอ บทความบางชิ้นมีวิดีโอเป็น"ช่องเปิด" ของหน้า (bannerVideo) บางชิ้น
// มีแทรกกลางเรื่อง วางตามที่ต้นฉบับวาง แต่ไม่มีอันไหนโหลดอะไรจาก YouTube
// จนกว่าจะกด — เหตุผลเต็มอยู่ใน components/VideoEmbed.tsx
//
// 3. ไม่มีวันที่ KOHLER ไม่ได้ประกาศวันเผยแพร่ไว้ที่ไหน หัวบทความจึงเป็น
// หมวด + ที่มา แทน และมีลิงก์ไปต้นฉบับจริงท้ายบทความ

import Link from 'next/link';
import Reveal from './Reveal';
import VideoEmbed from './VideoEmbed';
import { useLang } from './LangProvider';
import { getPost, type PostImage } from '@/lib/posts';

// แทรกภาพหลังย่อหน้าที่ 2 และ 4 เหมือนเดิม — ภาพมาจาก post.figures ตามลำดับ
const IMAGE_AFTER = [1, 3];
// วิดีโอที่ไม่ได้เป็นช่องเปิด แทรกหลังย่อหน้าที่ 3
const VIDEO_AFTER = 2;

// ความกว้างจริงของช่องที่ 1440 — เลือก rendition ไม่ให้ภาพถูกขยาย
const HERO_SLOT = 894;
const BODY_SLOT = 670;

/** กรอบภาพตามสัดส่วนจริงของไฟล์ — กันภาพกระโดดตอนโหลด */
function Figure({ image, slot }: { image: PostImage; slot: number }) {
 return (
 <div
 className="overflow-hidden border border-line-6 bg-surface"
 style={{ aspectRatio: `${image.width} / ${image.height}` }}
 >
 {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */}
 <img
 src={image.width > slot * 1.5 ? image.src : image.srcSmall}
 alt={image.alt}
 width={image.width}
 height={image.height}
 className="h-full w-full object-cover"
 loading="lazy"
 decoding="async"
 />
 </div>
 );
}

export default function ArticleContent({ slug }: { slug: string }) {
 const post = getPost(slug);
 const { lang, t } = useLang();
 if (!post) return null;

 const tag = lang === 'en' ? post.tagEn : post.tag;
 const body = lang === 'en' ? (post.bodyEn ?? post.body) : post.body;

 // ช่องเปิดของหน้า: วิดีโอถ้าต้นฉบับเปิดด้วยวิดีโอ ไม่งั้นเป็นภาพ hero
 const opener = post.videos.find((v) => v.id === post.bannerVideo) ?? null;
 const inlineVideos = post.videos.filter((v) => v !== opener);

 return (
 <article className="px-6 pb-28 pt-36 md:pt-44">
 <div className="mx-auto max-w-2xl">
 <Reveal>
 {/* ที่มาอยู่ท้ายบทความเป็นลิงก์จริง ตรงนี้จึงเป็นหมวดอย่างเดียว */}
 <p className="mb-4 micro">{tag}</p>
 {/* text-section เป็น clamp(40,5vw,72) และมาพร้อม line-height 1.35 ที่วัดมา
 สำหรับ Sarabun แล้ว — เดิมที่นี่เป็น text-section /text-section ซึ่ง utility ของ
 Tailwind บังคับ line-height 1.0 ทับกฎ h1 ของเราไป */}
 <h1 className="font-display text-section font-normal text-ink">{post.title[lang]}</h1>
 </Reveal>
 </div>

 <Reveal className="mx-auto mt-12 max-w-4xl">
 {opener ? <VideoEmbed video={opener} slot={HERO_SLOT} /> : <Figure image={post.hero} slot={HERO_SLOT} />}
 </Reveal>

 <div className="mx-auto mt-14 max-w-2xl">
 {body.map((para, i) => {
 const figureAt = IMAGE_AFTER.indexOf(i);
 const figure = figureAt >= 0 ? post.figures[figureAt] : undefined;
 const video = i === VIDEO_AFTER ? inlineVideos[0] : undefined;
 return (
 <div key={i}>
 <Reveal y={24}>
 <p className="mb-8 text-body leading-loose text-dim">{para}</p>
 </Reveal>
 {figure && (
 <Reveal className="mb-10">
 <Figure image={figure} slot={BODY_SLOT} />
 </Reveal>
 )}
 {video && (
 <Reveal className="mb-10">
 <VideoEmbed video={video} slot={BODY_SLOT} />
 </Reveal>
 )}
 </div>
 );
 })}

 {/* วิดีโอที่เหลือ (บางบทความมีสองตัว) ต่อท้ายเนื้อเรื่อง ไม่ทิ้ง */}
 {inlineVideos.slice(1).map((video) => (
 <Reveal key={video.id} className="mb-10">
 <VideoEmbed video={video} slot={BODY_SLOT} />
 </Reveal>
 ))}

 <Reveal>
 <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line-6 pt-8">
 <Link href="/articles/" className="micro underline-offset-8 hover:underline">
 ← {t.nav.articles}
 </Link>
 {/* ลิงก์ไปต้นฉบับ ไม่ใช่เพื่อ SEO แต่เพราะข้อความข้างบนทั้งหมดเป็นของเขา
 rel=noopener เพราะเปิดแท็บใหม่ */}
 <a
 href={post.source.url}
 target="_blank"
 rel="noopener noreferrer"
 className="micro underline-offset-8 hover:underline"
 >
 {t.articles.source} ↗
 </a>
 </div>
 </Reveal>
 </div>
 </article>
 );
}
