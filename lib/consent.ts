// ตัวเลือกคุกกี้ของผู้เข้าเว็บ: จำเป็น (เปิดตลอด ไม่เก็บในค่านี้) · สถิติ · การตลาด
// เก็บใน localStorage เพื่อไม่ถามซ้ำเมื่อกลับมาใหม่ · null = ยังไม่เคยเลือก ต้องแสดงแถบ
// ไฟล์นี้ไม่มี import เพื่อให้ scripts/check-search.mjs รันด้วย Node ได้

export type Consent = { analytics: boolean; marketing: boolean };
export const CONSENT_KEY = 'consent:v1';
export const ALL: Consent = { analytics: true, marketing: true };
export const NONE: Consent = { analytics: false, marketing: false };

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

// ค่าที่อ่านไม่ออกหรือไม่ครบ = ถือว่ายังไม่เคยเลือก (ไม่เดาว่ายอมรับ)
export function parseConsent(raw: string | null): Consent | null {
  try {
    const v = JSON.parse(raw ?? 'null');
    if (v && typeof v.analytics === 'boolean' && typeof v.marketing === 'boolean') return { analytics: v.analytics, marketing: v.marketing };
  } catch {
    // ตกไป return null
  }
  return null;
}

export function readConsent(storage: Store | null): Consent | null {
  try {
    return parseConsent(storage?.getItem(CONSENT_KEY) ?? null);
  } catch {
    return null;
  }
}

export function writeConsent(c: Consent, storage: Store | null): void {
  try {
    storage?.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch {
    // จำไม่ได้: ตัวเลือกยังมีผลในหน้านี้ แถบจะถามอีกเมื่อโหลดหน้าใหม่
  }
}
