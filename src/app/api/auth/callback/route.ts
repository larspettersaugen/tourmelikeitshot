import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/** Handles OAuth/magic-link code exchange and ensures a Prisma User exists. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.user_metadata?.full_name ?? undefined, image: user.user_metadata?.avatar_url ?? undefined },
          create: { email: user.email, name: user.user_metadata?.full_name ?? null, image: user.user_metadata?.avatar_url ?? null, password: null, role: 'viewer' },
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
