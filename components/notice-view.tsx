import type { CSSProperties } from 'react';
import { ArrowLeft, CalendarDays, Clock3, ExternalLink, MapPin, UserRound } from 'lucide-react';
import type { Announcement } from '@/lib/announcements';
import { ShareButton } from '@/components/share-button';
import { siteHref } from '@/lib/site-path';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

const particles = [
  ['8%', '18%', '5px', '12s', '-2s', '20px'],
  ['17%', '72%', '3px', '15s', '-7s', '-16px'],
  ['27%', '34%', '4px', '13s', '-4s', '18px'],
  ['38%', '84%', '6px', '17s', '-10s', '-22px'],
  ['48%', '14%', '3px', '14s', '-5s', '14px'],
  ['58%', '64%', '5px', '16s', '-9s', '-18px'],
  ['68%', '26%', '4px', '12s', '-6s', '22px'],
  ['77%', '78%', '3px', '15s', '-3s', '-14px'],
  ['86%', '40%', '6px', '18s', '-11s', '18px'],
  ['93%', '68%', '4px', '13s', '-8s', '-20px'],
] as const;

type ParticleStyle = CSSProperties & Record<'--x' | '--y' | '--size' | '--duration' | '--delay' | '--drift', string>;

export function NoticeView({ announcement }: { announcement: Announcement }) {
  return (
    <main className="notice-page">
      <div className="notice-atmosphere" aria-hidden="true">
        <span className="notice-glow notice-glow-one" />
        <span className="notice-glow notice-glow-two" />
        <span className="notice-grid" />
        {particles.map(([x, y, size, duration, delay, drift]) => (
          <span
            className="notice-particle"
            key={`${x}-${y}`}
            style={{ '--x': x, '--y': y, '--size': size, '--duration': duration, '--delay': delay, '--drift': drift } as ParticleStyle}
          />
        ))}
      </div>

      <header className="notice-topbar">
        <div className="notice-shell flex min-h-16 items-center justify-between gap-4 py-3">
          <a href={siteHref('/')} className="flex items-center gap-2.5 text-white">
            <span className="size-2.5 rounded-full bg-sun shadow-[0_0_20px_rgba(246,200,88,.8)]" aria-hidden="true" />
            <strong className="font-heading text-lg">TOA Noticeboard</strong>
          </a>
          <a className="notice-back-link" href={siteHref('/')}>
            <ArrowLeft size={16} aria-hidden="true" /> All announcements
          </a>
        </div>
      </header>

      <article className="notice-shell relative z-10 py-7 sm:py-12">
        <div className="notice-paper">
          <div className="notice-ribbon">
            <span>Announcement</span>
            <strong>#{announcement.number}</strong>
          </div>
          <div className="notice-meta">
            <span className={`notice-category notice-category-${announcement.category}`}>
              {announcement.category === 'action' ? 'Action required' : announcement.category}
            </span>
            <time dateTime={announcement.publishedAt}>Published {formatDate(announcement.publishedAt)}</time>
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
              <ShareButton number={announcement.number} title={announcement.title} summary={announcement.summary} />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
