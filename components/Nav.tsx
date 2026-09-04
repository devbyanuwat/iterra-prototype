'use client';

// เมนูหลัก + ปุ่มสลับภาษา TH/EN (ทำงานจริงผ่าน LangProvider)
//
// เคยเป็น `mix-blend-difference` + text-white เพื่อให้ลอยอยู่บนพื้นอะไรก็อ่านออก
// ซึ่งไม่จริง: difference คืนค่า |backdrop − 255| พื้นโทนกลางจึงให้ตัวอักษรโทนกลาง
// วัดบนกำแพงจริง (canvas อ่านพิกเซลแถบบนของแต่ละแผง):
//   Vibrant Brushed Titanium  152,148,146 → ตัวอักษร 103,107,109 = **1.79:1**
//   Vibrant Brushed Rose Gold 202,168,149 → 3.51:1
//   Vibrant Rose Gold         197,173,159 → 3.85:1
// ธีมมืดเดิมซ่อนปัญหานี้ไว้เพราะหน้าแรกไม่ได้เอาแผงโทนกลางมาไว้ใต้เมนู
// ธีมสว่างเอากำแพงขึ้นเป็นจอแรก เมนูจึงลอยอยู่บนสามแผงนั้นตรง ๆ
//
// แก้ด้วยการให้เมนูมีพื้นของตัวเอง (แบบเดียวกับ kohler.co.th) — ink บน base
// คงที่ 13.2:1 ทุกหน้า ทุกแผง ไม่ขึ้นกับว่าอะไรอยู่ข้างหลัง
// กำแพงเผื่อที่ให้แถบนี้อยู่แล้ว (FinishWall วาง header ของตัวเองที่ top-[64px])

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { usePathname } from 'next/navigation';
import BrandMark from './BrandMark';
import { useLang } from './LangProvider';
import { ALT_LANG, DEFAULT_LANG, langPath, splitLangPath, type Lang } from '@/lib/i18n';
import { COLLECTIONS_ENABLED } from '@/lib/scope';

const ALL_LINKS = [
  { href: '/', key: 'home' },
  { href: '/about/', key: 'about' },
  { href: '/products/', key: 'products' },
  // จานสีอยู่ติดกับสินค้าเพราะมันคือ "อีกด้าน" ของเรื่องเดียวกัน: หน้าเฉดบอกว่า
  // เรามีอะไรในสีนั้น หน้าจานสีบอกว่าสีนั้นคืออะไร และเป็นทางที่หน้า /finish
  // เดินกลับมาหาหน้าอ้างอิงได้จากทุกหน้าของเว็บ
  { href: '/palette/', key: 'palette' },
  { href: '/collections/', key: 'collections' },
  { href: '/gallery/', key: 'gallery' },
  { href: '/articles/', key: 'articles' },
  // task C1 — คู่มือเลือกซื้อกับไอเดียอยู่ติดกับบทความ เพราะทั้งสามคือของอ่าน
  // ชุดเดียวกันจาก kohler.co.th ต่างกันแค่รูปแบบ: บทความคือเรื่องยาว ไอเดียคือ
  // ชุดเรื่องที่ต้นทางจัดไว้ให้ ส่วนคู่มือคือวิธีเลือกของทีละหมวด
  { href: '/guides/', key: 'guides' },
  { href: '/ideas/', key: 'ideas' },
  // task C3 — ร้านค้าอยู่ในเมนูหลัก ไม่ใช่ท้ายเว็บ ทั้งที่หน้าข้อมูลอีกเก้าหน้า
  // อยู่ท้ายเว็บ เพราะมันตอบคนละคำถาม: เก้าหน้านั้นคือ "อ่านเพิ่ม" ส่วนหน้านี้คือ
  // "แล้วจะไปดูของจริงได้ที่ไหน" ซึ่งเป็นปลายทางของทั้งเว็บ และเป็นหน้าที่ลูกค้า
  // ทักมาเองว่าหายไป วางไว้ติดกับติดต่อเราเพราะเป็นความตั้งใจเดียวกัน
  { href: '/stores/', key: 'stores' },
  { href: '/contact/', key: 'contact' },
] as const;

/**
 * เมนูจริง = รายการที่ยังมีหน้าปลายทางอยู่
 *
 * /collections/ ถูกปิดตอนเว็บเหลือเฉพาะห้องครัว: การ์ดคอลเลกชันทั้ง 14 ใบเป็น
 * ชุดห้องน้ำล้วน หน้านั้นจึงว่างทั้งหน้า ไม่ใช่แค่การ์ดบางใบหาย (ดู lib/scope.ts)
 * ปล่อยไว้ในเมนูคือมีปุ่มที่พาไปหน้าที่ไม่ถูก export = 404
 *
 * กรองที่นี่ ไม่ใช่ลบบรรทัดออกจากรายการ — พลิก KITCHEN_ONLY กลับเป็น false
 * แล้วเมนูกลับมาครบเองโดยไม่ต้องจำว่าเคยลบอะไรไป
 */
const LINKS = ALL_LINKS.filter((l) => l.key !== 'collections' || COLLECTIONS_ENABLED);

// ── ปุ่มสลับภาษา = ลิงก์จริง ไม่ใช่ปุ่มที่สลับ state (task D3) ────────────────
//
// เดิมเป็น <button> ที่เรียก setLang() เพราะทั้งเว็บมี URL ชุดเดียว การเปลี่ยน
// ภาษาจึงเป็นการเปลี่ยนสถานะของหน้าเดียวกัน ตอนนี้ทุกเส้นทางมีสอง URL จริง
// การเปลี่ยนภาษาจึงเป็น "ไปอีกที่หนึ่ง" ซึ่งต้องเป็นลิงก์: ก๊อปไปแปะได้ เปิดแท็บ
// ใหม่ได้ crawler เดินตามได้ และตรงกับ hreflang ที่หน้าประกาศไว้
//
// ปลายทางคือ **หน้าเดิมในอีกภาษา** ไม่ใช่หน้าแรก — splitLangPath ตัดคำนำหน้า
// ออกจาก pathname ปัจจุบันแล้ว langPath ใส่คำนำหน้าของอีกภาษากลับเข้าไป
//
// <a> ไม่ใช่ <Link>: สองต้นไม้มี root layout คนละตัว Next จึงต้องโหลดเอกสารใหม่
// อยู่ดี และการเปลี่ยนภาษาของเอกสารควรได้เอกสารใหม่จริง ๆ (<html lang> ใหม่
// <title> ใหม่ canonical ใหม่) ไม่ใช่ DOM เดิมที่ถูกแก้ทีหลัง
function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, t } = useLang();
  const pathname = usePathname();
  const { path } = splitLangPath(pathname);

  // query string กับ hash ไม่ได้อยู่ใน usePathname และเป็นของฝั่ง client ล้วน
  // (?finish=CP บนหน้าสินค้า, ?cat=kitchen บนหน้ารวม) — ถ้าไม่พามันไปด้วย
  // การสลับภาษาจะรีเซ็ตตัวกรองที่ผู้อ่านเพิ่งตั้ง ซึ่งก็คือการไม่พาไปที่เดิม
  //
  // อ่านใน effect ไม่ใช่ตอน render: useSearchParams บังคับให้ต้องมี Suspense
  // ล้อมทั้ง Nav ใน static export และ markup ที่ server เขียนต้องไม่ขึ้นกับค่าที่
  // server ไม่มีทางรู้ ลิงก์ที่ crawler เห็นจึงเป็นเส้นทางเปล่า ซึ่งถูกต้องแล้ว
  const [tail, setTail] = useState('');
  useEffect(() => {
    setTail(window.location.search + window.location.hash);
  }, [pathname]);

  const Item = ({ code }: { code: Lang }) =>
    code === lang ? (
      // ภาษาปัจจุบันไม่ใช่ลิงก์ไปหาตัวเอง — aria-current บอกสถานะแทน
      // 0.5 คือ ink บน base = 3.2:1 อ่านไม่ผ่านเกณฑ์ AC ข้อ 3 (ต้อง ≥ 4.5:1)
      // 0.8 ให้ 7.04:1 และตัวที่เลือกอยู่ยังแยกออกด้วยขีดใต้ ไม่ได้พึ่งความจางอย่างเดียว
      <span
        aria-current="true"
        className="px-1.5 py-0.5 text-label uppercase tracking-widest opacity-100 underline underline-offset-4"
      >
        {code}
      </span>
    ) : (
      <a
        href={`${langPath(code, path)}${tail}`}
        hrefLang={code}
        rel="alternate"
        // href ที่เรนเดอร์ไว้ถือ query ตอน mount ซึ่งพอสำหรับ crawler และสำหรับ
        // การเปิดแท็บใหม่ แต่หน้าอย่าง /products/ กับหน้าสินค้าเขียน ?finish=
        // ใหม่ด้วย replaceState ระหว่างที่ผู้อ่านเล่นอยู่ และ replaceState ไม่ยิง
        // event ใด ๆ ให้ React รู้ ตอนคลิกจึงอ่านค่าสด ๆ อีกครั้ง
        // (รูปแบบเดียวกับ handleClick ของ FinishRail — คลิกที่มีปุ่มร่วมคือความ
        // ตั้งใจจะเปิดแท็บใหม่ ปล่อยให้เบราว์เซอร์จัดการตามปกติ)
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          window.location.assign(
            `${langPath(code, path)}${window.location.search}${window.location.hash}`,
          );
        }}
        className="px-1.5 py-0.5 text-label uppercase tracking-widest opacity-80 transition-opacity hover:opacity-100"
      >
        {code}
      </a>
    );

  return (
    // เรียงตาม DEFAULT_LANG ก่อน: ภาษาที่อยู่ที่ path เปล่าควรเป็นตัวแรกที่ตาเห็น
    // ไม่ใช่ 'th' ที่ฮาร์ดโค้ดไว้ตอนที่ไทยยังเป็นภาษาเริ่มต้น
    // group + aria-label เพราะสองตัวนี้เป็นตัวเลือกชุดเดียวกัน ไม่ใช่ลิงก์ลอย ๆ
    <div role="group" aria-label={t.a11y.langSwitch} className={`flex items-center ${className}`}>
      <Item code={DEFAULT_LANG} />
      {/* ตัวคั่นล้วน ๆ screen reader ได้ยินสองตัวเลือกอยู่แล้วไม่ต้องได้ยิน "/" */}
      <span aria-hidden className="opacity-40">
        /
      </span>
      <Item code={ALT_LANG} />
    </div>
  );
}

export default function Nav() {
  // เทียบกับเส้นทางที่ตัดคำนำหน้าภาษาออกแล้ว — LINKS เก็บเส้นทางของเว็บ ไม่ใช่
  // ของต้นไม้ใดต้นไม้หนึ่ง (คำนำหน้าถูกใส่ให้ตอนเรนเดอร์โดย components/Link.tsx)
  // ถ้าเทียบกับ pathname ดิบ เมนูในต้นไม้ไทยจะไม่มีรายการไหนถูกไฮไลต์เลย
  const { path: pathname } = splitLangPath(usePathname());
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 border-b border-line-6 bg-base/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-5 text-ink md:px-[4vw]">
          {/* เวิร์ดมาร์กจริง ไม่ใช่ตัวอักษรที่จัด tracking เอาเอง
              alt = 'KOHLER' เป็นชื่อที่ลิงก์กลับหน้าแรกใช้ประกาศตัว ถ้าเป็น alt=""
              ลิงก์นี้จะไม่มีชื่อให้ screen reader อ่านเลย
              โลโก้เป็นสีดำล้วน แถบเมนูเป็นพื้นทึบ bg-base/95 ตั้งแต่ task H จึงอยู่บน
              #E5E5E5 เสมอ ไม่ได้ลอยอยู่บนแผงกำแพงที่โทนสีเอาแน่ไม่ได้ */}
          <Link href="/" className="pointer-events-auto">
            <BrandMark height={18} />
          </Link>
          {/* gap-4 และ lg: ไม่ใช่ gap-8 กับ md: — เมนูโตเป็นสิบเอ็ดรายการแล้ว
              (palette/collections/stores จาก task C2–C3 และ guides/ideas จาก C1)
              วัดที่ 1440 ภาษาอังกฤษ: ตัวอักษรของลิงก์ทั้งสิบเอ็ด + ปุ่มภาษา รวม
              1014px ส่วนที่ว่างระหว่างเวิร์ดมาร์กกับขอบขวามี 1241px
                gap-8 → 1014 + 11×32 = 1366  เกิน 125px
                gap-6 → 1278                 เกิน 37px  (ป้ายยาวถูกหักสองบรรทัด)
                gap-5 → 1234                 พอดี เหลือ 7px — ยังชนเวิร์ดมาร์กด้วยตา
                gap-4 → 1190                 เหลือ 51px ให้เวิร์ดมาร์กหายใจ
              เหลือ 7px คือ "พอดีจริง ๆ" ไม่ใช่ "สบาย" — ป้ายใหม่อีกอันเดียวก็หัก
              บรรทัดอีก และเมื่อดูด้วยตา เมนูก็ไปติดเวิร์ดมาร์กอยู่ดี จึงเลือก gap-4
              เมนูสิบเอ็ดรายการเกินความกว้างของแถวเดียวไปแล้วโดยธรรมชาติ
              การจัดกลุ่มเมนูเป็นการตัดสินใจของงานออกแบบ ไม่ใช่ของ task ใด task หนึ่ง
              (บันทึกไว้ใน scratchpad/task-c1.md)
              ส่วน lg: แทน md: เพราะที่ 768–1023 แถวเดียวใส่ไม่ลงในทุกกรณี — ช่วงนั้น
              ใช้เมนูเต็มจอซึ่งมีลิงก์ครบชุดเดียวกันอยู่แล้ว

              ── xl: ไม่ใช่ lg: และเหตุผลเป็นภาษาไทยล้วน ๆ (task E2) ──────────
              ตัวเลขข้างบนวัดจากป้ายอังกฤษ ป้ายไทยกว้างกว่านั้นมาก วัดแถวไทยที่
              ไม่ถูกบีบ (white-space: nowrap) ได้ **1,025px** ขณะที่ที่ว่างระหว่าง
              เวิร์ดมาร์กกับขอบขวาที่ 1024 มีแค่ **844px** — ขาดไป 181px
              flex จึงบีบทุกรายการให้แคบกว่าข้อความของมันเอง และภาษาไทยไม่มีช่องว่าง
              ให้ตัด เบราว์เซอร์เลยหักกลางคำ: คอลเลก/ชัน · แกล/เลอรี · สีและผิว/เคลือบ
              (วัดที่ 1024 ก่อนแก้: หัก 9 จาก 11 รายการ สูงแถว 39–59px)
              1,025 + เวิร์ดมาร์ก 141 + ขอบ 2×51 = ~1,268 แถวไทยจึงเริ่มพอดีที่ xl
              (1280) ไม่ใช่ lg — ต่ำกว่านั้นใช้เมนูเต็มจอ ซึ่งมีลิงก์ครบชุดเดียวกัน
              shrink-0 คู่กับ nowrap (กฎรวมอยู่ใน globals.css): รายการไม่ยอมแคบกว่า
              ข้อความของตัวเอง สิ่งที่ยอมคือแถว ไม่ใช่คำ */}
          {/* flex-wrap + justify-end: ที่ 1280–1439 แถว **อังกฤษ** ยังกว้างเกิน
              (ป้ายอังกฤษรวม 1,189px ต้องการจอ ~1,432px จึงจะพอ) เมื่อรายการไม่ยอม
              หดแล้ว สิ่งที่ต้องยอมคือแถว ไม่ใช่คำ — ตัดขึ้นบรรทัดใหม่ "ระหว่างรายการ"
              ซึ่งอ่านออกทุกคำ แทนที่จะล้นออกนอกขอบ (วัดก่อนใส่: ล้น 109px ที่ 1280)
              ไทยกว้าง 1,025px จึงอยู่บรรทัดเดียวตั้งแต่ 1280 ขึ้นไป */}
          <nav
            aria-label={t.a11y.menuMain}
            className="pointer-events-auto hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 xl:flex"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 text-label uppercase tracking-widest2 transition-opacity ${
                  // เหตุผลเดียวกับ LangSwitch: 0.6 = 3.88:1 ตกเกณฑ์ · 0.8 = 7.04:1
                  pathname === l.href ? 'opacity-100 underline underline-offset-8' : 'opacity-80 hover:opacity-100'
                }`}
              >
                {t.nav[l.key]}
              </Link>
            ))}
            <LangSwitch />
          </nav>
          <div className="pointer-events-auto flex items-center gap-4 xl:hidden">
            <LangSwitch />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t.a11y.menuOpen}
              className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
            >
              <span className="block h-px w-6 bg-ink" />
              <span className="block h-px w-6 bg-ink" />
            </button>
          </div>
        </div>
      </header>

      {/* เมนูมือถือแบบเต็มจอ */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-base text-ink transition-transform duration-500 xl:hidden ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-6 py-5">
          {/* ในเมนูมือถือ โลโก้ไม่ใช่ลิงก์ (มีรายการ "หน้าแรก" อยู่ในเมนูแล้ว)
              จึงเป็นภาพประดับ ไม่ต้องมีชื่อซ้ำให้ screen reader อ่านสองรอบ */}
          <BrandMark height={18} alt="" />
          <button type="button" onClick={() => setOpen(false)} aria-label={t.a11y.menuClose} className="text-card font-normal">
            ×
          </button>
        </div>
        <nav aria-label={t.a11y.menuMobile} className="flex flex-1 flex-col justify-center gap-7 px-8">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-card font-normal tracking-wide"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {t.nav[l.key]}
            </Link>
          ))}
        </nav>
        <div className="px-8 pb-10">
          <LangSwitch />
        </div>
      </div>
    </>
  );
}
