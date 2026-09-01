// /finish/[code] = แคตตาล็อกของเฉดนั้น (spec finish-first §4.2)
//
// นี่คือปลายทางของกำแพงหน้าแรก ทั้ง 11 แผงชี้มาที่นี่ — ก่อนหน้านี้เส้นทางนี้ยังไม่มี
// ตัวนำทางหลักของเว็บจึงพาไป 404 ทั้งหมด
//
// ทำไมเป็น server component บาง ๆ ครอบ client component:
// รูปแบบเดียวกับ /products และ /contact — เมทาดาทากับ JSON-LD ต้องออกมาจากฝั่ง
// server ส่วนการสลับเฉดแบบไม่โหลดหน้าใหม่ (AC 5) ต้องเป็น state ฝั่ง client

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FinishContent from '@/components/FinishContent';
import JsonLd from '@/components/JsonLd';
import { finishCodes, finishOf, getFinishEntry } from '@/components/finish-index';
import { thaiJoin } from '@/lib/i18n';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ code: string }> };

// static export ต้องรู้ทุกค่าล่วงหน้า — finishCodes มาจาก finishIndex ตัวเดียวกับที่
// กำแพงใช้ ลิงก์กับหน้าจึงมาจากแหล่งความจริงเดียว เพิ่มเฉดใหม่แล้วได้หน้าเองอัตโนมัติ
//
// รหัสสองตัวที่ต้องระวังเป็นพิเศษ:
//   '0'   (White, 68 ชิ้น) — เป็นสตริงที่ "หน้าตาเหมือนเลข" ห้ามเผลอเช็ค truthiness
//                            หรือแปลงเป็น number ที่ไหน ไม่งั้นเฉดที่ใหญ่เป็นอันดับสอง
//                            ของแคตตาล็อกจะหายไปเงียบ ๆ
//   '2MB' (Moderne Brass)  — ขึ้นต้นด้วยตัวเลข ใช้เป็นชื่อ property ตรง ๆ ไม่ได้
// ทั้งคู่ไม่มีอักขระที่ต้อง percent-encode จึงเดินทางผ่าน URL ได้ตรง ๆ
// Next ถอด encode ให้แล้วก่อนส่งเข้า params — ห้าม decodeURIComponent ซ้ำที่นี่
export function generateStaticParams() {
  return finishCodes.map((code) => ({ code }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const entry = getFinishEntry(code);
  if (!entry) return {};
  return {
    title: `ทั้งห้องในเฉด${thaiJoin(entry.name.th)} (${entry.name.en})`,
    description: `สินค้า ${entry.count} ชิ้นในแคตตาล็อก ITERRA ที่มีผิวเคลือบ${thaiJoin(entry.name.th)} — ทุกชิ้นแสดงในเฉดนี้จริง สัมผัสของจริงได้ที่โชว์รูม`,
    alternates: { canonical: `/finish/${code}/` },
    openGraph: {
      title: `ทั้งห้องในเฉด${thaiJoin(entry.name.th)}`,
      description: `${entry.count} ชิ้นในเฉด${thaiJoin(entry.name.th)}`,
    },
  };
}

export default async function FinishPage({ params }: Props) {
  const { code } = await params;
  // ไม่ใช้ `if (!code)` — '0' เป็นสตริงจึง truthy อยู่แล้ว แต่เขียนแบบนี้ชัดกว่า
  // ว่าเรากำลังถามว่า "มีเฉดนี้จริงไหม" ไม่ใช่ "พารามิเตอร์ว่างไหม"
  const entry = getFinishEntry(code);
  if (!entry) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `ทั้งห้องในเฉด${thaiJoin(entry.name.th)}`,
    url: `${SITE_URL}/finish/${code}/`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entry.count,
      itemListElement: entry.products.slice(0, 20).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/products/${p.slug}/`,
        name: p.name.th,
        image: finishOf(p, code)?.image,
      })),
    },
  };

  return (
    <>
      {/* --accent มาจาก HTML ที่ static export เขียนไว้ ไม่ได้รอ JS
          ถ้าปล่อยให้ client เป็นคนตั้ง หน้าจะขึ้นด้วยสีทอง #c9a227 จาก globals.css
          แล้วค่อยกระโดดไปสีเฉดหลัง hydrate ซึ่งเห็นได้ชัดบนเฉดที่สีต่างกันมาก
          FinishContent เขียนทับด้วย inline style บน <html> ตอน tween — inline
          ชนะกฎใน <style> เสมอ จึงไม่ต้องกังวลลำดับ
          entry.accent มาจากข้อมูลของเราเองและถูกกรองด้วย regex ก่อนฝัง */}
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--accent:${/^#[0-9a-fA-F]{6}$/.test(entry.accent) ? entry.accent : '#232323'}}`,
        }}
      />
      <FinishContent code={code} />
      <JsonLd data={jsonLd} />
    </>
  );
}
