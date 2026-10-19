import type { Metadata } from 'next';
import { IssueTracker } from '@/components/erl-issues/issue-tracker';
import { erlIssues } from '@/lib/erl-issues';

export const metadata: Metadata = {
  title: 'ERL Progress Tracker',
  description:
    'Keep this tracker handy. Track ERL’s pending commitments and ensure owners receive what is rightfully due before issuing the NOC.',
  alternates: {
    canonical: 'https://laraprabhu.github.io/toa/erl-issues/',
  },
  openGraph: {
    type: 'website',
    url: 'https://laraprabhu.github.io/toa/erl-issues/',
    siteName: 'ERL Progress Tracker',
    title: 'ERL Progress Tracker',
    description:
      'Keep this tracker handy. Track ERL’s pending commitments and ensure owners receive what is rightfully due before issuing the NOC.',
    images: [
      {
        url: 'https://laraprabhu.github.io/toa/erl-issues-og.png',
        width: 1200,
        height: 630,
        alt: 'ERL Progress Tracker for TOA owners',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ERL Progress Tracker',
    description:
      'Track ERL’s pending commitments and what owners are rightfully due before issuing the NOC.',
    images: ['https://laraprabhu.github.io/toa/erl-issues-og.png'],
  },
};

export default function ErlIssuesPage() {
  return (
    <main className="h-svh overflow-hidden bg-ink text-foreground">
      <IssueTracker issues={erlIssues} />
    </main>
  );
}
