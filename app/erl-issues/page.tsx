import type { Metadata } from 'next';
import { HardHat, ShieldCheck } from 'lucide-react';
import { IssueTracker } from '@/components/erl-issues/issue-tracker';
import { erlIssues } from '@/lib/erl-issues';
import { siteHref } from '@/lib/site-path';

export const metadata: Metadata = {
  title: 'TOA · ERL Progress',
  description:
    'TOA progress hub for civil issues, funds and project documents tracked against ERL.',
};

export default function ErlIssuesPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f5] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/96 text-white backdrop-blur-xl">
        <div className="page-shell flex min-h-[4.5rem] items-center justify-between gap-4 py-3">
          <a
            href={siteHref('/erl-issues')}
            className="flex min-w-0 items-center gap-3"
            aria-label="TOA ERL Issue Tracker home"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sun text-ink shadow-sm">
              <HardHat aria-hidden="true" size={23} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-heading text-lg leading-tight tracking-tight">
                TOA · ERL Progress
              </strong>
              <span className="block truncate text-sm text-slate-300">
                Owners&apos; progress hub
              </span>
            </span>
          </a>
          <a
            className="admin-link shrink-0"
            href={siteHref('/erl-issues/admin')}
          >
            <ShieldCheck aria-hidden="true" size={16} />
            Admin
          </a>
        </div>
      </header>

      <section className="page-shell">
        <IssueTracker issues={erlIssues} />
      </section>
    </main>
  );
}
