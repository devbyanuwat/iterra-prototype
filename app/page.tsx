import type { Metadata } from 'next';
import HomeContent from '@/components/home/HomeContent';
import { SITE_TAGLINE_TH, SITE_TAGLINE_EN } from '@/lib/site';
import { db } from '@/lib/db';
import { getCatalog } from '@/lib/server/catalog';
import { getHeroVideo } from '@/lib/server/hero-video';

export const metadata: Metadata = {
  title: `ITERRA — ${SITE_TAGLINE_TH} | ${SITE_TAGLINE_EN}`,
  description:
    'คัดสรรก๊อกและซิงก์ครัวพรีเมียมจาก KOHLER สัมผัสจริงได้ที่โชว์รูม ITERRA กรุงเทพฯ',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [catalog, hero] = await Promise.all([getCatalog(db), getHeroVideo(db)]);
  return <HomeContent catalog={catalog} hero={hero} />;
}
