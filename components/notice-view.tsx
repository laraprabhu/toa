import { ArrowLeft, Building2, CalendarDays, Clock3, ExternalLink, MapPin, UserRound } from 'lucide-react';
import type { Announcement } from '@/lib/announcements';
import { ShareButton } from '@/components/share-button';
import { siteHref } from '@/lib/site-path';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

const categoryLabels: Record<Announcement['category'], string> = {
  urgent: 'Urgent update',
  maintenance: 'Maintenance',
  event: 'Community event',
  action: 'Action required',
  community: 'Community update',
};

export function NoticeView({ announcement }: { announcement: Announcement }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-white/10 bg-ink text-white">
        <div className="page-shell flex min-h-20 items-center justify-between gap-4 py-4">
          <a href={siteHref('/')} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sun text-ink"><Building2 size={21} aria-hidden="true" /></span>
            <strong className="font-heading text-lg">TOA Noticeboard</strong>
          </a>
          <a className="admin-link" href={siteHref('/')}><ArrowLeft size={16} aria-hidden="true" /> All updates</a>
        </div>
      </header>

      <article className="page-shell py-8 sm:py-14">
        <div className="notice-layout">
          <div className="notice-article">
            <h1>{announcement.title}</h1>
            <p className="notice-summary">{announcement.summary}</p>
            <div className="notice-body">
              {announcement.body.split('\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {announcement.actionUrl && (
              <a className="primary-action mt-8" href={announcement.actionUrl} target="_blank" rel="noreferrer">
                {announcement.actionLabel ?? 'Open link'} <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
            <footer className="notice-meta-strip">
              <span>Announcement #{announcement.number}</span>
              <span className="notice-meta-separator" aria-hidden="true">·</span>
              <span>Published <time dateTime={announcement.publishedAt}>{formatDate(announcement.publishedAt)}</time></span>
              <span className="notice-meta-separator" aria-hidden="true">·</span>
              <span className="notice-meta-category">
                <span className={`notice-meta-dot notice-meta-dot-${announcement.category}`} aria-hidden="true" />
                {categoryLabels[announcement.category]}
              </span>
            </footer>
          </div>

          <aside className="notice-sidebar" aria-label="Notice information">
            <h2>At a glance</h2>
            {announcement.eventDate && <div className="info-row"><Clock3 aria-hidden="true" /><span><small>When</small>{announcement.eventDate}</span></div>}
            {announcement.location && <div className="info-row"><MapPin aria-hidden="true" /><span><small>Where</small>{announcement.location}</span></div>}
            {announcement.expiresAt && <div className="info-row"><CalendarDays aria-hidden="true" /><span><small>Current until</small>{formatDate(announcement.expiresAt)}</span></div>}
            {announcement.contact && <div className="info-row"><UserRound aria-hidden="true" /><span><small>Contact</small>{announcement.contact}</span></div>}
            <div className="mt-6 border-t border-white/10 pt-6">
              <ShareButton
                number={announcement.number}
                title={announcement.title}
                summary={announcement.summary}
                previewVersion={announcement.previewVersion}
              />
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
