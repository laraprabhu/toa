import type { Metadata } from 'next';
import { Building2, HardHat, ShieldCheck } from 'lucide-react';
import { IssueTracker } from '@/components/erl-issues/issue-tracker';
import { erlIssues } from '@/lib/erl-issues';
import { siteHref } from '@/lib/site-path';

export const metadata: Metadata = {
  title: 'ERL Issue Tracker',
  description:
    'TOA progress tracker for issues and deliverables assigned to ERL.',
};

export default function ErlIssuesPage() {
  return (
    <main className="min-h-screen bg-[#f3f6f5] text-foreground">
      <header className="border-b border-white/10 bg-ink text-white">
        <div className="page-shell flex min-h-20 items-center justify-between gap-4 py-4">
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
                TOA · ERL Issue Tracker
              </strong>
              <span className="block truncate text-sm text-slate-300">
                Delivery progress for owners
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

      <section className="border-b border-slate-200 bg-white">
        <div className="page-shell py-8 sm:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-teal">
                <Building2 size={15} aria-hidden="true" /> Tejomaya Owners
                Association
              </p>
              <h1 className="mt-3 font-heading text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-ink sm:text-6xl">
                ERL delivery progress,
                <span className="block text-teal">issue by issue.</span>
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              A transparent view of the commitments tracked by TOA. Status is
              evaluated conservatively: promises and target dates are not
              treated as completed delivery.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell py-7 sm:py-10">
        <IssueTracker issues={erlIssues} />
      </section>

      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="page-shell flex flex-col gap-2 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>TOA · ERL Issue Tracker</p>
          <p>Source review: TOA–ERL MoM dated 29 August 2026</p>
        </div>
      </footer>
    </main>
  );
}
