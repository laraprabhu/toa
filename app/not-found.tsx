import { siteHref } from '@/lib/site-path';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <p className="eyebrow justify-center">Notice unavailable</p>
        <h1 className="mt-4 font-heading text-5xl font-semibold tracking-tight text-ink">This update could not be found.</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">It may have been removed or replaced with a newer announcement.</p>
        <a className="primary-action mt-7" href={siteHref('/')}>Return to all updates</a>
      </div>
    </main>
  );
}
