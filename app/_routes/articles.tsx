import type { Metadata } from 'next';
import ArticlesContent from '@/components/ArticlesContent';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/articles/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.articles.title,
  description: dict[lang].meta.articles.description,
  alternates: alternates(lang, path),
});

export default function ArticlesPage() {
  return <ArticlesContent />;
}
