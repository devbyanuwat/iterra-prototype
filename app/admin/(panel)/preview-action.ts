'use server';

import { draftMode } from 'next/headers';
import { requireAdmin } from '@/lib/admin';

// เปิดหรือปิดโหมดดูร่างบนหน้าเว็บจริง (cookie ของ draftMode) · root layout แสดงร่างเมื่อเปิดโหมดนี้และเป็นแอดมินจริงเท่านั้น
export async function setPreviewAction(on: boolean) {
  await requireAdmin();
  const d = await draftMode();
  if (on === true) d.enable();
  else d.disable();
}
