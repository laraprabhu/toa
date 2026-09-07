import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NoticeView } from '@/components/notice-view';
import { getPublishedAnnouncements } from '@/lib/announcements';

export const metadata: Metadata = {
  title: 'Resident update',
  description: 'Official resident update from TOA.',
};

export default function NoticePage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading update…</main>}>
      <NoticeView announcements={getPublishedAnnouncements()} />
    </Suspense>
  );
}
