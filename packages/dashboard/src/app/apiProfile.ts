export function getActiveProfile(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('profile');
}

export function withActiveProfile(url: string): string {
  const profile = getActiveProfile();
  if (!profile) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}profile=${encodeURIComponent(profile)}`;
}
