// รูปของคู่มือเลือกซื้อ — id เดียว สองคลัง (task C1)
//
// `image` ใน lib/guides.generated.ts เป็น id ล้วน ๆ และหัวไฟล์นั้นบอกว่า "resolved
// against lib/lifestyle.generated.ts" ซึ่งจริงแค่ครึ่งเดียว: จาก 110 รูปที่คู่มืออ้างถึง
// มี 45 ใบอยู่ในคลังไลฟ์สไตล์ และอีก 65 ใบอยู่ใน lib/tiles.generated.ts ซึ่งเป็นคลัง
// แผ่นอ้างอิง (ชิปสี ไทล์หมวดหมู่ ไดอะแกรม) ที่ถูกแยกออกมาโดยตั้งใจ
// ตัวแก้ที่ถูกคือถามทั้งสองคลัง ไม่ใช่ปล่อยให้ 65 ใบเป็นกรอบว่าง
//
// ทั้งสองคลังมีวินัยเดียวกัน: ไม่มีการขยายภาพเกินไฟล์จริง `maxWidth` บอกความกว้าง
// ที่ใบนั้นเติมได้อย่างซื่อสัตย์ ตัวเลือกในคู่มือจึงถูกวางในช่องแคบ (~200px) เพราะ
// ไทล์ส่วนใหญ่กว้าง 400px จริง ๆ — ช่องกว้างกว่านั้นคือการขยายภาพให้เบลอ

import { getTile } from '@/lib/tiles.generated';
import { lifestyleImages } from '@/lib/lifestyle';

export type GuidePicture = {
  /** ไฟล์ที่เล็กที่สุดที่ยังคลุมช่องได้ — ใช้เป็น src ตั้งต้น */
  src: string;
  /** ทุกเรนดิชันที่มีจริง ให้เบราว์เซอร์เลือกตาม dpr */
  srcSet: string;
  width: number;
  height: number;
  /** ความกว้าง CSS ที่ใบนี้เติมได้โดยไม่ถูกขยาย */
  maxWidth: number;
};

/**
 * รูปหนึ่งใบจาก id ของคู่มือ — คืน undefined เมื่อไม่มีจริงในคลังไหนเลย
 *
 * ไม่มี alt: ตัวเลือกทุกใบมีป้ายข้อความของตัวเองอยู่ข้าง ๆ อยู่แล้ว รูปจึงเป็นของ
 * ประดับ (`alt=""`) การใส่ alt ซ้ำกับป้ายคือการให้โปรแกรมอ่านหน้าจออ่านสองรอบ
 */
export function guidePicture(id: string | null | undefined): GuidePicture | undefined {
  if (!id) return undefined;

  const life = lifestyleImages.find((image) => image.id === id);
  if (life) {
    return {
      src: life.src.w900,
      srcSet: life.sources.map((s) => `${s.src} ${s.width}w`).join(', '),
      width: life.width,
      height: life.height,
      maxWidth: life.maxWidth,
    };
  }

  const tile = getTile(id);
  if (tile) {
    return {
      src: tile.sources[tile.sources.length - 1].src,
      srcSet: tile.sources.map((s) => `${s.src} ${s.width}w`).join(', '),
      width: tile.width,
      height: tile.height,
      maxWidth: tile.maxWidth,
    };
  }

  return undefined;
}

/** รูปแรกที่หาได้ในคู่มือ — ใช้เป็นภาพหน้าปกของการ์ดในหน้ารวม */
export function coverPicture(sections: { options: { image: string | null }[] }[]) {
  for (const section of sections) {
    for (const option of section.options) {
      const picture = guidePicture(option.image);
      if (picture) return picture;
    }
  }
  return undefined;
}
