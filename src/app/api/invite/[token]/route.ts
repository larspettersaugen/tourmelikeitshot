import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      person: {
        select: {
          name: true,
          email: true,
          userId: true,
          user: { select: { password: true } },
        },
      },
    },
  });
  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
  if (new Date() > invite.expiresAt) return NextResponse.json({ error: 'Invite expired' }, { status: 400 });

  const p = invite.person;
  const hasExistingPassword = Boolean(
    p.userId && p.user?.password != null && String(p.user.password).length > 0
  );

  return NextResponse.json({
    personName: p.name,
    email: p.email,
    hasExistingPassword,
  });
}
