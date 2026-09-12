import { DurableObject } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env {
  GOOGLE_CLIENT_ID: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH?: string;
  GITHUB_TOKEN: string;
  ALLOWED_ORIGINS: string;
  ANNOUNCEMENT_VIEWS: DurableObjectNamespace<AnnouncementViewCounter>;
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
  previewVersion?: string;
  previewHeight?: number;
  images?: AnnouncementImage[];
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

interface AnnouncementImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

type GitHubFile<T> = { content: T; sha: string };

const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);
const categories = new Set([
  'urgent',
  'maintenance',
  'event',
  'action',
  'community',
]);
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
      return json(
        { error: 'This site origin is not allowed.' },
        403,
        corsHeaders,
      );
    }

    try {
      const url = new URL(request.url);
      const viewMatch = url.pathname.match(/^\/api\/views\/(\d+)\/?$/);

      if (viewMatch) {
        if (!['GET', 'POST'].includes(request.method))
          return json({ error: 'Method not allowed.' }, 405, corsHeaders);

        const announcementNumber = Number(viewMatch[1]);
        if (
          !Number.isSafeInteger(announcementNumber) ||
          announcementNumber < 1
        ) {
          return json(
            { error: 'Invalid announcement number.' },
            400,
            corsHeaders,
          );
        }

        const counter = env.ANNOUNCEMENT_VIEWS.getByName(
          String(announcementNumber),
        );
        const counterResponse = await counter.fetch(
          'https://announcement-views/count',
          { method: request.method },
        );
        const result = (await counterResponse.json()) as { views: number };
        return json(result, 200, corsHeaders);
      }

      const admin = await requireAdmin(request, env);
      const mediaMatch = url.pathname.match(
        /^\/api\/announcements\/([^/]+)\/media\/?$/,
      );

      if (request.method === 'PUT' && mediaMatch) {
        const id = decodeURIComponent(mediaMatch[1]);
        const payload = validateMediaPayload(await request.json());
        const { content } = await getRepoJson<Announcement[]>(
          'content/announcements.json',
          env,
        );
        const announcement = content.find((item) => item.id === id);
        if (!announcement) throw new HttpError(404, 'Announcement not found.');

        const existingImages = announcement.images ?? [];
        const allowedPrefix = `/media/announcement-${announcement.number}/`;
        for (const source of payload.removeSources) {
          if (!source.startsWith(allowedPrefix)) {
            throw new HttpError(
              400,
              'An image path does not belong to this announcement.',
            );
          }
        }

        const retainedImages = existingImages.filter(
          (image) => !payload.removeSources.includes(image.src),
        );
        if (retainedImages.length + payload.images.length > 8) {
          throw new HttpError(400, 'A notice can contain up to 8 images.');
        }

        const uploadedImages: AnnouncementImage[] = [];
        for (const image of payload.images) {
          const src = `${allowedPrefix}${image.id}.webp`;
          await putRepoBase64(
            `public${src}`,
            image.imageBase64,
            env,
            `Add image to announcement #${announcement.number}`,
          );
          uploadedImages.push({
            src,
            alt: image.alt,
            width: image.width,
            height: image.height,
          });
        }

        for (const source of payload.removeSources) {
          await deleteRepoFile(
            `public${source}`,
            env,
            `Remove image from announcement #${announcement.number}`,
          );
        }

        const images = [...retainedImages, ...uploadedImages];
        const result = await mutateAnnouncements(env, admin.email, (items) =>
          items.map((item) =>
            item.id === id
              ? { ...item, images: images.length > 0 ? images : undefined }
              : item,
          ),
        );
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      const previewMatch = url.pathname.match(
        /^\/api\/announcements\/([^/]+)\/preview\/?$/,
      );

      if (request.method === 'PUT' && previewMatch) {
        const id = decodeURIComponent(previewMatch[1]);
        const payload = (await request.json()) as { imageBase64?: unknown };
        const imageBase64 = validatePngBase64(payload.imageBase64);
        const { content } = await getRepoJson<Announcement[]>(
          'content/announcements.json',
          env,
        );
        const announcement = content.find((item) => item.id === id);
        if (!announcement) throw new HttpError(404, 'Announcement not found.');

        const image = `/previews/announcement-${announcement.number}.png`;
        await putRepoBase64(
          `public${image}`,
          imageBase64,
          env,
          `Update preview for announcement #${announcement.number}`,
        );
        const previewVersion = `${announcement.number}-${Date.now().toString(36)}`;
        const result = await mutateAnnouncements(env, admin.email, (items) =>
          items.map((item) =>
            item.id === id
              ? { ...item, image, previewVersion, previewHeight: 800 }
              : item,
          ),
        );
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      const match = url.pathname.match(
        /^\/api\/announcements(?:\/([^/]+))?\/?$/,
      );
      if (!match) return json({ error: 'Not found.' }, 404, corsHeaders);

      if (request.method === 'GET' && !match[1]) {
        const { content } = await getRepoJson<Announcement[]>(
          'content/announcements.json',
          env,
        );
        return json({ announcements: content, admin }, 200, corsHeaders);
      }

      const id = match[1] ? decodeURIComponent(match[1]) : undefined;
      if (request.method === 'POST' && !id) {
        const candidate = validateAnnouncement(await request.json());
        const number = await allocateAnnouncementNumber(env);
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          if (
            items.some(
              (item) =>
                item.id === candidate.id || item.slug === candidate.slug,
            )
          ) {
            throw new HttpError(
              409,
              'An announcement with this ID or page address already exists.',
            );
          }
          return [{ ...candidate, number }, ...items];
        });
        return json({ announcements: result, admin }, 201, corsHeaders);
      }

      if (request.method === 'PUT' && id) {
        const candidate = validateAnnouncement(await request.json());
        if (candidate.id !== id)
          throw new HttpError(400, 'The announcement ID cannot be changed.');
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          const index = items.findIndex((item) => item.id === id);
          if (index < 0) throw new HttpError(404, 'Announcement not found.');
          if (items[index].number !== candidate.number)
            throw new HttpError(
              400,
              'The announcement number cannot be changed.',
            );
          if (
            items.some(
              (item, itemIndex) =>
                itemIndex !== index && item.slug === candidate.slug,
            )
          ) {
            throw new HttpError(
              409,
              'Another announcement already uses this page address.',
            );
          }
          return items.map((item) => (item.id === id ? candidate : item));
        });
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      if (request.method === 'DELETE' && id) {
        const result = await mutateAnnouncements(env, admin.email, (items) => {
          if (!items.some((item) => item.id === id))
            throw new HttpError(404, 'Announcement not found.');
          return items.filter((item) => item.id !== id);
        });
        return json({ announcements: result, admin }, 200, corsHeaders);
      }

      return json({ error: 'Method not allowed.' }, 405, corsHeaders);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status, corsHeaders);
      console.error(error);
      return json(
        { error: 'The admin service could not complete this request.' },
        500,
        corsHeaders,
      );
    }
  },
};

export default worker;

export class AnnouncementViewCounter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (
      !['GET', 'POST'].includes(request.method) ||
      url.pathname !== '/count'
    ) {
      return Response.json({ error: 'Not found.' }, { status: 404 });
    }

    const views =
      request.method === 'POST'
        ? await this.ctx.storage.transaction(async (transaction) => {
            const next = ((await transaction.get<number>('views')) ?? 0) + 1;
            await transaction.put('views', next);
            return next;
          })
        : ((await this.ctx.storage.get<number>('views')) ?? 0);

    return Response.json({ views });
  }
}

async function requireAdmin(request: Request, env: Env) {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer '))
    throw new HttpError(401, 'Google sign-in is required.');
  const token = authorization.slice(7);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, googleKeys, {
      audience: env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }));
  } catch {
    throw new HttpError(
      401,
      'Your Google session is invalid or has expired. Please sign in again.',
    );
  }

  const email =
    typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (!email || payload.email_verified !== true)
    throw new HttpError(401, 'A verified Google email is required.');

  const { content } = await getRepoJson<{ admins: AdminRecord[] }>(
    'content/admins.json',
    env,
  );
  const emailHash = await sha256(email);
  const match = content.admins.find(
    (record) =>
      record.active &&
      (record.email?.toLowerCase() === email ||
        record.emailSha256?.toLowerCase() === emailHash),
  );
  if (!match)
    throw new HttpError(
      403,
      'This Google account is not listed as an administrator.',
    );
  return { email, name: match.name };
}

async function mutateAnnouncements(
  env: Env,
  adminEmail: string,
  mutate: (items: Announcement[]) => Announcement[],
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const file = await getRepoJson<Announcement[]>(
      'content/announcements.json',
      env,
    );
    const next = mutate(file.content).sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
    try {
      await putRepoJson(
        'content/announcements.json',
        next,
        file.sha,
        env,
        `Update announcements via TOA admin (${adminEmail})`,
      );
      return next;
    } catch (error) {
      if (
        !(error instanceof HttpError) ||
        error.status !== 409 ||
        attempt === 1
      )
        throw error;
    }
  }
  throw new HttpError(
    409,
    'The repository changed while saving. Please try again.',
  );
}

async function allocateAnnouncementNumber(env: Env) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sequence = await getRepoJson<{ nextNumber: number }>(
      'content/announcement-sequence.json',
      env,
    );
    const number = sequence.content.nextNumber;
    if (!Number.isInteger(number) || number < 1)
      throw new HttpError(500, 'The announcement sequence is invalid.');
    try {
      await putRepoJson(
        'content/announcement-sequence.json',
        { nextNumber: number + 1 },
        sequence.sha,
        env,
        `Reserve announcement #${number}`,
      );
      return number;
    } catch (error) {
      if (
        !(error instanceof HttpError) ||
        error.status !== 409 ||
        attempt === 2
      )
        throw error;
    }
  }
  throw new HttpError(
    409,
    'Unable to reserve an announcement number. Please try again.',
  );
}

async function getRepoJson<T>(path: string, env: Env): Promise<GitHubFile<T>> {
  const branch = env.GITHUB_BRANCH || 'main';
  const response = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    env,
  );
  if (!response.ok)
    throw new HttpError(response.status, `Unable to read ${path} from GitHub.`);
  const payload = (await response.json()) as {
    content?: string;
    sha?: string;
    encoding?: string;
  };
  if (!payload.content || !payload.sha || payload.encoding !== 'base64')
    throw new HttpError(500, `GitHub returned an invalid ${path} response.`);
  try {
    const text = decodeBase64(payload.content.replace(/\n/g, ''));
    return { content: JSON.parse(text) as T, sha: payload.sha };
  } catch {
    throw new HttpError(500, `${path} does not contain valid JSON.`);
  }
}

async function putRepoJson(
  path: string,
  content: unknown,
  sha: string,
  env: Env,
  message: string,
) {
  const response = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}`,
    env,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodeBase64(`${JSON.stringify(content, null, 2)}\n`),
        sha,
        branch: env.GITHUB_BRANCH || 'main',
      }),
    },
  );
  if (response.status === 409)
    throw new HttpError(409, 'Repository update conflict.');
  if (!response.ok) {
    const details = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new HttpError(
      response.status,
      details.message || 'GitHub rejected the update.',
    );
  }
}

async function putRepoBase64(
  path: string,
  content: string,
  env: Env,
  message: string,
) {
  const branch = env.GITHUB_BRANCH || 'main';
  const existing = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    env,
  );
  let sha: string | undefined;
  if (existing.ok) {
    const payload = (await existing.json()) as { sha?: string };
    if (!payload.sha)
      throw new HttpError(500, `GitHub returned an invalid ${path} response.`);
    sha = payload.sha;
  } else if (existing.status !== 404) {
    throw new HttpError(
      existing.status,
      `Unable to inspect ${path} on GitHub.`,
    );
  }

  const response = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}`,
    env,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content,
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (response.status === 409)
    throw new HttpError(409, 'Repository update conflict. Please save again.');
  if (!response.ok) {
    const details = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new HttpError(
      response.status,
      details.message || 'GitHub rejected the image.',
    );
  }
}

async function deleteRepoFile(path: string, env: Env, message: string) {
  const branch = env.GITHUB_BRANCH || 'main';
  const existing = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    env,
  );
  if (existing.status === 404) return;
  if (!existing.ok) {
    throw new HttpError(
      existing.status,
      `Unable to inspect ${path} on GitHub.`,
    );
  }
  const payload = (await existing.json()) as { sha?: string };
  if (!payload.sha)
    throw new HttpError(500, `GitHub returned an invalid ${path} response.`);

  const response = await githubFetch(
    `/repos/${env.GITHUB_REPO}/contents/${path}`,
    env,
    {
      method: 'DELETE',
      body: JSON.stringify({ message, sha: payload.sha, branch }),
    },
  );
  if (response.status === 409)
    throw new HttpError(409, 'Repository update conflict. Please save again.');
  if (!response.ok) {
    const details = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new HttpError(
      response.status,
      details.message || 'GitHub rejected the image removal.',
    );
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
  if (!input || typeof input !== 'object')
    throw new HttpError(400, 'Announcement data is required.');
  const value = input as Record<string, unknown>;
  if (!Number.isInteger(value.number) || Number(value.number) < 0)
    throw new HttpError(400, 'Announcement number must be a whole number.');
  const requiredStrings = [
    'id',
    'slug',
    'title',
    'summary',
    'body',
    'publishedAt',
  ] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== 'string' || !String(value[field]).trim())
      throw new HttpError(400, `${field} is required.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value.slug)))
    throw new HttpError(
      400,
      'Page address may use lowercase letters, numbers and hyphens only.',
    );
  if (!categories.has(String(value.category)))
    throw new HttpError(400, 'Invalid announcement category.');
  if (!statuses.has(String(value.status)))
    throw new HttpError(400, 'Invalid announcement status.');
  if (!priorities.has(String(value.priority)))
    throw new HttpError(400, 'Invalid announcement priority.');
  if (Number.isNaN(Date.parse(String(value.publishedAt))))
    throw new HttpError(400, 'Published date is invalid.');
  if (value.expiresAt !== undefined && typeof value.expiresAt !== 'string')
    throw new HttpError(400, 'Expiry date must be text.');
  if (
    typeof value.expiresAt === 'string' &&
    Number.isNaN(Date.parse(value.expiresAt))
  )
    throw new HttpError(400, 'Expiry date is invalid.');
  if (
    String(value.title).length > 120 ||
    String(value.summary).length > 360 ||
    String(value.body).length > 12_000
  ) {
    throw new HttpError(400, 'One or more announcement fields are too long.');
  }
  if (
    value.image !== undefined &&
    (typeof value.image !== 'string' ||
      !/^\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value.image))
  ) {
    throw new HttpError(400, 'Preview image must be a site-relative path.');
  }
  if (
    value.previewVersion !== undefined &&
    (typeof value.previewVersion !== 'string' ||
      value.previewVersion.length > 80)
  ) {
    throw new HttpError(400, 'Preview version is invalid.');
  }
  if (
    value.previewHeight !== undefined &&
    (!Number.isInteger(value.previewHeight) ||
      Number(value.previewHeight) < 300 ||
      Number(value.previewHeight) > 1200)
  ) {
    throw new HttpError(400, 'Preview height is invalid.');
  }
  if (value.images !== undefined) {
    if (!Array.isArray(value.images) || value.images.length > 8) {
      throw new HttpError(400, 'A notice can contain up to 8 images.');
    }
    const expectedPrefix = `/media/announcement-${Number(value.number)}/`;
    const sources = new Set<string>();
    for (const image of value.images) {
      const validated = validateStoredImage(image);
      if (!validated.src.startsWith(expectedPrefix)) {
        throw new HttpError(
          400,
          'A notice image does not belong to this announcement.',
        );
      }
      if (sources.has(validated.src)) {
        throw new HttpError(400, 'Duplicate notice images are not allowed.');
      }
      sources.add(validated.src);
    }
  }
  if (value.actionUrl) {
    if (typeof value.actionUrl !== 'string')
      throw new HttpError(400, 'Action URL must be text.');
    try {
      const url = new URL(value.actionUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new HttpError(400, 'Action URL must be a valid web address.');
    }
  }
  return value as unknown as Announcement;
}

function validateStoredImage(input: unknown): AnnouncementImage {
  if (!input || typeof input !== 'object')
    throw new HttpError(400, 'Notice image data is invalid.');
  const image = input as Record<string, unknown>;
  if (
    typeof image.src !== 'string' ||
    !/^\/media\/announcement-\d+\/[a-zA-Z0-9-]{8,80}\.webp$/.test(image.src)
  ) {
    throw new HttpError(400, 'Notice image path is invalid.');
  }
  if (
    typeof image.alt !== 'string' ||
    !image.alt.trim() ||
    image.alt.length > 160
  ) {
    throw new HttpError(400, 'Notice image description is invalid.');
  }
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    Number(image.width) < 1 ||
    Number(image.height) < 1 ||
    Number(image.width) > 8_000 ||
    Number(image.height) > 8_000
  ) {
    throw new HttpError(400, 'Notice image dimensions are invalid.');
  }
  return image as unknown as AnnouncementImage;
}

function validateMediaPayload(input: unknown) {
  if (!input || typeof input !== 'object')
    throw new HttpError(400, 'Notice image data is required.');
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.images) || !Array.isArray(value.removeSources)) {
    throw new HttpError(400, 'Notice image changes are invalid.');
  }
  if (value.images.length > 8 || value.removeSources.length > 8) {
    throw new HttpError(400, 'A notice can contain up to 8 images.');
  }

  const images = value.images.map((item) => {
    if (!item || typeof item !== 'object')
      throw new HttpError(400, 'Notice image data is invalid.');
    const image = item as Record<string, unknown>;
    if (
      typeof image.id !== 'string' ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(image.id)
    ) {
      throw new HttpError(400, 'Notice image ID is invalid.');
    }
    if (
      typeof image.imageBase64 !== 'string' ||
      image.imageBase64.length < 100 ||
      image.imageBase64.length > 8_000_000 ||
      !image.imageBase64.startsWith('UklGR') ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.imageBase64)
    ) {
      throw new HttpError(400, 'A valid WebP notice image is required.');
    }
    const metadata = validateStoredImage({
      src: `/media/announcement-1/${image.id}.webp`,
      alt: image.alt,
      width: image.width,
      height: image.height,
    });
    return {
      id: image.id,
      imageBase64: image.imageBase64,
      alt: metadata.alt,
      width: metadata.width,
      height: metadata.height,
    };
  });
  if (new Set(images.map((image) => image.id)).size !== images.length) {
    throw new HttpError(400, 'Duplicate notice image IDs are not allowed.');
  }

  const removeSources = value.removeSources.map((source) => {
    if (
      typeof source !== 'string' ||
      !/^\/media\/announcement-\d+\/[a-zA-Z0-9-]{8,80}\.webp$/.test(source)
    ) {
      throw new HttpError(400, 'Notice image removal path is invalid.');
    }
    return source;
  });
  if (new Set(removeSources).size !== removeSources.length) {
    throw new HttpError(400, 'Duplicate image removals are not allowed.');
  }
  return { images, removeSources };
}

function validatePngBase64(input: unknown) {
  if (
    typeof input !== 'string' ||
    input.length < 100 ||
    input.length > 8_000_000 ||
    !input.startsWith('iVBORw0KGgo') ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(input)
  ) {
    throw new HttpError(400, 'A valid PNG preview image is required.');
  }
  return input;
}

function originAllowed(origin: string, env: Env) {
  if (!origin) return false;
  return env.ALLOWED_ORIGINS.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(origin);
}

function cors(origin: string, env: Env) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
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
  return new TextDecoder().decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
