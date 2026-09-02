import GalleryFinishPage, { meta, staticParams, type Props } from '@/app/_routes/gallery-finish';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('en');

export default function Page(props: Props) {
  return <GalleryFinishPage {...props} lang="en" />;
}
