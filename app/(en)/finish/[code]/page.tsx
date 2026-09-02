import FinishPage, { meta, staticParams, type Props } from '@/app/_routes/finish';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('en');

export default function Page(props: Props) {
  return <FinishPage {...props} lang="en" />;
}
