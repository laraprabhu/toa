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
  if (!announcement) return { title: 'Resident update' };

  const title = `Announcement #${announcement.number}: ${announcement.title}`;
  const url = `https://laraprabhu.github.io/toa-noticeboard/notice/${encodeURIComponent(announcement.slug)}/`;
  const imageUrl = announcement.image
    ? `https://laraprabhu.github.io/toa-noticeboard${announcement.image.startsWith('/') ? announcement.image : `/${announcement.image}`}`
    : undefined;
  const image = imageUrl
    ? `${imageUrl}?v=${encodeURIComponent(announcement.previewVersion ?? `${announcement.number}-banner-1`)}`
    : undefined;

  return {
    title,
    description: announcement.summary,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'TOA Noticeboard',
      title,
      description: announcement.summary,
      publishedTime: announcement.publishedAt,
      images: image ? [{ url: image, width: 1200, height: 630, alt: `TOA Announcement #${announcement.number}` }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: announcement.summary,
      images: image ? [image] : [],
    },
  };
}

export default async function NoticePage({ params }: NoticePageProps) {
  const announcement = getAnnouncement((await params).slug);
  if (!announcement) notFound();

  return <NoticeView announcement={announcement} />;
}
