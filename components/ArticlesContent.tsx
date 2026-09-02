'use client';

// หน้ารวมบทความ
//
// เปลี่ยนสองอย่างจากเดิม:
//
// 1. บทความไม่ใช่ของเราแล้ว — lib/posts.ts เป็นบทความจริงของ KOHLER สิบชิ้น
// ภาพปกจึงเป็นภาพของบทความนั้นเอง (post.cover) ไม่ใช่ภาพจาก lifestyle registry
// และการ์ดทุกใบต้องบอกที่มา ไม่ใช่ปล่อยให้อ่านเหมือนเราเขียนเอง
//
// 2. ไม่มีวันที่ให้แสดง KOHLER ไม่ได้ประกาศวันเผยแพร่ไว้ที่ไหนเลย — ไม่มีใน
// markup ไม่มีใน JSON-LD และ sitemap ของเขาประทับเวลาเป็นเวลาที่เรายิง
// request จึงตัดวันที่ออกจากการ์ดแล้วใส่ที่มาแทน การแต่งวันที่ขึ้นมาสิบวัน
// เพื่อให้การ์ดดู"ครบ" คือการกุข้อมูล ซึ่งแย่กว่าการไม่มีวันที่
//
// ป้ายวิดีโอบนการ์ด: บทความที่มีวิดีโอจะติดป้ายไว้ที่ปก คนอ่านจะได้รู้ก่อนกดเข้าไป
// ตัววิดีโอเองยังไม่โหลดอะไรจาก YouTube จนกว่าจะกดในหน้าบทความ (ดู VideoEmbed)

import Link from '@/components/Link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { posts } from '@/lib/posts';
import { articlesIntro, pick } from '@/lib/i18n';

// ความกว้างจริงของการ์ดที่ 1440 — เลือก rendition ไม่ให้ภาพถูกขยาย
const CARD_SLOT = 370;

export default function ArticlesContent() {
 const { lang, t } = useLang();

 return (
 <>
 <section className="px-6 pb-14 pt-36 md:px-[8vw] md:pb-20 md:pt-44">
 <Reveal>
 <p className="mb-4 micro">{t.articles.kicker}</p>
 {/* text-hero ไม่ใช่ text-section : utility ของ Tailwind มาพร้อม line-height 1
 ซึ่งชน element rule ของเราแล้วชนะ พาดหัวไทยที่นี่จึงเคยวิ่งที่ 48px/1.0
 ซึ่งต่ำกว่าพื้นที่ Sarabun ต้องการมาก — ดู tailwind.config.ts */}
 <h1 className="font-display text-hero font-normal text-ink">{t.nav.articles}</h1>
 <p className="mt-6 max-w-xl text-body text-dim">{pick(articlesIntro, lang)}</p>
 </Reveal>
 </section>

 <section className="px-6 pb-28 md:px-[8vw]">
 <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
 {posts.map((post, i) => {
 const cover = post.cover;
 const hasVideo = post.videos.length > 0;
 return (
 <Reveal key={post.slug} delay={(i % 3) * 0.12} y={30}>
 <Link href={`/articles/${post.slug}/`} className="group block">
 <div className="relative overflow-hidden border border-line-6 bg-surface">
 <div
 className="transition-transform duration-700 ease-out group-hover:scale-105"
 style={{ aspectRatio: '3 / 2' }}
 >
 {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์ local */}
 <img
 src={cover.width > CARD_SLOT * 1.5 ? cover.src : cover.srcSmall}
 alt={cover.alt}
 width={cover.width}
 height={cover.height}
 className="h-full w-full object-cover"
 loading="lazy"
 decoding="async"
 />
 </div>
 {hasVideo && (
 <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5">
 <svg width="9" height="11" viewBox="0 0 20 24" aria-hidden>
 <path d="M0 0 L20 12 L0 24 Z" fill="#ffffff" />
 </svg>
 <span className="micro !text-white">
 {post.videos.length > 1 ? `${post.videos.length} ` : ''}
 {t.video.play}
 </span>
 </span>
 )}
 </div>

 {/* หมวดแทนวันที่ — เหตุผลอยู่หัวไฟล์
 ไม่ต่อท้ายด้วย 'KOHLER' เพราะ tag ปริยายคือ 'เรื่องเล่าจาก KOHLER'
 อยู่แล้ว จะได้ 'KOHLER · KOHLER' ที่มาพูดครั้งเดียวท้ายรายการ */}
 <p className="mt-5 micro">{lang === 'en' ? post.tagEn : post.tag}</p>
 <h2 className="mt-2 text-card font-normal text-ink">{post.title[lang]}</h2>
 <p className="mt-3 text-body-sm leading-relaxed text-dim">
 {post.excerpt[lang]}
 </p>
 <span className="mt-4 inline-block micro underline-offset-8 group-hover:underline">
 {t.common.readMore} →
 </span>
 </Link>
 </Reveal>
 );
 })}
 </div>

 {/* พูดครั้งเดียวให้ชัดท้ายรายการ ไม่ใช่ตัวเล็กจิ๋วที่ footer */}
 <Reveal className="mt-16 border-t border-line-6 pt-8">
 <p className="text-body-sm text-dim">{t.articles.sourceNote}</p>
 </Reveal>
 </section>
 </>
 );
}
