'use client';

import {
  ArrowLeft,
  CirclePlus,
  LoaderCircle,
  LogOut,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  issueStatusLabels,
  type ErlIssue,
  type IssueParty,
  type IssueStatus,
} from '@/lib/erl-issues';
import { siteHref } from '@/lib/site-path';

type GoogleCredentialResponse = { credential: string };
type GoogleAccounts = {
  id: {
    initialize(config: {
      client_id: string;
      callback(response: GoogleCredentialResponse): void;
    }): void;
    renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    disableAutoSelect(): void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

type AuthState =
  | 'loading'
  | 'signed-out'
  | 'authorized'
  | 'denied'
  | 'misconfigured';

type ApiResult = {
  issues: ErlIssue[];
  admin?: { email: string; name?: string };
};

type FormState = Omit<ErlIssue, 'startDate' | 'etaDate'> & {
  startDate: string;
  etaDate: string;
};

const AUTH_SESSION_STORAGE_KEY = 'toa-erl-issues-admin-session-v1';
const defaultCategories = [
  'Administrative / Documentation',
  'Amenities Delivery',
  'Civil & Plumbing (High Priority)',
  'Civil & Structural',
  'Documentation / Compliance',
  'External Fixtures',
  'Financial / Legal',
  'Legal / Documentation',
  'Operational / Communication',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    number: 0,
    id: '',
    title: '',
    tower: 'ABCE',
    category: 'Civil & Structural',
    raisedBy: 'TOA',
    owner: 'ERL',
    status: 'not-done',
    startDate: '',
    etaDate: '',
    erlComment: '',
    momComment: '',
    updatedOn: today(),
  };
}

function issueToForm(issue: ErlIssue): FormState {
  return {
    ...issue,
    startDate: issue.startDate ?? '',
    etaDate: issue.etaDate ?? '',
  };
}

function formToIssue(form: FormState): ErlIssue {
  return {
    ...form,
    id: form.id || crypto.randomUUID(),
    startDate: form.startDate || null,
    etaDate: form.etaDate || null,
    updatedOn: today(),
  };
}

function loadStoredCredential() {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeCredential(token: string) {
  try {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, token);
  } catch {
    // The active Google session continues until the page is refreshed.
  }
}

function clearStoredCredential() {
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // There is no persisted credential to remove.
  }
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-800">
      {label}
      {children}
      {hint && (
        <span className="text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="min-h-11 w-full rounded-xl border border-input bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal focus:ring-3 focus:ring-teal/20"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

export function IssueAdminConsole({
  apiUrl,
  googleClientId,
}: {
  apiUrl: string;
  googleClientId: string;
}) {
  const [authState, setAuthState] = useState<AuthState>(() =>
    !apiUrl || !googleClientId ? 'misconfigured' : 'loading',
  );
  const [credential, setCredential] = useState('');
  const [admin, setAdmin] = useState<{ email: string; name?: string } | null>(
    null,
  );
  const [issues, setIssues] = useState<ErlIssue[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const selectedId = form.id;

  const apiRequest = useCallback(
    async (path: string, token: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        headers,
      });
      const payload = (await response.json().catch(() => ({
        error: 'The service returned an unreadable response.',
      }))) as ApiResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'The request could not be completed.');
      }
      return payload as ApiResult;
    },
    [apiUrl],
  );

  const authorize = useCallback(
    async (token: string) => {
      try {
        setAuthState('loading');
        const result = await apiRequest('/api/erl-issues', token);
        setCredential(token);
        storeCredential(token);
        setAdmin(result.admin ?? null);
        setIssues(result.issues);
        setAuthState('authorized');
        setNotice('');
      } catch (error) {
        setCredential('');
        clearStoredCredential();
        setAuthState('denied');
        setNotice(error instanceof Error ? error.message : 'Access denied.');
      }
    },
    [apiRequest],
  );

  useEffect(() => {
    if (!apiUrl || !googleClientId) return;
    const storedCredential = loadStoredCredential();
    if (!storedCredential) return;
    const timer = window.setTimeout(() => void authorize(storedCredential), 0);
    return () => window.clearTimeout(timer);
  }, [apiUrl, authorize, googleClientId]);

  useEffect(() => {
    if (!apiUrl || !googleClientId) return;
    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential: token }) => void authorize(token),
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280,
      });
      if (!loadStoredCredential()) setAuthState('signed-out');
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-google-identity]',
      );
      const script = existing ?? document.createElement('script');
      if (!existing) {
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
  }, [apiUrl, authorize, googleClientId]);

  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => a.number - b.number),
    [issues],
  );
  const visibleIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sortedIssues;
    return sortedIssues.filter((issue) =>
      [
        String(issue.number),
        issue.title,
        issue.category,
        issue.tower,
        issue.status,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [query, sortedIssues]);
  const categories = useMemo(
    () =>
      [
        ...new Set([
          ...defaultCategories,
          ...issues.map((issue) => issue.category),
        ]),
      ].sort(),
    [issues],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectIssue(issue: ErlIssue) {
    if (
      dirty &&
      !window.confirm('Discard unsaved changes and open another issue?')
    )
      return;
    setForm(issueToForm(issue));
    setDirty(false);
    setNotice('');
  }

  function createIssue() {
    if (
      dirty &&
      !window.confirm('Discard unsaved changes and create a new issue?')
    )
      return;
    setForm(emptyForm());
    setDirty(false);
    setNotice('');
  }

  async function saveIssue() {
    if (!form.title.trim() || !form.category.trim() || !form.tower.trim()) {
      setNotice('Issue, category and tower/block are required.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const issue = formToIssue(form);
      const path = selectedId
        ? `/api/erl-issues/${encodeURIComponent(selectedId)}`
        : '/api/erl-issues';
      const result = await apiRequest(path, credential, {
        method: selectedId ? 'PUT' : 'POST',
        body: JSON.stringify(issue),
      });
      const saved = result.issues.find((item) => item.id === issue.id);
      if (!saved)
        throw new Error('The issue was saved but could not be reloaded.');
      setIssues(result.issues);
      setForm(issueToForm(saved));
      setDirty(false);
      setNotice(`Issue #${saved.number} saved to GitHub.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to save this issue.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteIssue() {
    if (!selectedId) return;
    if (
      !window.confirm(
        `Delete issue #${form.number}? This creates a GitHub commit.`,
      )
    )
      return;
    setBusy(true);
    setNotice('');
    try {
      const result = await apiRequest(
        `/api/erl-issues/${encodeURIComponent(selectedId)}`,
        credential,
        { method: 'DELETE' },
      );
      setIssues(result.issues);
      setForm(emptyForm());
      setDirty(false);
      setNotice('Issue deleted from GitHub.');
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Unable to delete this issue.',
      );
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    window.google?.accounts.id.disableAutoSelect();
    clearStoredCredential();
    setCredential('');
    setAdmin(null);
    setIssues([]);
    setForm(emptyForm());
    setDirty(false);
    setAuthState('signed-out');
    window.setTimeout(() => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280,
      });
    }, 0);
  }

  if (authState !== 'authorized') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f6f5] p-5">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_24px_70px_rgb(16_45_54/12%)] sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink text-white">
            {authState === 'denied' || authState === 'misconfigured' ? (
              <ShieldAlert size={26} />
            ) : (
              <ShieldCheck size={26} />
            )}
          </span>
          <h1 className="mt-5 font-heading text-3xl font-semibold text-ink">
            ERL tracker administration
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in with a Google account listed in the separate ERL tracker
            administrator file.
          </p>
          {authState === 'loading' && (
            <LoaderCircle className="mx-auto mt-6 animate-spin text-teal" />
          )}
          {authState === 'misconfigured' && (
            <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              Google authentication or the admin API is not configured.
            </p>
          )}
          {notice && (
            <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              {notice}
            </p>
          )}
          <div
            ref={googleButtonRef}
            className="mt-6 flex min-h-11 justify-center"
          />
          <a
            href={siteHref('/erl-issues')}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal"
          >
            <ArrowLeft size={16} /> Back to public tracker
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f6f5]">
      <header className="border-b border-white/10 bg-ink text-white">
        <div className="page-shell flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <a
              href={siteHref('/erl-issues')}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"
            >
              <ArrowLeft size={16} /> Public tracker
            </a>
            <h1 className="mt-1 font-heading text-xl font-semibold">
              ERL issue administration
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-300 sm:inline">
              {admin?.name || admin?.email}
            </span>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={signOut}
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="page-shell grid gap-5 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_38px_rgb(16_45_54/6%)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-teal">
                Issues
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {issues.length} records
              </p>
            </div>
            <Button type="button" onClick={createIssue}>
              <CirclePlus /> New
            </Button>
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-500 focus-within:border-teal">
            <Search size={16} />
            <input
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issues"
            />
          </label>
          <div className="mt-3 max-h-[calc(100vh-15rem)] space-y-2 overflow-y-auto pr-1">
            {visibleIssues.map((issue) => (
              <button
                type="button"
                key={issue.id}
                onClick={() => selectIssue(issue)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedId === issue.id
                    ? 'border-teal bg-teal/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-xs text-slate-500">
                    #{issue.number}
                  </strong>
                  <span className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {issueStatusLabels[issue.status]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                  {issue.title}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_38px_rgb(16_45_54/6%)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-teal">
                {selectedId ? `Issue #${form.number}` : 'New issue'}
              </p>
              <h2 className="mt-1 font-heading text-3xl font-semibold text-ink">
                {selectedId ? 'Edit issue' : 'Add issue'}
              </h2>
            </div>
            <div className="flex gap-2">
              {selectedId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void deleteIssue()}
                  disabled={busy}
                >
                  <Trash2 /> Delete
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void saveIssue()}
                disabled={busy}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          </div>

          {notice && (
            <p
              className={`mt-5 rounded-xl p-3 text-sm font-semibold ${notice.includes('saved') || notice.includes('deleted') ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
            >
              {notice}
            </p>
          )}

          <div className="mt-6 grid gap-5">
            <Field label="Issue">
              <Textarea
                className="min-h-28 text-base"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Status"
                hint="Use Done only when the record supports completed delivery with no remaining gap."
              >
                <Select
                  value={form.status}
                  onChange={(value) =>
                    updateField('status', value as IssueStatus)
                  }
                >
                  <option value="not-done">Not Done</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </Select>
              </Field>
              <Field label="Tower / block">
                <Input
                  className="h-11 rounded-xl"
                  value={form.tower}
                  onChange={(event) => updateField('tower', event.target.value)}
                />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(value) => updateField('category', value)}
                >
                  {categories.map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Raised by">
                <Select
                  value={form.raisedBy}
                  onChange={(value) =>
                    updateField('raisedBy', value as IssueParty)
                  }
                >
                  <option value="TOA">TOA</option>
                  <option value="ERL">ERL</option>
                </Select>
              </Field>
              <Field label="Owner">
                <Select
                  value={form.owner}
                  onChange={(value) =>
                    updateField('owner', value as IssueParty)
                  }
                >
                  <option value="ERL">ERL</option>
                  <option value="TOA">TOA</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <Input
                    className="h-11 rounded-xl"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateField('startDate', event.target.value)
                    }
                  />
                </Field>
                <Field label="ETA date">
                  <Input
                    className="h-11 rounded-xl"
                    type="date"
                    value={form.etaDate}
                    onChange={(event) =>
                      updateField('etaDate', event.target.value)
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Field label="ERL response">
                <Textarea
                  className="min-h-36"
                  value={form.erlComment}
                  onChange={(event) =>
                    updateField('erlComment', event.target.value)
                  }
                />
              </Field>
              <Field label="TOA–ERL meeting record">
                <Textarea
                  className="min-h-36"
                  value={form.momComment}
                  onChange={(event) =>
                    updateField('momComment', event.target.value)
                  }
                />
              </Field>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
