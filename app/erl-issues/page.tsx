import type { Metadata } from 'next';
import { IssueTracker } from '@/components/erl-issues/issue-tracker';
import { erlIssues } from '@/lib/erl-issues';

export const metadata: Metadata = {
  title: 'TOA · ERL Progress',
  description:
    'TOA progress hub for civil issues, funds and project documents tracked against ERL.',
};

export default function ErlIssuesPage() {
  return (
    <main className="h-svh overflow-hidden bg-ink text-foreground">
      <IssueTracker issues={erlIssues} />
    </main>
  );
}
