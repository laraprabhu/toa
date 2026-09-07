import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
import { announcements } from '@/lib/announcements';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <AdminConsole
      apiUrl={process.env.NEXT_PUBLIC_ADMIN_API_URL ?? ''}
      googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}
      initialAnnouncements={announcements}
    />
  );
}
