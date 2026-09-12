'use client';

import { useEffect, useRef } from 'react';
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  EyeOff,
  LockKeyhole,
  MapPin,
  UserRound,
  X,
} from 'lucide-react';
import type { Announcement } from '@/lib/announcements';
import { NoticeImageGallery } from '@/components/notice-image-gallery';
import { siteHref } from '@/lib/site-path';

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

function formatBody(value: string) {
  return value
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((paragraph) => paragraph.length > 0);
}

function resolvePreviewImage(src: string) {
  return src.startsWith('data:') ? src : siteHref(src);
}

export function AdminNoticePreview({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !document.querySelector('.notice-lightbox')
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="admin-notice-preview"
      open
      aria-modal="true"
      aria-labelledby="admin-notice-preview-title"
      tabIndex={-1}
    >
      <header className="admin-preview-toolbar">
        <div>
          <span className="admin-preview-lock">
            <LockKeyhole aria-hidden="true" /> Private preview
          </span>
          <small>
            This preview stays in your browser and does not publish changes.
          </small>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notice preview"
        >
          <X aria-hidden="true" />
          <span>Close preview</span>
        </button>
      </header>

      <div className="admin-preview-scroll">
        <article className="page-shell py-8 sm:py-14">
          <div className="notice-layout">
            <div className="notice-article">
              <h1 id="admin-notice-preview-title">{announcement.title}</h1>
              <p className="notice-summary">{announcement.summary}</p>
              {announcement.images && announcement.images.length > 0 && (
                <NoticeImageGallery
                  images={announcement.images}
                  resolveSrc={resolvePreviewImage}
                />
              )}
              <div className="notice-body">
                {formatBody(announcement.body).map(
                  (paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>
                      {paragraph.map((line, lineIndex) => (
                        <span className="block" key={lineIndex}>
                          {line}
                        </span>
                      ))}
                    </p>
                  ),
                )}
              </div>
              {announcement.actionUrl && (
                <span className="primary-action mt-8" aria-disabled="true">
                  {announcement.actionLabel ?? 'Open link'}{' '}
                  <ExternalLink size={16} aria-hidden="true" />
                </span>
              )}
              <div className="notice-meta-strip-shell">
                <footer
                  className="notice-meta-strip"
                  aria-label="Preview announcement details"
                >
                  <span className="notice-meta-views">
                    <EyeOff aria-hidden="true" /> Private preview
                  </span>
                  <span className="notice-meta-separator" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {announcement.number > 0
                      ? `Announcement #${announcement.number}`
                      : 'Number assigned when saved'}
                  </span>
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
            </div>

            <aside className="notice-sidebar" aria-label="Preview information">
              <h2>At a glance</h2>
              {announcement.eventDate && (
                <div className="info-row">
                  <Clock3 aria-hidden="true" />
                  <span>
                    <small>When</small>
                    {announcement.eventDate}
                  </span>
                </div>
              )}
              {announcement.location && (
                <div className="info-row">
                  <MapPin aria-hidden="true" />
                  <span>
                    <small>Where</small>
                    {announcement.location}
                  </span>
                </div>
              )}
              {announcement.expiresAt && (
                <div className="info-row">
                  <CalendarDays aria-hidden="true" />
                  <span>
                    <small>Current until</small>
                    {formatDate(announcement.expiresAt)}
                  </span>
                </div>
              )}
              {announcement.contact && (
                <div className="info-row">
                  <UserRound aria-hidden="true" />
                  <span>
                    <small>Contact</small>
                    {announcement.contact}
                  </span>
                </div>
              )}
              <div className="admin-preview-share-note">
                <LockKeyhole aria-hidden="true" /> Sharing is available after
                publishing
              </div>
            </aside>
          </div>
        </article>
      </div>
    </dialog>
  );
}
