// หลังบ้าน: บันทึกการใช้งาน อ่านอย่างเดียว ใหม่สุดก่อน · server component ไม่มีอะไรให้กด
// มือถือเป็นการ์ด · ตั้งแต่ md เป็นแถว 3 ช่อง รายละเอียดอยู่ใต้การกระทำ
import type { AuditRow } from '@/lib/server/audit';
import { danger } from './ui';

const ACTION: Record<string, string> = {
  login: 'เข้าสู่ระบบ',
  login_failed: 'เข้าสู่ระบบไม่ผ่าน',
  logout: 'ออกจากระบบ',
  disable: 'ปิดบัญชี',
  create: 'เพิ่ม',
  update: 'แก้ไข',
  delete: 'ลบ',
  publish: 'เผยแพร่',
  unpublish: 'ซ่อน',
  replace: 'เปลี่ยนไฟล์',
  reset: 'กลับเป็นค่าเริ่มต้น',
  upload: 'อัปโหลด',
  handle: 'จัดการแล้ว',
};
const ENTITY: Record<string, string> = {
  admin_user: 'บัญชีผู้ดูแล',
  product: 'สินค้า',
  post: 'บทความ',
  project: 'ผลงาน',
  category: 'หมวด',
  brand: 'แบรนด์',
  material: 'วัสดุ',
  announcement: 'ประกาศ',
  catalog: 'แคตตาล็อก',
  hero_video: 'วิดีโอหน้าแรก',
  inquiry: 'ข้อความติดต่อ',
  file: 'ไฟล์',
};
const REASON: Record<string, string> = {
  no_user: 'ไม่มีบัญชีอีเมลนี้',
  disabled: 'บัญชีถูกปิด',
  wrong_password: 'รหัสผ่านไม่ถูกต้อง',
  locked: 'ถูกล็อกจากการกรอกผิดเกิน 5 ครั้ง',
};

// th-TH ใช้ปีพุทธศักราชอยู่แล้ว · แสดงเวลาไทยตาม design.md หัวข้อ Dates
const when = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'medium' });

function describe(r: AuditRow): string {
  const d = r.detail ?? {};
  const parts: string[] = [];
  if (typeof d.reason === 'string') parts.push(REASON[d.reason] ?? d.reason);
  if (typeof d.minutes === 'number') parts.push(`เหลือ ${d.minutes} นาที`);
  for (const k of ['email', 'name', 'title', 'slug'] as const) if (typeof d[k] === 'string') parts.push(d[k] as string);
  return parts.join(' · ');
}

export default function AuditAdmin({ rows }: { rows: AuditRow[] }) {
  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">บันทึกการใช้งาน</h1>
        <p className="mt-1 text-sm text-stone-600">{rows.length} รายการล่าสุด · ใครทำอะไร เมื่อไร รวมการเข้าสู่ระบบที่ไม่ผ่าน</p>
      </header>
      {rows.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-14 text-center text-sm">ยังไม่มีบันทึก</div>
      ) : (
        <ul className="glass divide-y divide-white/70 overflow-hidden rounded-[28px]">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-1 px-5 py-4 md:grid-cols-[12rem_9rem_minmax(0,1fr)] md:items-baseline md:gap-x-4">
              <time dateTime={r.at.toISOString()} className="text-xs text-stone-600">
                {when.format(r.at)}
              </time>
              <p className="truncate text-sm">{r.userName ?? 'ไม่ทราบผู้ใช้'}</p>
              <p className={`text-sm ${r.action === 'login_failed' ? danger : ''}`}>
                {ACTION[r.action] ?? r.action} {ENTITY[r.entity] ?? r.entity}
                {r.entityId && r.entity !== 'admin_user' ? ` #${r.entityId}` : ''}
              </p>
              {describe(r) && <p className="break-words text-sm text-stone-600 md:col-start-3">{describe(r)}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
