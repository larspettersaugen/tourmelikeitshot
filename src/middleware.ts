import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

function httpsUpgradeResponse(request: NextRequest): NextResponse | null {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (proto !== 'http') {
    return null;
  }
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const hostname = host.split(':')[0].toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === ''
  ) {
    return null;
  }
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(`https://${host}${path}`, 308);
}

export async function middleware(request: NextRequest) {
  const upgrade = httpsUpgradeResponse(request);
  if (upgrade) {
    return upgrade;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclude SW / workbox (PWA), static images, so session middleware does not intercept them.
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js$|workbox-[^/]+\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
