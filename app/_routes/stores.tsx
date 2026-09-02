import type { Metadata } from 'next';
import StoresContent from '@/components/StoresContent';
import { dict, type Lang } from '@/lib/i18n';
import { stores } from '@/lib/stores.generated';
import { alternates } from '@/app/_lib/routes';

export const path = '/stores/';

// metadata อ่านจาก dict ของภาษาต้นไม้นี้ ไม่ใช่สตริงที่พิมพ์ไว้ตรง ๆ และไม่ใช่
// dict[DEFAULT_LANG] อย่างที่เคยเป็น (ba10764) — ตอนที่มีต้นไม้เดียว การอ่านจาก
// DEFAULT_LANG คือคำตอบที่ถูก ตอนนี้มีสองต้นไม้ มันจะแปลว่าหน้าไทยได้ <title>
// อังกฤษ ซึ่งเป็นบั๊กเดียวกันกับที่ ba10764 แก้ไป แค่ย้ายที่
export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.stores.title,
  description: dict[lang].stores.sub(stores.length),
  alternates: alternates(lang, path),
});

export default function StoresPage() {
  return <StoresContent />;
}
