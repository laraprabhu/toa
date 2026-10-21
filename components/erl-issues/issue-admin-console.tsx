'use client';

import {
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  IndianRupee,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sheet,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import documentChecklistJson from '@/content/erl-issues/document-checklist.json';
import { erlFundData } from '@/lib/erl-funds';
import { siteHref } from '@/lib/site-path';

type GoogleCredentialResponse = { credential: string };
type GoogleAccounts = {
  id: {
    initialize(config: {
      client_id: string;
      callback(response: GoogleCredentialResponse): void;
    }): void;
    renderButton(element: HTMLElement, config: Record<string, unknown>): void;
    disableAutoSelect(): void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

type Admin = { email: string; name?: string };
type IssueSummary = {
  issues: unknown[];
  admin: Admin;
};

const authSessionStorageKey = 'toa-erl-issues-admin-session-v2';
const civilGoogleSheetUrl =
  'https://docs.google.com/spreadsheets/d/13DREMQUny0iHV71Lc8GbUjSmGQR3LixC/edit?usp=sharing';
const civilSyncWorkflowUrl =
  'https://github.com/laraprabhu/toa/actions/workflows/sync-erl-issues.yml';
const fundGoogleSheetUrl =
  'https://docs.google.com/spreadsheets/d/1wG3KF2mRPGIAV_zV-tsE10MKww7y2HUS_3ajbfzGhMk/edit?usp=sharing';
const fundSyncWorkflowUrl =
  'https://github.com/laraprabhu/toa/actions/workflows/sync-erl-funds.yml';
const documentGoogleSheetUrl =
  'https://docs.google.com/spreadsheets/d/1lsv00lKoM9ItsRVwK46yhgiEs4S3Mo7itxG5GB1GBBQ/edit?usp=sharing';
const documentSyncWorkflowUrl =
  'https://github.com/laraprabhu/toa/actions/workflows/sync-erl-documents.yml';
const documentCount = documentChecklistJson.sections.reduce(
  (total, section) => total + section.items.length,
  0,
);

export function IssueAdminConsole({
  apiUrl,
  googleClientId,
}: {
  apiUrl: string;
  googleClientId: string;
}) {
  const configured = Boolean(apiUrl && googleClientId);
  const [token, setToken] = useState('');
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [loadingSession, setLoadingSession] = useState(configured);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const authorize = useCallback(
    async (credential: string) => {
      setError('');
      try {
        const result = await apiRequest<IssueSummary>(
          apiUrl,
          '/api/erl-issues',
          credential,
        );
        setToken(credential);
        setAdmin(result.admin);
        setIssueCount(result.issues.length);
        window.sessionStorage.setItem(authSessionStorageKey, credential);
      } catch (requestError) {
        window.sessionStorage.removeItem(authSessionStorageKey);
        setToken('');
        setAdmin(null);
        setIssueCount(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to authorize this account.',
        );
      } finally {
        setLoadingSession(false);
      }
    },
    [apiUrl],
  );

  useEffect(() => {
    if (!configured) return;
    const timer = window.setTimeout(() => {
      const stored = window.sessionStorage.getItem(authSessionStorageKey);
      if (stored) {
        void authorize(stored);
      } else {
        setLoadingSession(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authorize, configured]);

  useEffect(() => {
    if (!configured || token) return;
    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => void authorize(credential),
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280,
      });
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      let script = document.querySelector<HTMLScriptElement>(
        'script[data-google-identity]',
      );
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton, { once: true });
    }

    return () => {
      cancelled = true;
    };
  }, [authorize, configured, googleClientId, token]);

  function signOut() {
    window.sessionStorage.removeItem(authSessionStorageKey);
    window.google?.accounts.id.disableAutoSelect();
    setToken('');
    setAdmin(null);
    setIssueCount(null);
    setError('');
  }

  return (
    <main className="min-h-svh bg-[#071a20] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <a
          href={siteHref('/erl-issues')}
          className="inline-flex items-center gap-2 text-sm font-black text-teal-200 transition hover:text-white"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to tracker
        </a>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b252d] shadow-[0_0_46px_rgb(45_212_191/16%)]">
          <header className="border-b border-white/10 px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-300/10 text-teal-200 ring-1 ring-inset ring-teal-300/20">
                <ShieldCheck size={24} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">
                  Admin only
                </p>
                <h1 className="mt-1 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Tracker synchronization
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Civil issues, fund balances, and document handovers use
                  separate Google Sheets and automated jobs each morning.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            {!configured ? (
              <Notice tone="error">
                Google authentication or the admin API is not configured.
              </Notice>
            ) : loadingSession ? (
              <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
                <RefreshCw className="animate-spin" size={18} />
                Checking your admin session…
              </div>
            ) : !token || !admin ? (
              <div>
                <h2 className="text-lg font-black">Admin sign-in</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Sign in with a Google account listed in the ERL tracker admin
                  list.
                </p>
                <div ref={googleButtonRef} className="mt-5 min-h-11" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-teal-200">
                      Signed in
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {admin.name || admin.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-slate-200 transition hover:bg-white/10"
                  >
                    <LogOut size={15} aria-hidden="true" />
                    Sign out
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SyncCard
                    icon={<Sheet size={22} aria-hidden="true" />}
                    title="Civil issues"
                    detail={
                      issueCount === null
                        ? 'Checking records'
                        : `${issueCount} issue records loaded`
                    }
                    syncUrl={civilSyncWorkflowUrl}
                    sheetUrl={civilGoogleSheetUrl}
                    syncLabel="Sync civil issues"
                  />
                  <SyncCard
                    icon={<IndianRupee size={22} aria-hidden="true" />}
                    title="Fund balances"
                    detail={`${Object.keys(erlFundData.balances).length} balance categories loaded`}
                    syncUrl={fundSyncWorkflowUrl}
                    sheetUrl={fundGoogleSheetUrl}
                    syncLabel="Sync fund balances"
                  />
                  <div className="sm:col-span-2">
                    <SyncCard
                      icon={<FolderOpen size={22} aria-hidden="true" />}
                      title="Document handover"
                      detail={`${documentCount} document records loaded`}
                      syncUrl={documentSyncWorkflowUrl}
                      sheetUrl={documentGoogleSheetUrl}
                      syncLabel="Sync documents"
                    />
                  </div>
                </div>

                <p className="text-xs leading-5 text-slate-400">
                  GitHub confirms repository access before allowing each manual
                  sync.
                </p>
              </>
            )}

            {error && <Notice tone="error">{error}</Notice>}
          </div>
        </section>
      </div>
    </main>
  );
}

function SyncCard({
  icon,
  title,
  detail,
  syncUrl,
  sheetUrl,
  syncLabel,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  syncUrl: string;
  sheetUrl: string;
  syncLabel: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
      <div className="flex items-center gap-3">
        <span className="text-sun">{icon}</span>
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
        </div>
      </div>

      <a
        href={syncUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sun px-4 text-center text-sm font-black text-ink transition hover:bg-[#ffd872]"
      >
        <RefreshCw size={18} aria-hidden="true" />
        {syncLabel}
        <ExternalLink size={16} aria-hidden="true" />
      </a>

      <a
        href={sheetUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10"
      >
        Open Google Sheet
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </section>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'success' | 'error';
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
        tone === 'success'
          ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
          : 'border-rose-300/20 bg-rose-300/10 text-rose-100'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

async function apiRequest<T>(
  apiUrl: string,
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || 'The admin service rejected the request.');
  }
  return payload as T;
}
