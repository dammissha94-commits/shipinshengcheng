const DEFAULT_REDIRECT_PATH = '/family';

export function sanitizeRedirectPath(input: string | null | undefined): string {
  const value = input?.trim();
  if (!value) return DEFAULT_REDIRECT_PATH;
  if (!value.startsWith('/')) return DEFAULT_REDIRECT_PATH;
  if (value.startsWith('//')) return DEFAULT_REDIRECT_PATH;
  if (/^https?:\/\//i.test(value)) return DEFAULT_REDIRECT_PATH;
  if (/^javascript:/i.test(value)) return DEFAULT_REDIRECT_PATH;
  if (/[\r\n\\]/.test(value)) return DEFAULT_REDIRECT_PATH;
  return value;
}

export function loginRedirectPath(path: string): string {
  return `/login?redirect=${encodeURIComponent(sanitizeRedirectPath(path))}`;
}

export function currentLoginRedirectPath(): string {
  if (typeof window === 'undefined') return '/login';
  return loginRedirectPath(`${window.location.pathname}${window.location.search}`);
}
