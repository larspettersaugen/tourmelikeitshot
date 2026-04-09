function normalizedBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/$/, '');
}

function isLocalhostHost(host: string): boolean {
  return /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/i.test(host);
}

function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

type HeaderGetter = (name: string) => string | null;

function requestProto(getHeader: HeaderGetter, host: string): string {
  const raw = getHeader('x-forwarded-proto');
  const first = raw?.split(',')[0]?.trim();
  if (first) {
    const onVercel = process.env.VERCEL === '1';
    if (onVercel && first === 'http' && !isLocalhostHost(host)) {
      return 'https';
    }
    return first;
  }
  if (isLocalhostHost(host)) {
    return 'http';
  }
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return 'https';
  }
  return 'http';
}

/**
 * Base URL for links shared outside the browser (invites, SMS, beta join).
 *
 * 1. PUBLIC_APP_URL — set for tunnels or when links must differ from the browser URL.
 * 2. Request Host / X-Forwarded-* — correct on Vercel and when using a LAN IP.
 * 3. If the request host is localhost but NEXTAUTH_URL points elsewhere, use NEXTAUTH_URL
 *    (e.g. misreported headers in some deploys).
 */
export function getPublicAppBaseUrl(getHeader: HeaderGetter): string {
  const fromPublic = normalizedBaseUrl(process.env.PUBLIC_APP_URL);
  if (fromPublic) return fromPublic;

  const host = getHeader('x-forwarded-host') ?? getHeader('host') ?? 'localhost:3000';
  const proto = requestProto(getHeader, host);
  const fromRequest = `${proto}://${host}`;

  const nextAuth = normalizedBaseUrl(process.env.NEXTAUTH_URL);
  if (isLocalhostHost(host) && nextAuth && !isLocalhostUrl(nextAuth)) {
    return nextAuth;
  }

  return fromRequest;
}

export function getPublicAppBaseUrlFromRequest(req: Request): string {
  return getPublicAppBaseUrl((name) => req.headers.get(name));
}
