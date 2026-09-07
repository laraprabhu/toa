import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TOA Noticeboard',
    template: '%s · TOA Noticeboard',
  },
  description: 'Official resident announcements, events and maintenance updates from TOA.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
