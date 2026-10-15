'use server';

import { db } from '@/lib/db';
import { ipHash } from '@/lib/admin';
import { submitInquiry, type InquiryError, type InquiryInput } from '@/lib/server/inquiries';

// ฟอร์มติดต่อบนหน้าเว็บ: ไม่ต้องเข้าสู่ระบบ · Next เทียบ Origin กับ Host ให้แล้ว (docs 02-guides/server-actions.md หัวข้อ Security)
// คืนรหัสข้อผิด ให้หน้าเว็บแปลตามภาษาเอง · DB ล่มตอบ server ไม่โยน error ใส่ผู้ชม
export async function submitInquiryAction(input: InquiryInput): Promise<{ ok: true } | { ok: false; error: InquiryError | 'server' }> {
  try {
    const error = await submitInquiry(db, input, await ipHash());
    return error ? { ok: false, error } : { ok: true };
  } catch (e) {
    console.error('submitInquiry', e);
    return { ok: false, error: 'server' };
  }
}
