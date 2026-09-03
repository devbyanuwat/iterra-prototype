// ── ประตูเข้าจำได้ว่าใครผ่านมาแล้ว และ HTML ต้องรู้ก่อน React ตื่น ──────────
//
// ไฟล์นี้ไม่มี 'use client' โดยตั้งใจ: RootShell (server component) ต้อง import
// ค่าจากที่นี่ได้ ถ้าปล่อยให้ค่าเหล่านี้อยู่ใน components/Preloader.tsx ซึ่งเป็น
// 'use client' ทุก export ของไฟล์นั้นจะกลายเป็น client reference ไม่ใช่สตริงจริง
// และ server component ก็เอาไปวางใน markup ไม่ได้

export const GATE_STORAGE_KEY = 'kohler:entered';

/**
 * สคริปต์กัน flash ของประตู สำหรับคนที่ผ่านมันมาแล้วในเซสชันนี้
 *
 * markup ฝั่ง server ไม่มีทางรู้ค่า sessionStorage จึง render ประตูมาเสมอ
 * สคริปต์นี้อยู่ใน HTML ที่ส่งมา จึงรันก่อน React hydrate และซ่อนประตูทันที
 *
 * มันแทรก <style> เข้าไปใน <head> เอง ไม่ไปแตะ attribute หรือ class ของ <html>
 * — สองอย่างนั้นเป็นของ RootShell ถ้าไปเขียนทับก่อน hydrate React จะฟ้อง
 * "tree hydrated but some attributes ... didn't match" ทุกครั้งที่โหลดเต็มหน้า
 * ในเซสชันที่ผ่านประตูมาแล้ว node ที่สคริปต์สร้างเองไม่ได้อยู่ในต้นไม้ของ React
 * จึงไม่ถูกนำไปเทียบ
 *
 * ทำไมต้องอยู่ที่ RootShell ไม่ใช่ใน <Preloader>: React ไม่รัน <script> ที่
 * client component render ออกมา ("Scripts inside React components are never
 * executed when rendering on the client") — มันทำงานเฉพาะรอบแรกที่ SSR เขียน
 * HTML ออกมาเท่านั้น พอผู้ใช้เดินไปหน้าอื่นฝั่ง client แล้วประตูถูก render ใหม่
 * สคริปต์ก็เงียบ และ React ก็เตือนขึ้น console ทุกครั้ง วางไว้ที่ server
 * component แทน มันจึงเป็นสิ่งที่มันเป็นจริง ๆ: บรรทัดหนึ่งใน HTML ไม่ใช่
 * element ที่ React ต้องดูแล
 */
export const GATE_ANTI_FLASH_SCRIPT =
  `try{if(sessionStorage.getItem('${GATE_STORAGE_KEY}')==='1'){` +
  "var s=document.createElement('style');" +
  "s.setAttribute('data-preloader-skip','');" +
  "s.textContent='[data-preloader]{display:none!important}';" +
  'document.head.appendChild(s);}}catch(e){}';
