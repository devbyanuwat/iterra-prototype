'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { markHandled } from '@/lib/server/inquiries';

// ผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว · ไม่ใส่ข้อความของลูกค้าใน audit
export async function markHandledAction(id: number) {
  return adminAction(async (tx, a) => {
    await markHandled(tx, id);
    await audit(tx, a.id, 'handle', 'inquiry', id);
  });
}
