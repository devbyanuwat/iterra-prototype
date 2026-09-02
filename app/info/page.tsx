import type { Metadata } from 'next';
import InfoContent from '@/components/InfoContent';
import { dict, DEFAULT_LANG } from '@/lib/i18n';

const t = dict[DEFAULT_LANG];

export const metadata: Metadata = {
  title: t.info.title,
  description: t.info.sub,
  alternates: { canonical: '/info/' },
};

export default function InfoIndexPage() {
  return <InfoContent />;
}
