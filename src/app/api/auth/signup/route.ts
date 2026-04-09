import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Self-service account setup: creates a Supabase auth user and links the
 * existing Prisma Person → User.  Only works when a Person with the given
 * email already exists in the directory (admins add people first).
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const email = emailRaw.toLowerCase();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const person = await prisma.person.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { user: true },
  });

  if (!person) {
    return NextResponse.json(
      { error: 'No profile found for this email. Contact your administrator to be added.' },
      { status: 404 },
    );
  }

  if (
    person.userId &&
    person.user?.password != null &&
    String(person.user.password).length > 0
  ) {
    return NextResponse.json(
      { error: 'This email already has an account. Sign in instead, or use "Forgot password" to reset.' },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();
  const { error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError && !authError.message?.includes('already been registered')) {
    console.error('[signup] Supabase auth error:', authError);
    return NextResponse.json({ error: 'Could not create account. Try again later.' }, { status: 500 });
  }

  try {
    if (person.userId && person.user) {
      await prisma.user.update({
        where: { id: person.userId },
        data: { password: 'managed-by-supabase' },
      });
    } else {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existingUser.id },
            data: {
              password: 'managed-by-supabase',
              name: existingUser.name || person.name || null,
            },
          }),
          prisma.person.update({
            where: { id: person.id },
            data: { userId: existingUser.id },
          }),
        ]);
      } else {
        const newUser = await prisma.user.create({
          data: {
            email,
            password: 'managed-by-supabase',
            name: person.name || null,
            role: 'viewer',
          },
        });
        await prisma.person.update({
          where: { id: person.id },
          data: { userId: newUser.id },
        });
      }
    }

    return NextResponse.json({ ok: true, email });
  } catch (e) {
    console.error('[signup]', e);
    return NextResponse.json({ error: 'Could not create account. Try again later.' }, { status: 500 });
  }
}
