'use client';

// ภาษาที่เลือกไว้ต้องอยู่ข้ามการรีโหลดและข้าม deep link
//
// เว็บนี้เป็น static export หน้า HTML ที่เสิร์ฟมาจึงเป็นภาษาไทยเสมอ ถ้าให้ React
// เริ่มด้วย 'en' ตั้งแต่เรนเดอร์แรก hydration จะไม่ตรงกับ markup ของเซิร์ฟเวอร์
// ลำดับที่ใช้จึงเป็น:
//
//   1. สคริปต์ใน <head> (app/layout.tsx) อ่าน localStorage ก่อนหน้าจอวาดครั้งแรก
//      ถ้าเป็น 'en' จะเซ็ต <html lang="en"> และซ่อน body ไว้ก่อน
//   2. ที่นี่ hydrate ด้วย 'th' ให้ตรงกับ markup แล้วสลับเป็น 'en' ใน
//      useLayoutEffect ซึ่งทำงานก่อนเบราว์เซอร์วาดเฟรมถัดไป
//   3. พอสลับเสร็จค่อยถอด <style> ที่ซ่อน body ออก
//
// ผลคือคนที่เลือกอังกฤษไว้จะไม่เห็นภาษาไทยแวบขึ้นมาก่อน และ console ไม่มี
// hydration mismatch (เหตุผลเดียวกับที่ Preloader ไม่ยอมแตะ attribute ของ <html>
// ก่อน hydrate — ตรงนั้นเลี่ยงด้วยการ inject style, ตรงนี้เลี่ยงด้วยการ hydrate
// เป็นไทยก่อนแล้วค่อยสลับ)

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
// คีย์ที่ใช้จำภาษาอยู่ใน lib/i18n.ts เพราะ app/layout.tsx ต้องอ่านค่าเดียวกัน
import { dict, LANG_HIDE_ATTR, LANG_STORAGE_KEY, type Dict, type Lang } from '@/lib/i18n';

// useLayoutEffect เตือนเมื่อถูกเรียกตอน prerender ฝั่งเซิร์ฟเวอร์ (รูปแบบเดียวกับ ParallaxImage)
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };

const LangContext = createContext<Ctx>({ lang: 'th', setLang: () => {}, t: dict.th });

function readStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' || stored === 'th' ? stored : null;
  } catch {
    // localStorage อาจถูกปิด (private mode / cookie เข้ม) — แค่ไม่จำ ไม่ควรพัง
    return null;
  }
}

/** ถอด <style> ที่สคริปต์ก่อนวาดใส่ไว้ ถ้ายังอยู่ */
function revealBody() {
  document.querySelectorAll(`style[${LANG_HIDE_ATTR}]`).forEach((node) => node.remove());
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // เริ่มที่ 'th' เสมอเพื่อให้ตรงกับ markup ที่ export ออกมา
  const [lang, setLangState] = useState<Lang>('th');

  useIsoLayoutEffect(() => {
    const stored = readStoredLang();
    if (stored && stored !== lang) setLangState(stored);
    // เรียกทุกครั้งที่ lang เปลี่ยน: หลังสลับเป็นภาษาที่จำไว้แล้วค่อยเปิด body
    revealBody();
  }, [lang]);

  useIsoLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // จำไม่ได้ก็ยังสลับภาษาในหน้านี้ได้ตามปกติ
    }
  }, []);

  return (
    <LangContext.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
