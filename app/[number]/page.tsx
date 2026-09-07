import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NoticeView } from '@/components/notice-view';
import { getAnnouncementByNumber, getPublishedAnnouncements } from '@/lib/announcements';

type NumberedNoticePageProps = {
  params: Promise<{ number: string }>;
};

export const dynamicParams = false;
const minimalPreviewTitle = 'TOA Noticeboard';
const hiddenPreviewDescription = '\u200B';

export function generateStaticParams() {
  return getPublishedAnnouncements().map(({ number }) => ({ number: String(number) }));
}

export async function generateMetadata({ params }: NumberedNoticePageProps): Promise<Metadata> {
  const announcement = getAnnouncementByNumber((await params).number);
  if (!announcement) return { title: 'Resident update' };

  const url = `https://laraprabhu.github.io/toa/${announcement.number}/`;
  const imageUrl = announcement.image
    ? `https://laraprabhu.github.io/toa${announcement.image.startsWith('/') ? announcement.image : `/${announcement.image}`}`
    : undefined;
  const image = imageUrl
    ? `${imageUrl}?v=${encodeURIComponent(announcement.previewVersion ?? `${announcement.number}-banner-1`)}`
    : undefined;

  return {
    title: { absolute: minimalPreviewTitle },
    description: hiddenPreviewDescription,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: minimalPreviewTitle,
      description: hiddenPreviewDescription,
      publishedTime: announcement.publishedAt,
      images: image ? [{ url: image, width: 1200, height: announcement.previewHeight ?? 800, alt: `TOA Announcement #${announcement.number}` }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: minimalPreviewTitle,
      description: hiddenPreviewDescription,
      images: image ? [image] : [],
    },
  };
}

export default async function NumberedNoticePage({ params }: NumberedNoticePageProps) {
  const announcement = getAnnouncementByNumber((await params).number);
  if (!announcement) notFound();

  return <NoticeView announcement={announcement} />;
}
