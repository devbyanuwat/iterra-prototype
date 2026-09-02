import type { Metadata } from 'next';
import HomeHero from '@/components/home/HomeHero';
import HomeContent from '@/components/home/HomeContent';
import { DEPTH_SEED_ID, entryPlanes } from '@/components/depth-field';

export const metadata: Metadata = {
  title: 'KOHLER — อุปกรณ์ครัวและสุขภัณฑ์พรีเมียม | Premium Kitchen & Bath',
  description:
    'อุปกรณ์ครัวและสุขภัณฑ์คัดสรรจากแบรนด์ชั้นนำระดับโลก — 182 รายการ สิบเอ็ดเฉดผิวเคลือบ สัมผัสจริงได้ที่โชว์รูม KOHLER กรุงเทพฯ',
  alternates: { canonical: '/' },
};

// กำแพงสิบเอ็ดเฉดย้ายไปอยู่หัวหน้า /products แล้ว (task X ข้อ 1)
// ลูกค้าอ่านกำแพงว่า "ไม่สวยพอจะเป็นหน้าแรก" และมันทำงานผิดหน้าที่: การเลือกเฉด
// คือวิธีกรองของ 182 ชิ้น ไม่ใช่ประตูหน้าบ้าน หน้าแรกจึงกลับไปเป็น hero ภาพจริง
// ส่วนการนำทางด้วยเฉดยังอยู่ครบ — บล็อกจานสีใน HomeContent ลิงก์เข้ากริดที่กรอง
// เฉดนั้นไว้แล้ว และกำแพงตัวจริงอยู่ห่างออกไปหนึ่งคลิก
export default function HomePage() {
  return (
    <>
      {/* ชุดระนาบของประตูเข้า (spec depth-field §4.1)
          Preloader อยู่ใน app/layout.tsx จึงอยู่ทุกหน้า ถ้ามัน import ชุดข้อมูลนี้เอง
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
          __html: JSON.stringify(entryPlanes()).replace(/</g, '\\u003c'),
        }}
      />
      <HomeHero />
      <HomeContent />
    </>
  );
}
