import PaletteGroupPage, { meta, staticParams, type Props } from '@/app/_routes/palette-group';

export const generateStaticParams = staticParams;
export const generateMetadata = meta('en');

export default function Page(props: Props) {
  return <PaletteGroupPage {...props} lang="en" />;
}
