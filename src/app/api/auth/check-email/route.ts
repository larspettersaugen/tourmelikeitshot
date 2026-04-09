import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Look up whether a Person profile exists for the given email (unauthenticated). */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  if (!emailRaw) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const person = await prisma.person.findFirst({
    where: { email: { equals: emailRaw, mode: 'insensitive' } },
    select: {
      id: true,
      firstName: true,
      userId: true,
      user: { select: { password: true } },
    },
  });

  if (!person) {
    return NextResponse.json({ found: false });
  }

  const hasAccount = Boolean(
    person.userId &&
      person.user?.password != null &&
      String(person.user.password).length > 0,
  );

  return NextResponse.json({ found: true, firstName: person.firstName, hasAccount });
}
