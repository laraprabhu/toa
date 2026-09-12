import announcementsData from '@/content/announcements.json';

export type AnnouncementCategory =
  | 'urgent'
  | 'maintenance'
  | 'event'
  | 'action'
  | 'community';
export type AnnouncementPriority = 'normal' | 'high';
export type AnnouncementStatus = 'draft' | 'published';

export interface AnnouncementImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Announcement {
  number: number;
  id: string;
  slug: string;
  title: string;
  summary: string;
  image?: string;
  previewVersion?: string;
  previewHeight?: number;
  images?: AnnouncementImage[];
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string;
  expiresAt?: string;
  eventDate?: string;
  location?: string;
  actionLabel?: string;
  actionUrl?: string;
  contact?: string;
}

export const announcements = announcementsData as Announcement[];

export function getPublishedAnnouncements() {
  return announcements
    .filter((announcement) => announcement.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export function getAnnouncement(slug: string) {
  return getPublishedAnnouncements().find(
    (announcement) => announcement.slug === slug,
  );
}

export function getAnnouncementByNumber(number: string | number) {
  const announcementNumber =
    typeof number === 'number' ? number : Number(number);
  if (!Number.isInteger(announcementNumber) || announcementNumber < 1)
    return undefined;
  return getPublishedAnnouncements().find(
    (announcement) => announcement.number === announcementNumber,
  );
}
