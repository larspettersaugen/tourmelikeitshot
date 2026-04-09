import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import {
  checkboxesFromUserRole,
  parsePeopleAccessFlags,
  peopleRoleFromCheckboxes,
  isSuperadminLinkedRole,
} from '@/lib/person-linked-role';
import { composePersonName, splitLegacyName } from '@/lib/person-name';

const PERSON_TYPES = ['musician', 'superstar', 'crew', 'tour_manager', 'productionmanager', 'driver'] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { personId } = await params;
  const person = await prisma.person.findUnique({
    where: { id: personId },
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
    },
  });
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { user, ...rest } = person;
  const flags = checkboxesFromUserRole(user?.role);
  return NextResponse.json({
    ...rest,
    timezone: person.timezone,
    isBookingAdmin: flags.isBookingAdmin,
    isPowerUser: flags.isPowerUser,
    linkedRoleLocked: flags.linkedRoleLocked,
  });
}

export async function PATCH(
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
  const existing = await prisma.person.findUnique({ where: { id: personId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    userId,
  } = body;
  const data: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    name?: string;
    type?: string;
    birthdate?: Date | null;
    phone?: string | null;
    email?: string | null;
    streetName?: string | null;
    zipCode?: string | null;
    county?: string | null;
    timezone?: string | null;
    notes?: string | null;
    userId?: string | null;
  } = {};
  const useNameParts = 'firstName' in body || 'lastName' in body || 'middleName' in body;
  if (useNameParts) {
    const fn = typeof firstName === 'string' ? firstName.trim() : existing.firstName;
    const ln = typeof lastName === 'string' ? lastName.trim() : existing.lastName;
    const mn =
      middleName === undefined
        ? existing.middleName
        : typeof middleName === 'string' && middleName.trim()
          ? middleName.trim()
          : null;
    if (!fn) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }
    data.firstName = fn;
    data.middleName = mn;
    data.lastName = ln;
    data.name = composePersonName(fn, mn, ln);
  } else if (legacyName !== undefined) {
    const sp = splitLegacyName(String(legacyName));
    data.firstName = sp.firstName;
    data.middleName = sp.middleName;
    data.lastName = sp.lastName;
    data.name = composePersonName(sp.firstName, sp.middleName, sp.lastName);
  }
  if (type !== undefined) {
    if (!PERSON_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${PERSON_TYPES.join(', ')}` }, { status: 400 });
    }
    data.type = type;
  }
  if (birthdate !== undefined) data.birthdate = birthdate ? new Date(birthdate) : null;
  if (phone !== undefined) data.phone = phone || null;
  if (email !== undefined) data.email = email || null;
  if (streetName !== undefined) data.streetName = streetName || null;
  if (zipCode !== undefined) data.zipCode = zipCode || null;
  if (county !== undefined) data.county = county || null;
  if (timezone !== undefined) data.timezone = timezone || null;
  if (notes !== undefined) data.notes = notes || null;
  if (userId !== undefined) data.userId = userId || null;
  try {
    const includeUser = { user: { select: { id: true, role: true } } } as const;
    const person =
      Object.keys(data).length > 0
        ? await prisma.person.update({
            where: { id: personId },
            data,
            include: includeUser,
          })
        : await prisma.person.findUnique({
            where: { id: personId },
            include: includeUser,
          });
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let flags = checkboxesFromUserRole(person.user?.role);
    const shouldPatchRole =
      ('isBookingAdmin' in body || 'isPowerUser' in body) &&
      person.userId &&
      person.user &&
      !isSuperadminLinkedRole(person.user.role);
    if (shouldPatchRole && person.user) {
      const access = parsePeopleAccessFlags(body as Record<string, unknown>);
      const nextRole = peopleRoleFromCheckboxes(access.isBookingAdmin, access.isPowerUser);
      await prisma.user.update({
        where: { id: person.user.id },
        data: { role: nextRole },
      });
      flags = checkboxesFromUserRole(nextRole);
    }
    return NextResponse.json({
      id: person.id,
      firstName: person.firstName,
      middleName: person.middleName,
      lastName: person.lastName,
      name: person.name,
      type: person.type,
      phone: person.phone,
      email: person.email,
      streetName: person.streetName,
      zipCode: person.zipCode,
      county: person.county,
      timezone: person.timezone,
      notes: person.notes,
      isBookingAdmin: flags.isBookingAdmin,
      isPowerUser: flags.isPowerUser,
      linkedRoleLocked: flags.linkedRoleLocked,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
