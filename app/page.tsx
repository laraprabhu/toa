import { BellRing, Building2, ShieldCheck } from 'lucide-react';
import { AnnouncementsFeed } from '@/components/announcements-feed';
import { getPublishedAnnouncements } from '@/lib/announcements';
import { siteHref } from '@/lib/site-path';

export default function Home() {
  const announcements = getPublishedAnnouncements();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-ink text-white">
        <div className="page-shell flex min-h-20 items-center justify-between gap-4 py-4">
          <a
            href={siteHref('/')}
            className="flex items-center gap-3"
            aria-label="TOA Noticeboard home"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-sun text-ink shadow-sm">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.2} />
            </span>
            <span>
              <strong className="block font-heading text-lg leading-tight tracking-tight">
                TOA Noticeboard
              </strong>
              <span className="text-sm text-slate-300">
                Resident communication hub
              </span>
            </span>
          </a>
          <a className="admin-link" href={siteHref('/admin')}>
            <ShieldCheck aria-hidden="true" size={16} />
            Admin
          </a>
        </div>
      </header>

      <section className="page-shell py-8 sm:py-12">
        <h1 className="eyebrow mb-8">
          <BellRing size={15} aria-hidden="true" /> TEJOMAYA COMMUNITY UPDATES
        </h1>

        <AnnouncementsFeed announcements={announcements} />
      </section>

      <footer className="border-t border-border bg-white">
        <div className="page-shell flex flex-col gap-2 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>TOA Noticeboard · Managed by Tejomaya Owners Association</p>
        </div>
      </footer>
    </main>
  );
}
