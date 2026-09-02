import FinishPage, { meta, staticParams, type Props } from '@/app/_routes/finish';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('th');

export default function Page(props: Props) {
  return <FinishPage {...props} lang="th" />;
}
