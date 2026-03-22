import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { getPublicAppBaseUrlFromRequest } from '@/lib/public-app-url';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { personId } = await params;
  if (!personId?.trim()) return NextResponse.json({ error: 'Person ID required' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { isPowerUser } = body;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { user: true },
  });
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  if (!person.email?.trim()) {
    return NextResponse.json({ error: 'Person must have an email to invite. Add email in edit mode.' }, { status: 400 });
  }

  const email = person.email.trim();
  const userRole = isPowerUser ? 'power_user' : 'viewer';

  let userId = person.userId;

  if (!userId) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (existingUser?.profile && existingUser.profile.id !== person.id) {
      return NextResponse.json({
        error: `A person with this email already exists (${existingUser.profile.name}). Use a different email.`,
      }, { status: 400 });
    }
    const user = existingUser ?? await prisma.user.create({
      data: {
        email,
        password: null,
        name: person.name || null,
        role: userRole,
      },
    });
    if (existingUser) {
      if (existingUser.role !== 'editor' && existingUser.role !== 'admin') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: person.name || existingUser.name, role: userRole },
        });
      }
    }
    userId = user.id;
    await prisma.person.update({
      where: { id: personId },
      data: { userId },
    });
  } else if (person.user && (person.user.role === 'editor' || person.user.role === 'admin')) {
    // Masters keep their role; don't change
  } else if (person.user && isPowerUser !== undefined) {
    await prisma.user.update({
      where: { id: person.user.id },
      data: { role: isPowerUser ? 'power_user' : 'viewer' },
    });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.invite.create({
    data: { personId: person.id, token, expiresAt },
  });

  const baseUrl = getPublicAppBaseUrlFromRequest(req);
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json({ inviteUrl });
}

/** Remove all unused invites for this person (outstanding links stop working). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { personId } = await params;
  if (!personId?.trim()) return NextResponse.json({ error: 'Person ID required' }, { status: 400 });

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  const result = await prisma.invite.deleteMany({
    where: { personId, usedAt: null },
  });

  return NextResponse.json({ revoked: result.count });
}
