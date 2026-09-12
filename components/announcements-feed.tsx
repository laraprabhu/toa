'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  MapPin,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Announcement, AnnouncementCategory } from '@/lib/announcements';
import { siteHref } from '@/lib/site-path';

const categoryConfig: Record<
  AnnouncementCategory,
  { label: string; icon: typeof CalendarDays; className: string }
> = {
  urgent: {
    label: 'Urgent',
    icon: AlertTriangle,
    className: 'category-urgent',
  },
  maintenance: {
    label: 'Maintenance',
    icon: Settings,
    className: 'category-maintenance',
  },
  event: { label: 'Event', icon: Sparkles, className: 'category-event' },
  action: {
    label: 'Action required',
    icon: CircleCheck,
    className: 'category-action',
  },
  community: {
    label: 'Community',
    icon: Users,
    className: 'category-community',
  },
};

const filters: Array<{ value: 'all' | AnnouncementCategory; label: string }> = [
  { value: 'all', label: 'All updates' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'event', label: 'Events' },
  { value: 'action', label: 'Action required' },
  { value: 'community', label: 'Community' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function AnnouncementsFeed({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [activeCategory, setActiveCategory] = useState<
    'all' | AnnouncementCategory
  >('all');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return announcements
      .filter((announcement) => {
        const isCurrent =
          !announcement.expiresAt ||
          new Date(announcement.expiresAt).getTime() >= now;
        const matchesCategory =
          activeCategory === 'all' || announcement.category === activeCategory;
        const haystack =
          `${announcement.title} ${announcement.summary} ${announcement.location ?? ''}`.toLowerCase();
        return (
          isCurrent &&
          matchesCategory &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  }, [activeCategory, announcements, now, query]);

  const featured = visible[0];
  const rest = visible.filter((item) => item.id !== featured?.id);

  return (
    <div>
      <div className="sticky-controls">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search announcements</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search updates"
          />
        </label>
        <div className="filter-row" aria-label="Filter announcements">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={
                activeCategory === filter.value
                  ? 'filter-chip active'
                  : 'filter-chip'
              }
              onClick={() => setActiveCategory(filter.value)}
              aria-pressed={activeCategory === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {featured ? (
        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
          <FeaturedCard announcement={featured} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 2).map((announcement) => (
              <CompactCard announcement={announcement} key={announcement.id} />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} aria-hidden="true" />
          <h2>No matching updates</h2>
          <p>Try another search or choose a different category.</p>
        </div>
      )}

      {rest.length > 2 && (
        <section className="mt-10" aria-labelledby="more-updates">
          <div className="section-heading">
            <h2 id="more-updates">More updates</h2>
            <span>{rest.length - 2} notices</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rest.slice(2).map((announcement) => (
              <CompactCard announcement={announcement} key={announcement.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryLabel({ announcement }: { announcement: Announcement }) {
  const config = categoryConfig[announcement.category];
  const Icon = config.icon;
  return (
    <span className={`category-label ${config.className}`}>
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function FeaturedCard({ announcement }: { announcement: Announcement }) {
  return (
    <article className="featured-card">
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryLabel announcement={announcement} />
          <span className="text-sm text-white/65">
            Announcement #{announcement.number} ·{' '}
            {formatDate(announcement.publishedAt)}
          </span>
        </div>
        <div className="mt-auto pt-20 sm:pt-28">
          <h2 className="max-w-2xl font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
            {announcement.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            {announcement.summary}
          </p>
          <MetaRow announcement={announcement} featured />
          <a
            className="read-button mt-7"
            href={siteHref(`/${announcement.number}/`)}
          >
            Read complete update <ChevronRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

function CompactCard({ announcement }: { announcement: Announcement }) {
  return (
    <article className="compact-card">
      <div className="flex items-start justify-between gap-4">
        <CategoryLabel announcement={announcement} />
        <span className="text-xs text-muted-foreground">
          #{announcement.number} · {formatDate(announcement.publishedAt)}
        </span>
      </div>
      <h3>{announcement.title}</h3>
      <p>{announcement.summary}</p>
      <MetaRow announcement={announcement} />
      <a className="card-link" href={siteHref(`/${announcement.number}/`)}>
        View details <ChevronRight size={16} aria-hidden="true" />
      </a>
    </article>
  );
}

function MetaRow({
  announcement,
  featured = false,
}: {
  announcement: Announcement;
  featured?: boolean;
}) {
  if (!announcement.eventDate && !announcement.location) return null;
  return (
    <div className={featured ? 'meta-row featured-meta' : 'meta-row'}>
      {announcement.eventDate && (
        <span>
          <Clock3 size={15} aria-hidden="true" />
          {announcement.eventDate}
        </span>
      )}
      {announcement.location && (
        <span>
          <MapPin size={15} aria-hidden="true" />
          {announcement.location}
        </span>
      )}
    </div>
  );
}
