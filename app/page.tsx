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
          <a href={siteHref('/')} className="flex items-center gap-3" aria-label="TOA Noticeboard home">
            <span className="grid size-11 place-items-center rounded-2xl bg-sun text-ink shadow-sm">
              <Building2 aria-hidden="true" size={23} strokeWidth={2.2} />
            </span>
            <span>
              <strong className="block font-heading text-lg leading-tight tracking-tight">TOA Noticeboard</strong>
              <span className="text-sm text-slate-300">Resident communication hub</span>
            </span>
          </a>
          <a className="admin-link" href={siteHref('/admin')}>
            <ShieldCheck aria-hidden="true" size={16} />
            Admin
          </a>
        </div>
      </header>

      <section className="page-shell py-8 sm:py-12">
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="eyebrow"><BellRing size={15} aria-hidden="true" /> Community updates</div>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-ink sm:text-6xl">
              Everything important,<br />without the message overload.
            </h1>
          </div>
          <p className="max-w-md text-base leading-7 text-muted-foreground lg:pb-1">
            Timely updates about events, maintenance and resident actions—organized in one calm, searchable place.
          </p>
        </div>

        <AnnouncementsFeed announcements={announcements} />
      </section>

      <footer className="border-t border-border bg-white">
        <div className="page-shell flex flex-col gap-2 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>TOA Noticeboard · Managed by the residents association</p>
          <p>For emergencies, contact the security desk directly.</p>
        </div>
      </footer>
    </main>
  );
}
