'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clipboard,
  Cloud,
  FilePenLine,
  LogOut,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Announcement, AnnouncementCategory, AnnouncementPriority, AnnouncementStatus } from '@/lib/announcements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { siteHref, sitePath } from '@/lib/site-path';

type GoogleCredentialResponse = { credential: string };
type GoogleAccounts = {
  id: {
    initialize(config: { client_id: string; callback(response: GoogleCredentialResponse): void }): void;
    renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    disableAutoSelect(): void;
  };
};

type WebMcpContext = {
  registerTool(tool: {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
    execute(input: unknown): Promise<unknown>;
  }, options?: { signal?: AbortSignal }): void | Promise<void>;
};

declare global {
  interface Window { google?: { accounts: GoogleAccounts } }
}

type AuthState = 'loading' | 'signed-out' | 'authorized' | 'denied' | 'misconfigured';
type ApiResult = { announcements: Announcement[]; admin?: { email: string; name?: string } };
type FormState = Omit<Announcement, 'publishedAt' | 'expiresAt'> & { publishedAt: string; expiresAt: string };

const emptyForm = (): FormState => ({
  id: '',
  slug: '',
  title: '',
  summary: '',
  body: '',
  category: 'community',
  priority: 'normal',
  status: 'draft',
  publishedAt: toLocalInput(new Date().toISOString()),
  expiresAt: '',
  eventDate: '',
  location: '',
  actionLabel: '',
  actionUrl: '',
  contact: '',
});

function toLocalInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

function announcementToForm(item: Announcement): FormState {
  return {
    ...item,
    expiresAt: toLocalInput(item.expiresAt),
    publishedAt: toLocalInput(item.publishedAt),
    eventDate: item.eventDate ?? '',
    location: item.location ?? '',
    actionLabel: item.actionLabel ?? '',
    actionUrl: item.actionUrl ?? '',
    contact: item.contact ?? '',
  };
}

function formToAnnouncement(form: FormState): Announcement {
  return {
    ...form,
    id: form.id || crypto.randomUUID(),
    slug: form.slug || slugify(form.title),
    publishedAt: new Date(form.publishedAt).toISOString(),
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    eventDate: form.eventDate || undefined,
    location: form.location || undefined,
    actionLabel: form.actionLabel || undefined,
    actionUrl: form.actionUrl || undefined,
    contact: form.contact || undefined,
  };
}

export function AdminConsole({ apiUrl, googleClientId }: { apiUrl: string; googleClientId: string }) {
  const [authState, setAuthState] = useState<AuthState>(() => !apiUrl || !googleClientId ? 'misconfigured' : 'loading');
  const [credential, setCredential] = useState('');
  const [admin, setAdmin] = useState<{ email: string; name?: string } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const selectedId = form.id;

  const apiRequest = useCallback(async (path: string, token: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => ({ error: 'The service returned an unreadable response.' })) as ApiResult & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
    return payload as ApiResult;
  }, [apiUrl]);

  const authorize = useCallback(async (token: string) => {
    try {
      setAuthState('loading');
      const result = await apiRequest('/api/announcements', token);
      setCredential(token);
      setAdmin(result.admin ?? null);
      setAnnouncements(result.announcements);
      setAuthState('authorized');
    } catch (error) {
      setCredential('');
      setAuthState('denied');
      setNotice(error instanceof Error ? error.message : 'Access denied.');
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!apiUrl || !googleClientId) {
      return;
    }

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
      setAuthState('signed-out');
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      const script = existing ?? document.createElement('script');
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton, { once: true });
    }

    return () => { cancelled = true; };
  }, [apiUrl, authorize, googleClientId]);

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (authState !== 'authorized' || !credential || !modelContext?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(modelContext.registerTool({
      name: 'create_announcement',
      title: 'Create announcement',
      description: 'Create a new TOA announcement using the signed-in administrator session.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 3 },
          summary: { type: 'string', minLength: 10 },
          body: { type: 'string', minLength: 10 },
          category: { type: 'string', enum: ['urgent', 'maintenance', 'event', 'action', 'community'] },
          status: { type: 'string', enum: ['draft', 'published'] },
        },
        required: ['title', 'summary', 'body', 'category'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== 'object') throw new Error('Announcement details are required.');
        const candidate = input as Record<string, unknown>;
        const categories = ['urgent', 'maintenance', 'event', 'action', 'community'];
        if (typeof candidate.title !== 'string' || typeof candidate.summary !== 'string' || typeof candidate.body !== 'string' || !categories.includes(String(candidate.category))) {
          throw new Error('Title, summary, body and a valid category are required.');
        }
        const item: Announcement = {
          id: crypto.randomUUID(),
          slug: slugify(candidate.title),
          title: candidate.title.trim(),
          summary: candidate.summary.trim(),
          body: candidate.body.trim(),
          category: candidate.category as AnnouncementCategory,
          priority: 'normal',
          status: candidate.status === 'published' ? 'published' : 'draft',
          publishedAt: new Date().toISOString(),
        };
        const result = await apiRequest('/api/announcements', credential, { method: 'POST', body: JSON.stringify(item) });
        setAnnouncements(result.announcements);
        const saved = result.announcements.find((announcement) => announcement.id === item.id);
        if (saved) setForm(announcementToForm(saved));
        return { id: item.id, slug: item.slug, status: item.status };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, [apiRequest, authState, credential]);

  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [announcements],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAnnouncement() {
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      setNotice('Add a title, short summary and complete message before saving.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const announcement = formToAnnouncement(form);
      const method = selectedId ? 'PUT' : 'POST';
      const path = selectedId ? `/api/announcements/${encodeURIComponent(selectedId)}` : '/api/announcements';
      const result = await apiRequest(path, credential, { method, body: JSON.stringify(announcement) });
      setAnnouncements(result.announcements);
      const saved = result.announcements.find((item) => item.id === announcement.id);
      if (saved) setForm(announcementToForm(saved));
      setNotice(announcement.status === 'published' ? 'Published. GitHub Pages will refresh after its build completes.' : 'Draft saved to the repository.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save this announcement.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnouncement() {
    if (!selectedId) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await apiRequest(`/api/announcements/${encodeURIComponent(selectedId)}`, credential, { method: 'DELETE' });
      setAnnouncements(result.announcements);
      setForm(emptyForm());
      setNotice('Announcement deleted from the repository.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to delete this announcement.');
    } finally {
      setBusy(false);
    }
  }

  async function copyForWhatsApp() {
    const announcement = formToAnnouncement(form);
    const noticeUrl = new URL(`${sitePath}/notice?slug=${encodeURIComponent(announcement.slug)}`, window.location.origin).href;
    const text = `*${announcement.title}*\n\n${announcement.summary}\n\nRead the complete update: ${noticeUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function signOut() {
    window.google?.accounts.id.disableAutoSelect();
    setCredential('');
    setAdmin(null);
    setAnnouncements([]);
    setForm(emptyForm());
    setAuthState('signed-out');
    setNotice('');
  }

  if (authState !== 'authorized') {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <a className="back-link" href={siteHref('/')}><ArrowLeft size={16} aria-hidden="true" /> Resident noticeboard</a>
          <span className="admin-gate-icon"><ShieldCheck size={28} aria-hidden="true" /></span>
          <p className="eyebrow mt-6">Administrator access</p>
          <h1>Manage community updates</h1>
          <p>Sign in using an approved Google account. Authorization is checked against the repository’s admin list.</p>
          {authState === 'misconfigured' ? (
            <div className="config-warning"><ShieldAlert size={18} aria-hidden="true" /> Google sign-in and the admin API must be configured before this console can be used.</div>
          ) : (
            <div className="mt-7 flex min-h-12 justify-center" ref={googleButtonRef} />
          )}
          {authState === 'loading' && <p className="mt-4 text-sm text-muted-foreground">Verifying access…</p>}
          {authState === 'denied' && <div className="config-warning mt-5"><ShieldAlert size={18} aria-hidden="true" />{notice || 'This Google account is not an administrator.'}</div>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="page-shell flex min-h-20 items-center justify-between gap-4 py-3">
          <div>
            <p className="eyebrow">TOA Noticeboard</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">Announcement manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href={siteHref('/')} className="admin-toolbar-link"><ArrowLeft aria-hidden="true" /> View site</a>
            <Button variant="outline" size="lg" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</Button>
          </div>
        </div>
      </header>

      <div className="page-shell py-6 sm:py-9">
        <div className="admin-status">
          <span><Cloud size={17} aria-hidden="true" /> Repository connected</span>
          <span className="hidden text-muted-foreground sm:inline">Signed in as {admin?.name || admin?.email}</span>
        </div>

        <div className="admin-layout">
          <aside className="announcement-list">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div><h2>Announcements</h2><p>{announcements.length} total</p></div>
              <Button size="lg" onClick={() => { setForm(emptyForm()); setNotice(''); }}><Plus aria-hidden="true" /> New</Button>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto p-2">
              {sortedAnnouncements.map((announcement) => (
                <button
                  key={announcement.id}
                  type="button"
                  aria-label={`Edit ${announcement.title}`}
                  className={selectedId === announcement.id ? 'announcement-list-item active' : 'announcement-list-item'}
                  onClick={() => { setForm(announcementToForm(announcement)); setNotice(''); }}
                >
                  <span className={`status-dot ${announcement.status}`} />
                  <span><strong>{announcement.title}</strong><small>{announcement.status} · {announcement.category}</small></span>
                </button>
              ))}
            </div>
          </aside>

          <section className="editor-panel">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">{selectedId ? 'Editing announcement' : 'New announcement'}</p>
                <h2>{selectedId ? form.title || 'Untitled' : 'Create a clear resident update'}</h2>
              </div>
              <FilePenLine className="text-teal" aria-hidden="true" />
            </div>

            {notice && <output className="editor-notice">{notice}</output>}

            <div className="form-grid">
              <FormField label="Title" wide>
                <Input className="admin-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} onBlur={() => !form.slug && updateField('slug', slugify(form.title))} placeholder="Water supply interruption" />
              </FormField>
              <FormField label="Short summary" hint="Visible in WhatsApp and on the home page" wide>
                <Textarea className="admin-textarea min-h-24" value={form.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Explain the impact and required action in one or two sentences." />
              </FormField>
              <FormField label="Complete message" wide>
                <Textarea className="admin-textarea min-h-44" value={form.body} onChange={(event) => updateField('body', event.target.value)} placeholder="Add all details residents may need." />
              </FormField>
              <FormField label="Category">
                <NativeSelect className="w-full" value={form.category} onChange={(event) => updateField('category', event.target.value as AnnouncementCategory)}>
                  <NativeSelectOption value="urgent">Urgent</NativeSelectOption>
                  <NativeSelectOption value="maintenance">Maintenance</NativeSelectOption>
                  <NativeSelectOption value="event">Event</NativeSelectOption>
                  <NativeSelectOption value="action">Action required</NativeSelectOption>
                  <NativeSelectOption value="community">Community</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Status">
                <NativeSelect className="w-full" value={form.status} onChange={(event) => updateField('status', event.target.value as AnnouncementStatus)}>
                  <NativeSelectOption value="draft">Draft</NativeSelectOption>
                  <NativeSelectOption value="published">Published</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Priority">
                <NativeSelect className="w-full" value={form.priority} onChange={(event) => updateField('priority', event.target.value as AnnouncementPriority)}>
                  <NativeSelectOption value="normal">Normal</NativeSelectOption>
                  <NativeSelectOption value="high">Featured</NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label="Published at">
                <Input className="admin-input" type="datetime-local" value={form.publishedAt} onChange={(event) => updateField('publishedAt', event.target.value)} />
              </FormField>
              <FormField label="Current until" hint="Optional">
                <Input className="admin-input" type="datetime-local" value={form.expiresAt} onChange={(event) => updateField('expiresAt', event.target.value)} />
              </FormField>
              <FormField label="Timing" hint="Optional">
                <Input className="admin-input" value={form.eventDate} onChange={(event) => updateField('eventDate', event.target.value)} placeholder="12 Sep · 10:00 AM–1:00 PM" />
              </FormField>
              <FormField label="Location" hint="Optional">
                <Input className="admin-input" value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="MPH Hall" />
              </FormField>
              <FormField label="Contact" hint="Optional">
                <Input className="admin-input" value={form.contact} onChange={(event) => updateField('contact', event.target.value)} placeholder="Maintenance Desk · phone" />
              </FormField>
              <FormField label="Page address" hint="Generated from title">
                <Input className="admin-input" value={form.slug} onChange={(event) => updateField('slug', slugify(event.target.value))} placeholder="water-supply-interruption" />
              </FormField>
              <FormField label="Action label" hint="Optional">
                <Input className="admin-input" value={form.actionLabel} onChange={(event) => updateField('actionLabel', event.target.value)} placeholder="Register now" />
              </FormField>
              <FormField label="Action URL" hint="Optional">
                <Input className="admin-input" type="url" value={form.actionUrl} onChange={(event) => updateField('actionUrl', event.target.value)} placeholder="https://…" />
              </FormField>
            </div>

            <div className="editor-actions">
              <Button className="h-11 px-5" onClick={saveAnnouncement} disabled={busy}><Save aria-hidden="true" /> {busy ? 'Saving…' : 'Save announcement'}</Button>
              <Button className="h-11" variant="outline" onClick={copyForWhatsApp} disabled={!form.title || !form.summary}>
                {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}{copied ? 'Copied' : 'Copy for WhatsApp'}
              </Button>
              {selectedId && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button className="h-11 sm:ml-auto" variant="destructive" />}>
                    <Trash2 aria-hidden="true" /> Delete
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><Trash2 aria-hidden="true" /></AlertDialogMedia>
                      <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                      <AlertDialogDescription>This removes it from the repository and the public site after the next build.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={deleteAnnouncement}>Delete announcement</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FormField({ label, hint, wide = false, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? 'form-field md:col-span-2' : 'form-field'}>
      <span>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}
