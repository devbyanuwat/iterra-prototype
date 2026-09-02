'use client';

// ทางเข้า /gallery จากหน้าแรก (task B2 ข้อ 2)
//
// ลูกค้าถามว่าควรลบ /gallery ทิ้งไหม คำตอบคือไม่ — มันคือสนามภาพเชิงลึกที่ลูกค้า
// สั่งทำเอง และไม่มีคู่แข่งในตลาดนี้ที่มี แต่ข้อสังเกตที่มาพร้อมกันนั้นถูก:
// วันนี้มันเป็นลิงก์ในเมนูอย่างเดียว ไม่มีอะไรในเว็บชี้เข้าไปเลย
//
// ── ทำไมบล็อกนี้คือ "สนามจริง" ไม่ใช่ภาพนิ่งของสนาม ────────────────────────
// ปุ่มที่เขียนว่า "ไปดูแกลเลอรี" ไม่ได้อธิบายอะไร เพราะไม่มีใครรู้ว่าแกลเลอรีคืออะไร
// จนกว่าจะเห็น สิ่งที่ทำให้คนกดคือการเห็นมันขยับอยู่ตรงนั้นแล้วอยากเดินเข้าไปข้างใน
//
// ── ทำไมไม่เปลืองแบนด์วิดท์เพิ่มเลย ────────────────────────────────────────
// ระนาบที่ส่งเข้ามาเป็น "ชุดย่อยของระนาบสินค้าในประตูเข้า" ซึ่งเบราว์เซอร์โหลดไป
// แล้วตอนหน้าโหลด (ดู entryPlanes ใน components/depth-field.ts และหมายเหตุใน
// app/page.tsx) URL ตรงกันทุกใบ จึงเป็น cache hit ล้วน ไม่ใช่รูปชุดใหม่
// เรื่องนี้สำคัญเพราะระนาบในสนามต้องเป็น loading="eager" เสมอ — รูป lazy ใต้
// container ที่มี transform 3 มิติจะไม่ถูกโหลดเลย (บทเรียนจากงาน W)
//
// มือถือกับ reduced-motion ไม่มีสนาม (useFieldMode) — ตกลงมาเป็นกริดนิ่งของ
// การ์ดชุดเดียวกัน ตามกติกาเดิมของสนาม: มือถือ = เลื่อนธรรมดา ไม่ใช่ 3 มิติย่อส่วน

import Link from 'next/link';
import DepthField, { useFieldMode } from '@/components/DepthField';
import { useLang } from '@/components/LangProvider';
// type เท่านั้น — import ค่าจริงจาก depth-field จะลาก lib/products (424KB) เข้ามา
// เป็น client chunk ตามที่หัวไฟล์นั้นเตือนไว้ จำนวนระนาบของแกลเลอรีจึงมาทาง props
import type { FieldPlane } from '@/components/depth-field';

/** จำนวนการ์ดของกริดสำรอง — สองแถวเต็มที่ 390 */
const STATIC_CARDS = 6;

type Props = {
  /** ตัวอย่าง — ชุดย่อยของระนาบสินค้าในประตูเข้า ไฟล์เดิมที่โหลดไปแล้ว */
  planes: FieldPlane[];
  /** จำนวนระนาบที่ปลายทาง /gallery มีจริง ใช้ในคำโปรย */
  total: number;
};

export default function FieldEntry({ planes, total }: Props) {
  const { lang, t } = useLang();
  const fieldMode = useFieldMode();

  // ข้อความชุดเดียวกันทั้งสองแบบ ต่างกันแค่ว่าไปวางทับสนามหรือวางใต้แถบการ์ด
  const copy = (
    <>
      <p className="micro">{t.gallery.kicker}</p>
      <h2 className="mt-3 font-display text-section font-normal">{t.gallery.title}</h2>
      {/* total ไม่ใช่ planes.length: ประโยคนี้บรรยาย "ปลายทาง" ไม่ใช่ตัวอย่างที่
          กำลังเห็นอยู่ตรงนี้ บอกจำนวนของตัวอย่างจะเป็นการนับผิด
          และบนจอที่ไม่มีสนาม ประโยคนั้นสั่งให้ "เลื่อนเมาส์" ซึ่งไม่มีเมาส์ให้เลื่อน
          — ใช้ประโยคที่อธิบายดัชนีแทน เพราะดัชนีคือสิ่งที่ปลายทางจะให้จริง ๆ */}
      <p className="mt-4 text-body text-dim">
        {fieldMode ? t.gallery.sub(total) : t.gallery.indexHint}
      </p>
      {/* ไม่ใช่ <button> ซ้อนใน <a>: ทั้งบล็อกเป็นลิงก์เดียวอยู่แล้ว อันนี้คือ
          หน้าตาของมัน ลูกศรขยับตาม :hover ของลิงก์ที่ครอบอยู่ */}
      <span className="mt-9 inline-flex items-center gap-4 self-start border border-[color:var(--field-edge)] px-8 py-4 transition-colors duration-300 group-hover:border-[color:var(--field-ink)]">
        <span className="micro !text-[color:var(--field-ink)]">{t.common.explore}</span>
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
      {/* คำใบ้วิธีใช้มีความหมายเฉพาะตอนที่มีสนามให้เดินจริง — ที่ 390 ไม่มี */}
      {fieldMode && <p className="micro mt-6">{t.gallery.hint}</p>}
    </>
  );

  // ── จอที่ไม่มีสนาม: การ์ดอยู่ "เหนือ" ข้อความ ไม่ใช่ "หลัง" ข้อความ ──────────
  //
  // เวอร์ชันแรกวางกริดนิ่งไว้หลังข้อความแล้วหรี่ด้วยม่านชุดเดียวกับเดสก์ท็อป
  // ผลที่วัดจากภาพจริงที่ 390: การ์ดกลายเป็นสี่เหลี่ยมเทาที่มองไม่ออกว่าเป็นสินค้า
  // ทั้งที่มันคือทั้งหมดที่บล็อกนี้มีไว้โชว์ — บนจอแคบจึงเรียงบนลงล่างตรง ๆ
  // ไม่มีม่าน ไม่มีการซ้อน (และเป็น "เลื่อนธรรมดา" ตามกติกาของสนามบนมือถือ)
  if (!fieldMode) {
    return (
      <section data-dark-beat className="relative isolate overflow-clip">
        <Link href="/gallery/" className="group block w-full px-6 py-16">
          <ul aria-hidden className="grid grid-cols-3 gap-3">
            {planes.slice(0, STATIC_CARDS).map((plane) => (
              <li key={plane.id} className="bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, ไฟล์เดียวกับที่ประตูเข้าโหลดไปแล้ว */}
                <img
                  src={plane.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full object-contain"
                />
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col">{copy}</div>
        </Link>
      </section>
    );
  }

  return (
    <section data-dark-beat className="relative isolate overflow-clip">
      <Link href="/gallery/" className="group relative block min-h-[78svh] w-full">
        {/* สนามถูกถอดออกจาก a11y tree ทั้งก้อน: ถ้าไม่ถอด ชื่อของลิงก์นี้จะกลาย
            เป็นคำบรรยายภาพ 24 ใบต่อกัน ตัวสนามของจริงที่มี alt ครบและ Tab ไล่ได้
            อยู่ที่ /gallery ซึ่งเป็นปลายทางของลิงก์นี้พอดี */}
        <div aria-hidden className="absolute inset-0">
          <DepthField
            planes={planes}
            label={t.gate.fieldLabel}
            className="absolute inset-0 h-full w-full"
          />
        </div>

        {/* ม่านซ้าย→ขวา: ตัวอักษรอยู่ครึ่งซ้าย ส่วนความลึกของสนามอ่านออกที่ครึ่งขวา
            ถ้าหรี่จากล่างขึ้นบนแบบบล็อกภาพห้อง จะกลบระนาบชั้นหน้าซึ่งเป็นสิ่งเดียว
            ที่บล็อกนี้มีไว้โชว์ */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(8,9,10,0.94) 0%, rgba(8,9,10,0.86) 32%, rgba(8,9,10,0.45) 62%, rgba(8,9,10,0.12) 100%)',
          }}
        />

        <div className="relative z-10 flex min-h-[78svh] max-w-xl flex-col justify-center px-6 py-20 md:px-[8vw]">
          {copy}
        </div>
      </Link>
    </section>
  );
}
