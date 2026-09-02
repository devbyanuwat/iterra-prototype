import ArticlePage, { meta, staticParams, type Props } from '@/app/_routes/article';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('th');

export default function Page(props: Props) {
  return <ArticlePage {...props} lang="th" />;
}
