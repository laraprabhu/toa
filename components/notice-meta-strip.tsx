'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
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
  viewApiUrl,
}: {
  announcement: Announcement;
  viewApiUrl: string;
}) {
  const stripRef = useRef<HTMLElement>(null);
  const [hasMoreContent, setHasMoreContent] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

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

  useEffect(() => {
    if (!viewApiUrl) return;

    const controller = new AbortController();
    const counterUrl = `${viewApiUrl.replace(/\/$/, '')}/api/views/${announcement.number}`;
    const deviceViewKey = `toa:viewed-announcement:${announcement.number}`;
    let hasViewed = false;

    try {
      hasViewed = window.localStorage.getItem(deviceViewKey) === '1';
    } catch {
      // Browsers with storage disabled still receive a working view counter.
    }

    async function recordView() {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(counterUrl, {
            method: hasViewed ? 'GET' : 'POST',
            credentials: 'omit',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Unable to record view.');

          const { views } = (await response.json()) as { views?: unknown };
          if (
            typeof views === 'number' &&
            Number.isSafeInteger(views) &&
            views >= 0
          ) {
            setViewCount(views);
            if (!hasViewed) {
              try {
                window.localStorage.setItem(deviceViewKey, '1');
              } catch {
                // The count is still useful when storage is unavailable.
              }
            }
          }
          return;
        } catch (error) {
          if (controller.signal.aborted) return;
          if (attempt === 2) {
            console.warn(error);
            return;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 400 * 2 ** attempt),
          );
        }
      }
    }

    void recordView();

    return () => controller.abort();
  }, [announcement.number, viewApiUrl]);

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
        <span
          className="notice-meta-views"
          aria-label={
            viewCount === null ? 'View count loading' : `${viewCount} views`
          }
        >
          <Eye aria-hidden="true" />
          Views
          {viewCount === null ? '' : ` ${viewCount.toLocaleString('en-IN')}`}
        </span>
        <span className="notice-meta-separator" aria-hidden="true">
          ·
        </span>
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
