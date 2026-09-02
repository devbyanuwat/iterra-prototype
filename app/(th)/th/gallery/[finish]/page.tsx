import GalleryFinishPage, { meta, staticParams, type Props } from '@/app/_routes/gallery-finish';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('th');

export default function Page(props: Props) {
  return <GalleryFinishPage {...props} lang="th" />;
}
