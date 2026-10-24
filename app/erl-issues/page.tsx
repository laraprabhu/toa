import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ERL Progress Tracker · Temporarily unavailable',
  description: 'The ERL Progress Tracker is temporarily unavailable.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://laraprabhu.github.io/toa/erl-issues/',
  },
  openGraph: {
    type: 'website',
    url: 'https://laraprabhu.github.io/toa/erl-issues/',
    siteName: 'ERL Progress Tracker',
    title: 'ERL Progress Tracker · Temporarily unavailable',
    description: 'The ERL Progress Tracker is temporarily unavailable.',
    images: [
      {
        url: 'https://laraprabhu.github.io/toa/erl-issues-og-v2.png',
        width: 1200,
        height: 630,
        alt: 'ERL Progress Tracker for TOA owners',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ERL Progress Tracker · Temporarily unavailable',
    description: 'The ERL Progress Tracker is temporarily unavailable.',
    images: ['https://laraprabhu.github.io/toa/erl-issues-og-v2.png'],
  },
};

export default function ErlIssuesPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-ink px-6 text-foreground">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] px-7 py-10 text-center shadow-2xl shadow-black/30">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-mint">
          ERL Progress Tracker
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white">
          Temporarily unavailable
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/65">
          The tracker is currently offline. Please check again later.
        </p>
      </section>
    </main>
  );
}
