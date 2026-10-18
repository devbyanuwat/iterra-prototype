'use server';

import { db } from '@/lib/db';
import { logSearch } from '@/lib/server/search-log';

// นับคำค้นเป็นยอดรวมรายวัน ไม่เก็บ IP session หรือ cookie (spec หัวข้อ 11.2) · ไม่ต้องเข้าสู่ระบบ
// DB ล่มต้องไม่กระทบการค้นหา: จด error ไว้ที่ server แล้วจบเงียบ ๆ หน้าเว็บก็ไม่รอผล
export async function logSearchAction(query: string, clicked: boolean, results: number): Promise<void> {
  try {
    await logSearch(db, query, clicked === true, Number.isInteger(results) ? results : 0);
  } catch (e) {
    console.error('logSearch', e);
  }
}
