'use client';

// ภาษาของหน้ามาจาก URL ไม่ใช่จากความจำ
//
// เว็บนี้เป็น static export หน้า HTML ที่เสิร์ฟมาจึงเป็น "ภาษาเดียว" เสมอ ก่อน
// task D3 มีต้นไม้เดียว ภาษาที่สองจึงต้องเป็นการสลับฝั่ง client ที่กู้ค่าจาก
// localStorage — และนั่นบังคับให้มีเครื่องจักรทั้งชุด: สคริปต์ก่อนวาดใน <head>,
// การซ่อน body ระหว่างสลับ, และการ hydrate ด้วย DEFAULT_LANG แล้วค่อยเปลี่ยน
//
// ตอนนี้มีสองต้นไม้จริง (/ กับ /th/) แต่ละต้นถูก prerender ในภาษาของตัวเอง และ
// root layout ของต้นนั้นเป็นคนบอกว่าภาษาอะไร ค่าที่ได้จึงตรงกับ markup ตั้งแต่
// เฟรมแรกโดยนิยาม — ไม่มี mismatch ให้กัน ไม่มีอะไรให้ซ่อน ไม่มีอะไรให้กู้
//
// เครื่องจักรที่หายไปทั้งหมดคือของ 5af7a23: LANG_STORAGE_KEY, LANG_HIDE_ATTR,
// revealBody, useLayoutEffect ที่สลับภาษาหลัง hydrate, และการเขียน
// document.documentElement.lang ฝั่ง client (ตอนนี้ <html lang> มาจาก server
// และนิ่ง — ซึ่งเป็นเงื่อนไขที่ทำให้ line-height floor ของไทยใน globals.css
// มีผลตั้งแต่ HTML ไม่ต้องรอ JS)
//
// สิ่งเดียวที่ยังเกี่ยวกับ localStorage คือการ **ลบ** คีย์เก่าทิ้ง ดูเหตุผลที่
// LEGACY_LANG_STORAGE_KEY ใน lib/i18n.ts

import { createContext, useContext, useEffect } from 'react';
import { DEFAULT_LANG, dict, LEGACY_LANG_STORAGE_KEY, type Dict, type Lang } from '@/lib/i18n';

type Ctx = { lang: Lang; t: Dict };

const LangContext = createContext<Ctx>({ lang: DEFAULT_LANG, t: dict[DEFAULT_LANG] });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // ความจำที่ขัดกับ URL แย่กว่าไม่มีความจำ — เครื่องที่เคยเข้าเว็บรุ่นก่อนยังถือ
  // ค่านี้อยู่ และไม่มีใครอ่านมันแล้ว เก็บไว้ก็เป็นแค่ขยะที่รอให้โค้ดในอนาคต
  // เผลอเชื่อ ลบทิ้งครั้งเดียวตอน mount
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_LANG_STORAGE_KEY);
    } catch {
      // localStorage อาจถูกปิด (private mode / cookie เข้ม) — ไม่มีอะไรให้ลบก็จบ
    }
  }, []);

  return <LangContext.Provider value={{ lang, t: dict[lang] }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
