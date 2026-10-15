'use client';

// ข้อมูลจาก DB ที่ component ฝั่ง client ใช้หลายหน้า: สินค้าที่เผยแพร่ หมวด วัสดุ และการ์ดบทความ (หน้าแรกกับการค้นหา)
// root layout โหลดครั้งเดียวต่อ request แล้วส่งให้ component ฝั่ง client
// ponytail: ส่งสินค้าทั้งชุดไปทุกหน้า (เท่ากับที่ bundle เดิมฝัง lib/products.ts ไว้) ถ้าสินค้าเกินหลักร้อยให้ย้ายการค้นหาไปฝั่ง server
import { createContext, useContext } from 'react';
import type { Product } from '@/lib/product-filters';
import type { PostCard } from '@/lib/posts';
import type { Lang } from '@/lib/i18n';

type Name = { th: string; en: string };
export type Cat = { key: string; name: Name; multiBrand: boolean };
export type Mat = { key: string; name: Name };
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[]; posts: PostCard[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [], posts: [] });

export function CatalogProvider({ value, children }: { value: Catalog; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  return {
    ...c,
    catName: (key: string, lang: Lang) => c.categories.find((x) => x.key === key)?.name[lang] ?? key,
    matName: (key: string, lang: Lang) => c.materials.find((x) => x.key === key)?.name[lang] ?? key,
  };
}
