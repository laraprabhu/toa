import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NoticeView } from '@/components/notice-view';
import { getAnnouncement, getPublishedAnnouncements } from '@/lib/announcements';

type NoticePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedAnnouncements().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: NoticePageProps): Promise<Metadata> {
  const announcement = getAnnouncement((await params).slug);

  return {
    title: announcement?.title ?? 'Resident update',
    description: announcement?.summary ?? 'Official resident update from TOA.',
  };
}

export default async function NoticePage({ params }: NoticePageProps) {
  const announcement = getAnnouncement((await params).slug);
  if (!announcement) notFound();

  return <NoticeView announcement={announcement} />;
}
