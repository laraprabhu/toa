import announcementsData from '@/content/announcements.json';

export type AnnouncementCategory = 'urgent' | 'maintenance' | 'event' | 'action' | 'community';
export type AnnouncementPriority = 'normal' | 'high';
export type AnnouncementStatus = 'draft' | 'published';

export interface Announcement {
  id: string;
  slug: string;
  title: string;
  summary: string;
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
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getAnnouncement(slug: string) {
  return getPublishedAnnouncements().find((announcement) => announcement.slug === slug);
}
