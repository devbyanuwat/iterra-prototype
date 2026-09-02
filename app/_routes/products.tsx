import type { Metadata } from 'next';
import ProductsContent, { type ProductItem } from '@/components/ProductsContent';
import type { WallPanel } from '@/components/FinishWall';
import { finishIndex, panelScrim } from '@/components/finish-index';
import { WALL_PANEL_PRODUCTS } from '@/components/wall-products';
import { dict, type Lang } from '@/lib/i18n';
import { products } from '@/lib/products';
import { alternates } from '@/app/_lib/routes';
import { productType } from './parts/facets';

export const path = '/products/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.products.title,
  description: dict[lang].meta.products.description,
  alternates: alternates(lang, path),
});

// หน้านี้เป็น server component: การจัดประเภทและการทำข้อมูลย่อเกิดตอน build
// ครั้งเดียว ไม่ใช่ทุกครั้งที่ผู้ใช้เปิดหน้า และที่สำคัญกว่าคือ ProductsContent
// (client) จะได้ไม่ต้อง import lib/products.generated.ts ทั้งก้อน 424KB มาไว้ใน
// client chunk เพื่อใช้แค่ 8 ฟิลด์ต่อชิ้น — เหตุผลเดียวกับที่หน้าแรกส่ง panels
// ให้ FinishWall แทนที่จะให้มัน import เอง
export default function ProductsPage() {
  const items: ProductItem[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    type: productType(p),
    price: p.price,
    finishes: p.finishes.map((f) => ({
      code: f.code,
      accent: f.accent,
      image: f.image,
      image700: f.image700,
    })),
  }));

  // กำแพงย้ายมาอยู่ที่นี่ — แผงเดิมทุกอย่าง ต่างกันแค่มันกรองกริดข้างล่างแทน
  // การพาไปหน้าใหม่ จำนวนต่อเฉดยังมาจาก finishIndex ตัวเดียวกับที่หน้า /finish ใช้
  const panels: WallPanel[] = finishIndex.map((f) => ({
    code: f.code,
    name: f.name,
    count: f.count,
    material: f.material,
    accent: f.accent,
    scrim: panelScrim(f.accent),
    products: WALL_PANEL_PRODUCTS[f.code] ?? [],
  }));

  return <ProductsContent items={items} panels={panels} />;
}
