import ProductPage, { meta, staticParams, type Props } from '@/app/_routes/product';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('th');

export default function Page(props: Props) {
  return <ProductPage {...props} lang="th" />;
}
