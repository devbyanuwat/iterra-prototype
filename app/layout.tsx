import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { LangProvider } from '@/components/LangProvider';
import SmoothScroll from '@/components/SmoothScroll';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { CONTACT, SITE_NAME, SITE_TAGLINE_EN, SITE_TAGLINE_TH, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE_TH} | ${SITE_TAGLINE_EN}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'ITERRA ดีลเลอร์อุปกรณ์ครัวพรีเมียม คัดสรรก๊อกและซิงก์ครัวจาก KOHLER พร้อมโชว์รูมให้สัมผัสจริงในกรุงเทพฯ',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'th_TH',
    title: `${SITE_NAME} — ${SITE_TAGLINE_TH}`,
    description: 'คัดสรรก๊อกและซิงก์ครัวพรีเมียมจาก KOHLER',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  description: 'ดีลเลอร์อุปกรณ์ครัวพรีเมียม',
  telephone: CONTACT.phone,
  email: CONTACT.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '888 ถนนสุขุมวิท',
    addressLocality: 'คลองเตย',
    addressRegion: 'กรุงเทพมหานคร',
    postalCode: '10110',
    addressCountry: 'TH',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&family=Noto+Sans+Thai:wght@200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider>
          <SmoothScroll />
          <Nav />
          <main>{children}</main>
          <Footer />
        </LangProvider>
        <JsonLd data={organizationJsonLd} />
        <Analytics />
      </body>
    </html>
  );
}
