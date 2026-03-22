import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { getPublicAppBaseUrlFromRequest } from '@/lib/public-app-url';

const PERSON_TYPES = ['musician', 'superstar', 'crew', 'tour_manager', 'productionmanager', 'driver'] as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q') ?? '';
  const where: { type?: string; name?: { contains: string } } = {};
  if (type && PERSON_TYPES.includes(type as (typeof PERSON_TYPES)[number])) where.type = type;
  if (q.trim()) where.name = { contains: q.trim() };
  const people = await prisma.person.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      birthdate: true,
      phone: true,
      email: true,
      streetName: true,
      zipCode: true,
      county: true,
      timezone: true,
      notes: true,
      userId: true,
      user: { select: { role: true } },
      invites: {
        where: { usedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  return NextResponse.json(
    people.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      birthdate: p.birthdate?.toISOString() ?? null,
      phone: p.phone,
      email: p.email,
      streetName: p.streetName,
      zipCode: p.zipCode,
      county: p.county,
      timezone: p.timezone,
      notes: p.notes,
      userId: p.userId,
      isPowerUser: p.user ? (p.user.role === 'power_user' || p.user.role === 'editor' || p.user.role === 'admin') : false,
      hasPendingInvite: p.invites.length > 0,
    }))
  );
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { name, type, birthdate, phone, email, streetName, zipCode, county, timezone, notes, isPowerUser } = body;
  if (!name || !type) return NextResponse.json({ error: 'name, type required' }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!PERSON_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${PERSON_TYPES.join(', ')}` }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim() },
    include: { profile: true },
  });
  if (existingUser?.profile) {
    const existingName = existingUser.profile.name;
    return NextResponse.json({
      error: `A person with this email already exists${existingName ? ` (${existingName})` : ''}. Use a different email.`,
    }, { status: 400 });
  }

  const userRole = isPowerUser ? 'power_user' : 'viewer';
  const user = existingUser ?? (await prisma.user.create({
    data: {
      email: email.trim(),
      password: null,
      name: name || null,
      role: userRole,
    },
  }));
  if (existingUser) {
    const updateData: { name?: string; role?: string } = { name: name || existingUser.name };
    if (existingUser.role !== 'editor' && existingUser.role !== 'admin') {
      updateData.role = userRole;
    }
    await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
    });
  }

  const person = await prisma.person.create({
    data: {
      name,
      type,
      birthdate: birthdate ? new Date(birthdate) : null,
      phone: phone || null,
      email: email.trim(),
      streetName: streetName || null,
      zipCode: zipCode || null,
      county: county || null,
      timezone: timezone || null,
      notes: notes || null,
      userId: user.id,
    },
  });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.invite.create({
    data: { personId: person.id, token, expiresAt },
  });

  const baseUrl = getPublicAppBaseUrlFromRequest(req);
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json({
    id: person.id,
    name: person.name,
    type: person.type,
    phone: person.phone,
    email: person.email,
    notes: person.notes,
    inviteUrl,
  });
  } catch (err) {
    console.error('[POST /api/people]', err);
    if (err instanceof Error && err.stack) {
      console.error('[POST /api/people] stack:', err.stack);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
