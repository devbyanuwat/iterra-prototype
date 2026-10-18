import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import CatalogContent from '@/components/CatalogContent';
import { db } from '@/lib/db';
import { getCatalog } from '@/lib/server/catalog';

// metadata กับหน้าใช้ query เดียวกันใน request เดียว
const load = cache(() => getCatalog(db));

export async function generateMetadata(): Promise<Metadata> {
  const c = await load();
  return {
    title: 'แคตตาล็อก KOHLER Kitchens 2026',
    description: `เปิดดูและดาวน์โหลดแคตตาล็อกครัวและตู้เสื้อผ้า KOHLER Kitchens 2026 ฉบับเต็ม${c && c.pages > 0 ? ` ${c.pages} หน้า` : ''}`,
    alternates: { canonical: '/catalog/' },
  };
}

export default async function CatalogPage() {
  const catalog = await load();
  if (!catalog) notFound();
  return <CatalogContent catalog={catalog} />;
}
