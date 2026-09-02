import type { Metadata } from 'next';
import HomeHero from '@/components/home/HomeHero';
import HomeContent from '@/components/home/HomeContent';
import { DEPTH_SEED_ID, GALLERY_PLANES, entryPlanes } from '@/components/depth-field';
import { dict, type Lang } from '@/lib/i18n';
import { alternates, fieldHrefs } from '@/app/_lib/routes';

export const path = '/';

export const meta = (lang: Lang): Metadata => ({
  // absolute: ชื่อหน้าแรกมีคำว่า KOHLER อยู่ในตัวแล้ว ถ้าปล่อยให้ template ของ
  // root layout ต่อท้ายจะได้ 'KOHLER — … — KOHLER'
  title: { absolute: dict[lang].meta.home.title },
  description: dict[lang].meta.home.description,
  alternates: alternates(lang, path),
});

// กำแพงสิบเอ็ดเฉดย้ายไปอยู่หัวหน้า /products แล้ว (task X ข้อ 1)
// ลูกค้าอ่านกำแพงว่า "ไม่สวยพอจะเป็นหน้าแรก" และมันทำงานผิดหน้าที่: การเลือกเฉด
// คือวิธีกรองของ 182 ชิ้น ไม่ใช่ประตูหน้าบ้าน หน้าแรกจึงกลับไปเป็น hero ภาพจริง
// ส่วนการนำทางด้วยเฉดยังอยู่ครบ — บล็อกจานสีใน HomeContent ลิงก์เข้ากริดที่กรอง
// เฉดนั้นไว้แล้ว และกำแพงตัวจริงอยู่ห่างออกไปหนึ่งคลิก
/**
 * ตัวอย่างสนามของบล็อกทางเข้า /gallery (task B2 ข้อ 2)
 *
 * เอาเฉพาะระนาบ "สินค้า" ของประตูเข้า ไม่ใช่ชุดใหม่ และไม่ใช่ระนาบห้อง:
 *   • สินค้า — ไฟล์เดียวกับที่ประตูเข้าโหลดไปแล้วตอนหน้าโหลด บล็อกนี้จึงเป็น
 *     cache hit ล้วน ไม่เพิ่มไบต์ให้หน้าแรกแม้แต่ใบเดียว
 *   • ห้อง   — ถูกเลื่อนให้โหลดทีหลังในประตูเข้า (deferRooms) ถ้าเอามาใช้ที่นี่
 *     ก็เท่ากับดึงมันกลับมาโหลดทันที ซึ่งเป็นสิ่งที่ deferRooms ตั้งใจเลี่ยง
 *
 * 24 ใบ: พอให้อ่านเป็นสนามในกล่องสูง 78svh โดยไม่ต้องจ่ายค่า compositing
 * เท่าประตูเข้า (58 ใบ) ซึ่งบล็อกนี้ไม่ได้ต้องการ
 */
const FIELD_ENTRY_PLANES = 24;

export default function HomePage({ lang }: { lang: Lang }) {
  // fieldHrefs: ระนาบพก href ของสินค้ามาจากชุดข้อมูล ไม่ได้ผ่าน <Link> ของเรา
  // ในหน้าไทย ทั้งสนามในประตูเข้าและสนามตัวอย่างต้องพาไปหน้าไทย ไม่ใช่โยนผู้อ่าน
  // ข้ามต้นไม้กลับไปอังกฤษตั้งแต่คลิกแรกของเว็บ
  const planes = fieldHrefs(lang, entryPlanes());
  const preview = planes.filter((p) => p.kind === 'product').slice(0, FIELD_ENTRY_PLANES);

  return (
    <>
      {/* ชุดระนาบของประตูเข้า (spec depth-field §4.1)
          Preloader อยู่ใน root layout จึงอยู่ทุกหน้า ถ้ามัน import ชุดข้อมูลนี้เอง
          /about กับ /contact ต้องโหลดแคตตาล็อก 424KB + คลังไลฟ์สไตล์เพื่อโชว์หน้าโหลด
          ซึ่งย้อนแย้งในตัวเอง — หน้าแรกซึ่งเป็น server component จึงคำนวณให้แล้วฝาก
          ไว้ใน HTML ที่ static export ส่งมา อ่านได้ตั้งแต่ก่อน hydrate

          replace('<') — JSON ที่มี "</script>" อยู่ในข้อมูลจะปิดแท็กกลางคัน
          ชื่อสินค้าไทยไม่มี '<' อยู่แล้ว แต่ค่านี้มาจากข้อมูลที่ถูก generate ใหม่ได้
          และการรับประกันที่พึ่ง "ข้อมูลคงไม่มีอักขระนั้น" ไม่ใช่การรับประกัน */}
      <script
        id={DEPTH_SEED_ID}
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(planes).replace(/</g, '\\u003c'),
        }}
      />
      <HomeHero />
      <HomeContent fieldPlanes={preview} galleryTotal={GALLERY_PLANES} />
    </>
  );
}
