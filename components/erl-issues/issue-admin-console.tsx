'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sheet,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
type SyncSummary = {
  issues: unknown[];
  admin: Admin;
  changed: boolean;
  changedCount: number;
  importedCount: number;
  removedCount: number;
  syncedOn: string;
};

const authSessionStorageKey = 'toa-erl-issues-admin-session-v2';
const googleSheetUrl =
  'https://docs.google.com/spreadsheets/d/13DREMQUny0iHV71Lc8GbUjSmGQR3LixC/edit?usp=sharing';

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
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
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

  async function syncNow() {
    if (!token || syncing) return;
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const result = await apiRequest<SyncSummary>(
        apiUrl,
        '/api/erl-issues/sync',
        token,
        { method: 'POST' },
      );
      setAdmin(result.admin);
      setIssueCount(result.importedCount);
      setMessage(
        result.changed
          ? `Synced ${result.importedCount} issues. ${result.changedCount} changed and ${result.removedCount} removed.`
          : `The tracker is already up to date. ${result.importedCount} issues checked.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to synchronize the tracker.',
      );
    } finally {
      setSyncing(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(authSessionStorageKey);
    window.google?.accounts.id.disableAutoSelect();
    setToken('');
    setAdmin(null);
    setIssueCount(null);
    setMessage('');
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
                  Issue synchronization
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Google Sheets is the source of truth. The tracker syncs every
                  morning at 2:00 AM IST.
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

                <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
                  <div className="flex items-center gap-3">
                    <Sheet className="text-sun" size={22} aria-hidden="true" />
                    <div>
                      <h2 className="font-black">Google Sheets tracker</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {issueCount === null
                          ? 'Checking records'
                          : `${issueCount} issue records loaded`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void syncNow()}
                    disabled={syncing}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sun px-5 text-sm font-black text-ink transition hover:bg-[#ffd872] disabled:cursor-wait disabled:opacity-70"
                  >
                    <RefreshCw
                      className={syncing ? 'animate-spin' : undefined}
                      size={18}
                      aria-hidden="true"
                    />
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </button>

                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    Open Google Sheet
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              </>
            )}

            {message && (
              <Notice tone="success">
                <CheckCircle2 className="shrink-0" size={18} />
                {message}
              </Notice>
            )}
            {error && <Notice tone="error">{error}</Notice>}
          </div>
        </section>
      </div>
    </main>
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
