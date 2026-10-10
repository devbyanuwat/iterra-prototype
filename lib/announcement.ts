// ประกาศที่เด้งตอนเข้าเว็บ · แก้เนื้อหาที่นี่ที่เดียว
// enabled: false = ปิดประกาศ · เปลี่ยน id = ประกาศใหม่ ผู้ที่เคยปิดไปแล้วจะเห็นอีกครั้ง
// ไฟล์นี้ไม่มี import เพื่อให้ scripts/check-search.mjs รันด้วย Node ได้
// ── เนื้อหาตัวอย่าง รอของจริงจากลูกค้า ──

export const ANNOUNCEMENT = {
  enabled: true,
  id: '2026-10-showroom',
  image: '/media/scenes/about-hero.webp',
  title: { th: 'นัดชมโชว์รูม ITERRA', en: 'Visit the ITERRA showroom' },
  body: {
    th: 'สัมผัสก๊อกและซิงก์ครัวรุ่นจริง พร้อมที่ปรึกษาช่วยเลือกให้เข้ากับครัวของคุณ นัดหมายล่วงหน้าได้ทุกวัน',
    en: 'See the faucets and sinks in person, with a consultant to help you choose what fits your kitchen. Book any day of the week.',
  },
  cta: { label: { th: 'นัดหมายเข้าชม', en: 'Book a visit' }, href: '/contact/' },
};

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const key = (id: string) => `announcement:${id}`;

// storage ใช้ไม่ได้ (โหมดส่วนตัว, ถูกบล็อก) = แสดง ไม่พัง
export function shouldShow(a: { enabled: boolean; id: string }, storage: Store | null): boolean {
  if (!a.enabled) return false;
  try {
    return storage?.getItem(key(a.id)) !== '1';
  } catch {
    return true;
  }
}

export function markSeen(id: string, storage: Store | null): void {
  try {
    storage?.setItem(key(id), '1');
  } catch {
    // จำไม่ได้ก็ไม่เป็นไร: ประกาศจะขึ้นอีกเมื่อโหลดหน้าใหม่
  }
}
