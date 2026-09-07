import { ArrowLeft, CalendarDays, Clock3, ExternalLink, MapPin, UserRound } from 'lucide-react';
import type { Announcement } from '@/lib/announcements';
import { ShareButton } from '@/components/share-button';
import { siteHref } from '@/lib/site-path';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function NoticeView({ announcement }: { announcement: Announcement }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="notice-shell flex min-h-16 items-center justify-between gap-4 py-3">
          <a href={siteHref('/')} className="flex items-center gap-2.5 text-ink">
            <span className="size-2.5 rounded-full bg-sun ring-4 ring-sun/20" aria-hidden="true" />
            <strong className="font-heading text-lg">TOA Noticeboard</strong>
          </a>
          <a className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink" href={siteHref('/')}>
            <ArrowLeft size={16} aria-hidden="true" /> All announcements
          </a>
        </div>
      </header>

      <article className="notice-shell py-7 sm:py-12">
        <div className="notice-paper">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <strong className="text-teal">Announcement #{announcement.number}</strong>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{announcement.category === 'action' ? 'Action required' : announcement.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={announcement.publishedAt}>{formatDate(announcement.publishedAt)}</time>
          </div>
          <h1>{announcement.title}</h1>
          <p className="notice-summary">{announcement.summary}</p>
          <div className="notice-body">
            {announcement.body.split('\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          {(announcement.eventDate || announcement.location || announcement.expiresAt || announcement.contact) && (
            <dl className="notice-facts">
              {announcement.eventDate && <div><dt><Clock3 aria-hidden="true" /> When</dt><dd>{announcement.eventDate}</dd></div>}
              {announcement.location && <div><dt><MapPin aria-hidden="true" /> Where</dt><dd>{announcement.location}</dd></div>}
              {announcement.expiresAt && <div><dt><CalendarDays aria-hidden="true" /> Current until</dt><dd>{formatDate(announcement.expiresAt)}</dd></div>}
              {announcement.contact && <div><dt><UserRound aria-hidden="true" /> Contact</dt><dd>{announcement.contact}</dd></div>}
            </dl>
          )}

          <div className="notice-actions">
            {announcement.actionUrl && (
              <a className="primary-action" href={announcement.actionUrl} target="_blank" rel="noreferrer">
                {announcement.actionLabel ?? 'Open link'} <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
            <div className="w-full sm:ml-auto sm:w-auto">
              <ShareButton title={announcement.title} summary={announcement.summary} />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
