import { NextResponse, type NextRequest } from 'next/server';

// ด่านแรกแบบหยาบ: ไม่มี cookie ส่งไปหน้าเข้าสู่ระบบเลย ไม่ต้อง render หน้า admin
// ไม่ใช่การตรวจสิทธิ์ (เอกสาร Next 16 บอกว่า proxy ไม่ใช่ที่ทำ authorization) ตัวตรวจจริงคือ requireAdmin() ใน lib/admin.ts
// ชื่อ cookie ต้องตรงกับ SESSION_COOKIE ใน lib/server/auth.ts (ไม่ import เพื่อไม่ลาก node:crypto เข้ามาในไฟล์นี้)
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin/login') || req.cookies.has('iterra_session')) return NextResponse.next();
  return NextResponse.redirect(new URL('/admin/login/', req.url));
}

export const config = { matcher: '/admin/:path*' };
