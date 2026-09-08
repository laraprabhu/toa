'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Announcement } from '@/lib/announcements';

const categoryLabels: Record<Announcement['category'], string> = {
  urgent: 'Urgent update',
  maintenance: 'Maintenance',
  event: 'Community event',
  action: 'Action required',
  community: 'Community update',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function NoticeMetaStrip({
  announcement,
}: {
  announcement: Announcement;
}) {
  const stripRef = useRef<HTMLElement>(null);
  const [hasMoreContent, setHasMoreContent] = useState(false);

  const updateScrollShadow = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const maximumScroll = strip.scrollWidth - strip.clientWidth;
    setHasMoreContent(
      maximumScroll > 1 && strip.scrollLeft < maximumScroll - 1,
    );
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    updateScrollShadow();
    const observer = new ResizeObserver(updateScrollShadow);
    observer.observe(strip);

    return () => observer.disconnect();
  }, [updateScrollShadow]);

  return (
    <div
      className="notice-meta-strip-shell"
      data-has-more-content={hasMoreContent || undefined}
    >
      <footer
        ref={stripRef}
        className="notice-meta-strip"
        onScroll={updateScrollShadow}
        aria-label="Announcement details"
      >
        <span>Announcement #{announcement.number}</span>
        <span className="notice-meta-separator" aria-hidden="true">
          ·
        </span>
        <time dateTime={announcement.publishedAt}>
          {formatDate(announcement.publishedAt)}
        </time>
        <span className="notice-meta-separator" aria-hidden="true">
          ·
        </span>
        <span className="notice-meta-category">
          <span
            className={`notice-meta-dot notice-meta-dot-${announcement.category}`}
            aria-hidden="true"
          />
          {categoryLabels[announcement.category]}
        </span>
      </footer>
    </div>
  );
}
