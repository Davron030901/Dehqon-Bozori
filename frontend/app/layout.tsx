import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PwaRegister from '@/components/PwaRegister';
import { strings } from '@/lib/strings';

import './globals.css';

// `display: swap` matters here: on a slow rural connection the text should be
// readable immediately rather than waiting on a font download.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dehqonbozori.uz'),
  title: {
    default: `${strings.brand} 🌿 — vositachisiz qishloq bozori`,
    template: `%s — ${strings.brand} 🌿`,
  },
  description:
    'Qishloq dehqonlaridan to’g’ridan-to’g’ri meva, sabzavot, don va sut mahsulotlari. Vositachisiz, ro’yxatdan o’tmasdan.',
  applicationName: strings.brand,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: strings.brand,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  openGraph: {
    type: 'website',
    siteName: strings.brand,
    title: `${strings.brand} 🌿`,
    description: strings.home.heroSubtitle,
    locale: 'uz_UZ',
  },
};

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <PwaRegister />
      </body>
    </html>
  );
}
