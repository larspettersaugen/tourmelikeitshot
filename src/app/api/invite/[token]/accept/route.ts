import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password } = await req.json();

  if (!token || !password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { person: { include: { user: true } } },
  });
  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
  if (new Date() > invite.expiresAt) return NextResponse.json({ error: 'Invite expired' }, { status: 400 });

  const person = invite.person;
  if (!person.userId) return NextResponse.json({ error: 'No linked user account' }, { status: 400 });

  if (person.user?.password != null && String(person.user.password).length > 0) {
    return NextResponse.json(
      { error: 'This account already has a password. Sign in on the login page.' },
      { status: 400 }
    );
  }

  const hashed = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: person.userId },
      data: { password: hashed },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
