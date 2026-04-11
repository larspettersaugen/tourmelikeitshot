import type { CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

function tunnelLikelyHttpsHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase();
  return (
    h.endsWith('.loca.lt') ||
    h.endsWith('.ngrok-free.app') ||
    h.endsWith('.ngrok.io') ||
    h.endsWith('.trycloudflare.com')
  );
}

/**
 * Match @supabase/ssr cookie `secure` to how the browser reached the app.
 * Tunnels often terminate TLS and forward HTTP to Node without x-forwarded-proto.
 */
export function supabaseCookieOptionsFromForwardedHeaders(
  getHeader: (name: string) => string | null,
): CookieOptions {
  const p = getHeader('x-forwarded-proto')?.split(',')[0]?.trim();
  if (p === 'https') return { secure: true };
  if (p === 'http') return { secure: false };
  const host = getHeader('host') ?? '';
  if (tunnelLikelyHttpsHost(host)) return { secure: true };
  return {};
}

export function supabaseCookieOptionsFromMiddleware(request: NextRequest) {
  return supabaseCookieOptionsFromForwardedHeaders((name) => request.headers.get(name));
}
