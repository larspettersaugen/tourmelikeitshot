import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Handles OAuth / magic-link code exchange.
 *
 * A Prisma User is only created when the authenticated email matches an
 * existing Person profile (or when the User already exists from a previous
 * login / invite).  If neither exists the Supabase session is cleared and the
 * user is sent back to the login page with an error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const email = user.email;
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: {
              name: user.user_metadata?.full_name ?? existingUser.name,
              image: user.user_metadata?.avatar_url ?? existingUser.image,
            },
          });

          const hasProfile = await prisma.person.findUnique({
            where: { userId: existingUser.id },
            select: { id: true },
          });
          if (!hasProfile) {
            const person = await prisma.person.findFirst({
              where: {
                email: { equals: email, mode: 'insensitive' },
                userId: null,
              },
              select: { id: true },
            });
            if (person) {
              await prisma.person.update({
                where: { id: person.id },
                data: { userId: existingUser.id },
              });
            }
          }
        } else {
          const person = await prisma.person.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, name: true, userId: true },
          });

          if (person) {
            const newUser = await prisma.user.create({
              data: {
                email,
                name: user.user_metadata?.full_name ?? person.name ?? null,
                image: user.user_metadata?.avatar_url ?? null,
                password: null,
                role: 'viewer',
              },
            });
            if (!person.userId) {
              await prisma.person.update({
                where: { id: person.id },
                data: { userId: newUser.id },
              });
            }
          } else {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/login?error=no-profile`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
