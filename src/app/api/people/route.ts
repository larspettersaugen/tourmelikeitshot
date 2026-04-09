import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import {
  checkboxesFromUserRole,
  parsePeopleAccessFlags,
  peopleRoleFromCheckboxes,
  isSuperadminLinkedRole,
} from '@/lib/person-linked-role';
import { getPublicAppBaseUrlFromRequest } from '@/lib/public-app-url';
import type { Prisma } from '@prisma/client';
import { composePersonName, splitLegacyName } from '@/lib/person-name';

const PERSON_TYPES = ['musician', 'superstar', 'crew', 'tour_manager', 'productionmanager', 'driver'] as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q') ?? '';
  const where: Prisma.PersonWhereInput = {};
  if (type && PERSON_TYPES.includes(type as (typeof PERSON_TYPES)[number])) where.type = type;
  if (q.trim()) {
    const qv = q.trim();
    where.OR = [
      { name: { contains: qv, mode: 'insensitive' } },
      { firstName: { contains: qv, mode: 'insensitive' } },
      { lastName: { contains: qv, mode: 'insensitive' } },
      { middleName: { contains: qv, mode: 'insensitive' } },
    ];
  }
  const people = await prisma.person.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
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
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
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
      ...(() => {
        const f = checkboxesFromUserRole(p.user?.role);
        return {
          isBookingAdmin: f.isBookingAdmin,
          isPowerUser: f.isPowerUser,
          linkedRoleLocked: f.linkedRoleLocked,
        };
      })(),
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
  const {
    firstName,
    middleName,
    lastName,
    name: legacyName,
    type,
    birthdate,
    phone,
    email,
    streetName,
    zipCode,
    county,
    timezone,
    notes,
  } = body;
  const fn = typeof firstName === 'string' ? firstName.trim() : '';
  const ln = typeof lastName === 'string' ? lastName.trim() : '';
  const mn = typeof middleName === 'string' && middleName.trim() ? middleName.trim() : null;
  const useNameParts = 'firstName' in body || 'lastName' in body || 'middleName' in body;
  let first: string;
  let middle: string | null;
  let last: string;
  let displayName: string;
  if (useNameParts) {
    if (!fn) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    first = fn;
    middle = mn;
    last = ln;
    displayName = composePersonName(first, middle, last);
  } else if (typeof legacyName === 'string' && legacyName.trim()) {
    const sp = splitLegacyName(legacyName);
    first = sp.firstName;
    middle = sp.middleName;
    last = sp.lastName;
    displayName = composePersonName(first, middle, last);
  } else {
    return NextResponse.json({ error: 'firstName/lastName (or legacy name), type required' }, { status: 400 });
  }
  const name = displayName;
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });
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

  const access = parsePeopleAccessFlags(body as Record<string, unknown>);
  const userRole = peopleRoleFromCheckboxes(access.isBookingAdmin, access.isPowerUser);
  const user = existingUser ?? (await prisma.user.create({
    data: {
      email: email.trim(),
      password: null,
      name: name || null,
      role: userRole,
    },
  }));
  if (existingUser) {
    const updateData: { name?: string; role?: string } = {
      name: (name || existingUser.name) ?? undefined,
    };
    if (!isSuperadminLinkedRole(existingUser.role)) {
      updateData.role = userRole;
    }
    await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
    });
  }

  const person = await prisma.person.create({
    data: {
      firstName: first,
      middleName: middle,
      lastName: last,
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
