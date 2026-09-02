// /gallery/[finish] = สนามภาพเชิงลึกของเฉดเดียว (task B2 ข้อ 2)
//
// นี่คือ "เหตุผลที่ต้องมี /gallery" ที่หายไป: หน้า /finish/[code] วางของทั้งเฉดเป็น
// กริดแบน ๆ อยู่แล้ว ก้าวถัดไปที่สมเหตุสมผลของคนที่ยืนอยู่ตรงนั้นคือเห็นของชุดเดิม
// ลอยอยู่ในที่ว่าง ไม่ใช่ "ไปดูแกลเลอรี" ที่เป็นของคนละชุด
//
// เป็นหน้าจริง 11 หน้าใน static export ไม่ใช่ ?finish= ที่กรองฝั่ง client:
// สนามของ /gallery มีแค่ 48 ระนาบและกระจายทั้ง 11 เฉด กรองทีหลังจะเหลือเฉดละ
// สี่ห้าใบ ซึ่งไม่ใช่สนาม — และลิงก์ที่แชร์ออกไปควรเปิดได้โดยไม่ต้องพึ่ง JS

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DepthGallery from '@/components/DepthGallery';
import { finishCodes, getFinishEntry } from '@/components/finish-index';
import { thaiJoin } from '@/lib/i18n';
import { products } from '@/lib/products';
import { finishPlanes } from '../finish-planes';

type Props = { params: Promise<{ finish: string }> };

// รหัสเฉดสองตัวที่ต้องระวัง ('0' = White, '2MB' = Moderne Brass) อธิบายไว้ที่
// app/finish/[code]/page.tsx — ที่นี่ใช้ finishCodes ชุดเดียวกันจึงได้เงื่อนไขเดียวกัน
export function generateStaticParams() {
  return finishCodes.map((finish) => ({ finish }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { finish } = await params;
  const entry = getFinishEntry(finish);
  if (!entry) return {};
  return {
    title: `สนามภาพเชิงลึก — เฉด${thaiJoin(entry.name.th)} | ${entry.name.en} in space`,
    description: `สินค้า ${entry.count} ชิ้นในเฉด${thaiJoin(entry.name.th)} ลอยอยู่ในสนามภาพเชิงลึก เลื่อนเมาส์เพื่อเดินดู คลิกเพื่อเปิดชิ้นนั้นในเฉดนี้`,
    alternates: { canonical: `/gallery/${finish}/` },
  };
}

export default async function GalleryFinishPage({ params }: Props) {
  const { finish } = await params;
  const entry = getFinishEntry(finish);
  if (!entry) notFound();

  const { planes, index } = finishPlanes(finish);

  return (
    <>
      {/* --accent ของเฉดนี้ตั้งแต่ HTML เหมือน /finish/[code] — คนเดินมาจากหน้านั้น
          สีของหน้าจึงต้องไม่กระโดดกลับเป็นทองระหว่างทาง
          entry.accent มาจากข้อมูลของเราเองและถูกกรองด้วย regex ก่อนฝัง */}
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--accent:${/^#[0-9a-fA-F]{6}$/.test(entry.accent) ? entry.accent : '#232323'}}`,
        }}
      />
      <DepthGallery
        planes={planes}
        index={index}
        total={products.length}
        finish={{ code: finish, name: entry.name, count: entry.count }}
      />
    </>
  );
}
