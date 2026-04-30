export function loginRedirectPath(path: string): string {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

export function currentLoginRedirectPath(): string {
  if (typeof window === 'undefined') return '/login';
  return loginRedirectPath(`${window.location.pathname}${window.location.search}`);
}
