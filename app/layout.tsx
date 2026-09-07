import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://laraprabhu.github.io/toa/';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TOA Noticeboard',
    template: '%s · TOA Noticeboard',
  },
  description: 'Official resident announcements, events and maintenance updates from TOA.',
  alternates: { canonical: siteUrl },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'TOA Noticeboard',
    title: 'TOA Noticeboard',
    description: 'Clear updates for our community.',
    images: [{ url: 'og.png', width: 1200, height: 630, alt: 'TOA Noticeboard — Clear updates for our community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TOA Noticeboard',
    description: 'Clear updates for our community.',
    images: ['og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
