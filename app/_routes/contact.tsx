import type { Metadata } from 'next';
import ContactContent from '@/components/ContactContent';
import { dict, type Lang } from '@/lib/i18n';
import { alternates } from '@/app/_lib/routes';

export const path = '/contact/';

export const meta = (lang: Lang): Metadata => ({
  title: dict[lang].meta.contact.title,
  description: dict[lang].meta.contact.description,
  alternates: alternates(lang, path),
});

export default function ContactPage() {
  return <ContactContent />;
}
