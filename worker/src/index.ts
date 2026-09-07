import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env {
  GOOGLE_CLIENT_ID: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH?: string;
  GITHUB_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

interface AdminRecord {
  email?: string;
  emailSha256?: string;
  name?: string;
  active: boolean;
}

interface Announcement {
  number: number;
  id: string;
  slug: string;
  title: string;
  summary: string;
  image?: string;
  body: string;
  category: 'urgent' | 'maintenance' | 'event' | 'action' | 'community';
  priority: 'normal' | 'high';
  status: 'draft' | 'published';
  publishedAt: string;
  expiresAt?: string;
  eventDate?: string;
  location?: string;
  actionLabel?: string;
  actionUrl?: string;
  contact?: string;
}

type GitHubFile<T> = { content: T; sha: string };

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const categories = new Set(['urgent', 'maintenance', 'event', 'action', 'community']);
const statuses = new Set(['draft', 'published']);
const priorities = new Set(['normal', 'high']);

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const corsHeaders = cors(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!originAllowed(origin, env)) {
      return json({ error: 'This site origin is not allowed.' }, 403, corsHeaders);
    }

    try {
      const admin = await requireAdmin(request, env);
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/api\/announcements(?:\/([^/]+))?\/?$/);
      if (!match) return json({ error: 'Not found.' }, 404, corsHeaders);

      if (request.method === 'GET' && !match[1]) {
        const { content } = await getRepoJson<Announcement[]>('content/announcements.json', env);
        return json({ announcements: content, admin }, 200, corsHeaders);
      }

      const id = match[1] ? decodeURIComponent(match[1]) : undefined;
      if (request.method === 'POST' && !id) {
        const candidate = validateAnnouncement(await request.json());
        const number = await allocateAnnouncementNumber(env);
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          if (items.some((item) => item.id === candidate.id || item.slug === candidate.slug)) {
            throw new HttpError(409, 'An announcement with this ID or page address already exists.');
          }
          return [{ ...candidate, number }, ...items];
        });
        return json({ announcements: result, admin }, 201, corsHeaders);
      }

      if (request.method === 'PUT' && id) {
        const candidate = validateAnnouncement(await request.json());
        if (candidate.id !== id) throw new HttpError(400, 'The announcement ID cannot be changed.');
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          const index = items.findIndex((item) => item.id === id);
          if (index < 0) throw new HttpError(404, 'Announcement not found.');
          if (items[index].number !== candidate.number) throw new HttpError(400, 'The announcement number cannot be changed.');
          if (items.some((item, itemIndex) => itemIndex !== index && item.slug === candidate.slug)) {
            throw new HttpError(409, 'Another announcement already uses this page address.');
          }
          return items.map((item) => item.id === id ? candidate : item);
        });
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      if (request.method === 'DELETE' && id) {
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          if (!items.some((item) => item.id === id)) throw new HttpError(404, 'Announcement not found.');
          return items.filter((item) => item.id !== id);
        });
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      return json({ error: 'Method not allowed.' }, 405, corsHeaders);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, corsHeaders);
      console.error(error);
      return json({ error: 'The admin service could not complete this request.' }, 500, corsHeaders);
    }
  },
};

export default worker;

async function requireAdmin(request: Request, env: Env) {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) throw new HttpError(401, 'Google sign-in is required.');
  const token = authorization.slice(7);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, googleKeys, {
      audience: env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }));
  } catch {
    throw new HttpError(401, 'Your Google session is invalid or has expired. Please sign in again.');
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (!email || payload.email_verified !== true) throw new HttpError(401, 'A verified Google email is required.');

  const { content } = await getRepoJson<{ admins: AdminRecord[] }>('content/admins.json', env);
  const emailHash = await sha256(email);
  const match = content.admins.find((record) => record.active && (
    record.email?.toLowerCase() === email || record.emailSha256?.toLowerCase() === emailHash
  ));
  if (!match) throw new HttpError(403, 'This Google account is not listed as an administrator.');
  return { email, name: match.name };
}

async function mutateAnnouncements(env: Env, adminEmail: string, mutate: (items: Announcement[]) => Announcement[]) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const file = await getRepoJson<Announcement[]>('content/announcements.json', env);
    const next = mutate(file.content).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    try {
      await putRepoJson('content/announcements.json', next, file.sha, env, `Update announcements via TOA admin (${adminEmail})`);
      return next;
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 409 || attempt === 1) throw error;
    }
  }
  throw new HttpError(409, 'The repository changed while saving. Please try again.');
}

async function allocateAnnouncementNumber(env: Env) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sequence = await getRepoJson<{ nextNumber: number }>('content/announcement-sequence.json', env);
    const number = sequence.content.nextNumber;
    if (!Number.isInteger(number) || number < 1) throw new HttpError(500, 'The announcement sequence is invalid.');
    try {
      await putRepoJson('content/announcement-sequence.json', { nextNumber: number + 1 }, sequence.sha, env, `Reserve announcement #${number}`);
      return number;
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 409 || attempt === 2) throw error;
    }
  }
  throw new HttpError(409, 'Unable to reserve an announcement number. Please try again.');
}

async function getRepoJson<T>(path: string, env: Env): Promise<GitHubFile<T>> {
  const branch = env.GITHUB_BRANCH || 'main';
  const response = await githubFetch(`/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`, env);
  if (!response.ok) throw new HttpError(response.status, `Unable to read ${path} from GitHub.`);
  const payload = await response.json() as { content?: string; sha?: string; encoding?: string };
  if (!payload.content || !payload.sha || payload.encoding !== 'base64') throw new HttpError(500, `GitHub returned an invalid ${path} response.`);
  try {
    const text = decodeBase64(payload.content.replace(/\n/g, ''));
    return { content: JSON.parse(text) as T, sha: payload.sha };
  } catch {
    throw new HttpError(500, `${path} does not contain valid JSON.`);
  }
}

async function putRepoJson(path: string, content: unknown, sha: string, env: Env, message: string) {
  const response = await githubFetch(`/repos/${env.GITHUB_REPO}/contents/${path}`, env, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeBase64(`${JSON.stringify(content, null, 2)}\n`),
      sha,
      branch: env.GITHUB_BRANCH || 'main',
    }),
  });
  if (response.status === 409) throw new HttpError(409, 'Repository update conflict.');
  if (!response.ok) {
    const details = await response.json().catch(() => ({})) as { message?: string };
    throw new HttpError(response.status, details.message || 'GitHub rejected the update.');
  }
}

function githubFetch(path: string, env: Env, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${env.GITHUB_TOKEN}`);
  headers.set('Content-Type', 'application/json');
  headers.set('User-Agent', 'toa-noticeboard-worker');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers,
  });
}

function validateAnnouncement(input: unknown): Announcement {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Announcement data is required.');
  const value = input as Record<string, unknown>;
  if (!Number.isInteger(value.number) || Number(value.number) < 0) throw new HttpError(400, 'Announcement number must be a whole number.');
  const requiredStrings = ['id', 'slug', 'title', 'summary', 'body', 'publishedAt'] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== 'string' || !String(value[field]).trim()) throw new HttpError(400, `${field} is required.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value.slug))) throw new HttpError(400, 'Page address may use lowercase letters, numbers and hyphens only.');
  if (!categories.has(String(value.category))) throw new HttpError(400, 'Invalid announcement category.');
  if (!statuses.has(String(value.status))) throw new HttpError(400, 'Invalid announcement status.');
  if (!priorities.has(String(value.priority))) throw new HttpError(400, 'Invalid announcement priority.');
  if (Number.isNaN(Date.parse(String(value.publishedAt)))) throw new HttpError(400, 'Published date is invalid.');
  if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string') throw new HttpError(400, 'Expiry date must be text.');
  if (typeof value.expiresAt === 'string' && Number.isNaN(Date.parse(value.expiresAt))) throw new HttpError(400, 'Expiry date is invalid.');
  if (String(value.title).length > 120 || String(value.summary).length > 360 || String(value.body).length > 12_000) {
    throw new HttpError(400, 'One or more announcement fields are too long.');
  }
  if (value.image !== undefined && (typeof value.image !== 'string' || !/^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value.image))) {
    throw new HttpError(400, 'Preview image must be a site-relative path.');
  }
  if (value.actionUrl) {
    if (typeof value.actionUrl !== 'string') throw new HttpError(400, 'Action URL must be text.');
    try {
      const url = new URL(value.actionUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new HttpError(400, 'Action URL must be a valid web address.');
    }
  }
  return value as unknown as Announcement;
}

function originAllowed(origin: string, env: Env) {
  if (!origin) return false;
  return env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean).includes(origin);
}

function cors(origin: string, env: Env) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  if (originAllowed(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  }
  return headers;
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
