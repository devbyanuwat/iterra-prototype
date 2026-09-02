import type { Metadata } from 'next';
import InfoContent from '@/components/InfoContent';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/info/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.info.title,
  description: dict[lang].meta.info.description,
  alternates: alternates(lang, path),
});

export default function InfoIndexPage() {
  return <InfoContent />;
}
