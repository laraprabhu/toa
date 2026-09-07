export const sitePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

export function siteHref(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${sitePath}${normalizedPath}` || '/';
}
