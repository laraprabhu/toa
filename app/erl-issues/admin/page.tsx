import type { Metadata } from 'next';
import { IssueAdminConsole } from '@/components/erl-issues/issue-admin-console';

export const metadata: Metadata = {
  title: 'ERL Tracker Sync',
  robots: { index: false, follow: false },
};

export default function ErlIssueAdminPage() {
  return (
    <IssueAdminConsole
      apiUrl={process.env.NEXT_PUBLIC_ADMIN_API_URL ?? ''}
      googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}
    />
  );
}
