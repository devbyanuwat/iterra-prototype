'use client';

// ตัวสลับขอบเขตเนื้อหาไว้เทียบ 3 แบบ: ?scope=kitchen | wardrobe | all (ค่าเริ่ม kitchen)
// static export อ่าน query ใน useEffect เหมือน ProductsContent

import { useEffect, useState } from 'react';

export type Scope = 'kitchen' | 'wardrobe' | 'all';
const SCOPES: Scope[] = ['kitchen', 'wardrobe', 'all'];

export function useScope(): Scope {
  const [scope, setScope] = useState<Scope>('kitchen');
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('scope') as Scope | null;
    if (s && SCOPES.includes(s)) setScope(s);
  }, []);
  return scope;
}
