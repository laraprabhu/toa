import { FileText, Paperclip } from 'lucide-react';
import type { AnnouncementAttachment } from '@/lib/announcements';
import { siteHref } from '@/lib/site-path';

function formatFileSize(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  if (size >= 1_000) return `${Math.round(size / 1_000)} KB`;
  return `${size} B`;
}

export function NoticeAttachments({
  attachments,
  resolveSrc = siteHref,
}: {
  attachments: AnnouncementAttachment[];
  resolveSrc?: (src: string) => string;
}) {
  return (
    <section className="notice-attachments" aria-label="Attachments">
      <h2>
        <Paperclip aria-hidden="true" /> Attachments:
      </h2>
      <div>
        {attachments.map((attachment) => (
          <a
            href={resolveSrc(attachment.src)}
            download={attachment.name}
            key={attachment.src}
          >
            <FileText aria-hidden="true" />
            <span>{attachment.name}</span>
            <small>{formatFileSize(attachment.size)}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
