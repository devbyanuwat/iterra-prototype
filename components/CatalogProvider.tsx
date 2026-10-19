'use client';

// ข้อมูลจาก DB ที่ component ฝั่ง client ใช้หลายหน้า: สินค้าที่เผยแพร่ หมวด วัสดุ การ์ดบทความ และผลงาน (หน้าผลงานกับการค้นหา)
// root layout โหลดครั้งเดียวต่อ request แล้วส่งให้ component ฝั่ง client
// ponytail: ส่งสินค้าทั้งชุดไปทุกหน้า (เท่ากับที่ bundle เดิมฝัง lib/products.ts ไว้) ถ้าสินค้าเกินหลักร้อยให้ย้ายการค้นหาไปฝั่ง server
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Product } from '@/lib/product-filters';
import type { PostCard } from '@/lib/posts';
import type { Project } from '@/lib/projects';
import type { Lang } from '@/lib/i18n';

type Name = { th: string; en: string };
export type Cat = { key: string; name: Name; multiBrand: boolean };
export type Mat = { key: string; name: Name };
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[]; posts: PostCard[]; projects: Project[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [], posts: [], projects: [] });

// แผงแก้ไขบนหน้าเว็บของแอดมินส่งสินค้าที่กำลังพิมพ์มาทับชั่วคราว หน้าเปลี่ยนตามทันทีในเครื่องนั้นเครื่องเดียว · null = เลิกทับ
type Override = (slug: string, p: Product | null) => void;
const OverrideCtx = createContext<Override>(() => {});

export function CatalogProvider({ value, children }: { value: Catalog; children: React.ReactNode }) {
  // จำ value ตอนทับไว้ด้วย: บันทึกแล้ว router.refresh() ได้ value ใหม่จาก server ตัวทับเลิกใช้เอง ไม่กระพริบกลับไปฉบับเก่าก่อนข้อมูลใหม่มา
  const [ov, setOv] = useState<{ slug: string; p: Product; on: Catalog } | null>(null);
  const set = useCallback<Override>((slug, p) => setOv(p ? { slug, p: { ...p, slug }, on: value } : null), [value]);
  const v = useMemo(
    () => (ov && ov.on === value ? { ...value, products: value.products.map((x) => (x.slug === ov.slug ? ov.p : x)) } : value),
    [value, ov],
  );
  return (
    <OverrideCtx.Provider value={set}>
      <Ctx.Provider value={v}>{children}</Ctx.Provider>
    </OverrideCtx.Provider>
  );
}

export const useCatalogOverride = () => useContext(OverrideCtx);

export function useCatalog() {
  const c = useContext(Ctx);
  return {
    ...c,
    catName: (key: string, lang: Lang) => c.categories.find((x) => x.key === key)?.name[lang] ?? key,
    matName: (key: string, lang: Lang) => c.materials.find((x) => x.key === key)?.name[lang] ?? key,
  };
}
