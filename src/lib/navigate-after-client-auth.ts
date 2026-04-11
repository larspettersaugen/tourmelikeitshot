/**
 * After browser-side Supabase sign-in, session cookies must be sent on the next
 * request. Soft client navigations (router.push + refresh) can hit RSC before
 * cookies are visible to the server — common behind HTTPS tunnels (ngrok,
 * localtunnel). A full navigation fixes that.
 */
export function navigateAfterClientAuth(path: string) {
  if (typeof window === 'undefined') return;
  const safe =
    path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';
  window.location.assign(`${window.location.origin}${safe}`);
}
