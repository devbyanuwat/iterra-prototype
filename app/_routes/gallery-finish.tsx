// /gallery/[finish] = สนามภาพเชิงลึกของเฉดเดียว (task B2 ข้อ 2)
//
// นี่คือ "เหตุผลที่ต้องมี /gallery" ที่หายไป: หน้า /finish/[code] วางของทั้งเฉดเป็น
// กริดแบน ๆ อยู่แล้ว ก้าวถัดไปที่สมเหตุสมผลของคนที่ยืนอยู่ตรงนั้นคือเห็นของชุดเดิม
// ลอยอยู่ในที่ว่าง ไม่ใช่ "ไปดูแกลเลอรี" ที่เป็นของคนละชุด
//
// เป็นหน้าจริง 11 หน้าต่อภาษาใน static export ไม่ใช่ ?finish= ที่กรองฝั่ง client:
// สนามของ /gallery มีแค่ 48 ระนาบและกระจายทั้ง 11 เฉด กรองทีหลังจะเหลือเฉดละ
// สี่ห้าใบ ซึ่งไม่ใช่สนาม — และลิงก์ที่แชร์ออกไปควรเปิดได้โดยไม่ต้องพึ่ง JS

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DepthGallery from '@/components/DepthGallery';
import { finishCodes, getFinishEntry } from '@/components/finish-index';
import { thaiJoin, type Lang } from '@/lib/i18n';
import { products } from '@/lib/products';
import { alternates, fieldHrefs } from '@/app/_lib/routes';
import { finishPlanes } from './parts/finish-planes';

type Params = { finish: string };
export type Props = { params: Promise<Params> };

export const path = (finish: string) => `/gallery/${encodeURIComponent(finish)}/`;

// รหัสเฉดสองตัวที่ต้องระวัง ('0' = White, '2MB' = Moderne Brass) อธิบายไว้ที่
// app/_routes/finish.tsx — ที่นี่ใช้ finishCodes ชุดเดียวกันจึงได้เงื่อนไขเดียวกัน
export function staticParams() {
  return finishCodes.map((finish) => ({ finish }));
}

export const meta =
  (lang: Lang) =>
  async ({ params }: Props): Promise<Metadata> => {
    const { finish } = await params;
    const entry = getFinishEntry(finish);
    if (!entry) return {};
    const title =
      lang === 'th'
        ? `สนามภาพเชิงลึก — เฉด${thaiJoin(entry.name.th)}`
        : `${entry.name.en} in space — the depth field`;
    const description =
      lang === 'th'
        ? `สินค้า ${entry.count} ชิ้นในเฉด${thaiJoin(entry.name.th)} ลอยอยู่ในสนามภาพเชิงลึก เลื่อนเมาส์เพื่อเดินดู คลิกเพื่อเปิดชิ้นนั้นในเฉดนี้`
        : `${entry.count} pieces in ${entry.name.en}, suspended in the depth field. Move the mouse to walk through them; click one to open it in this finish.`;
    return { title, description, alternates: alternates(lang, path(finish)) };
  };

export default async function GalleryFinishPage({ params, lang }: Props & { lang: Lang }) {
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
        planes={fieldHrefs(lang, planes)}
        index={fieldHrefs(lang, index)}
        total={products.length}
        finish={{ code: finish, name: entry.name, count: entry.count }}
      />
    </>
  );
}
