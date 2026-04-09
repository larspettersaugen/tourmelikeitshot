import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { composePersonName, splitLegacyName } from '@/lib/person-name';

const PERSON_TYPES = ['musician', 'superstar', 'crew', 'tour_manager', 'productionmanager', 'driver'] as const;

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const person = await prisma.person.findFirst({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      name: true,
      type: true,
      phone: true,
      email: true,
      notes: true,
    },
  });
  return NextResponse.json(person);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if user already has a linked profile
  const existing = await prisma.person.findFirst({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: 'You already have a linked profile. Use PATCH to update it.' }, { status: 400 });
  }

  const body = await req.json();
  const { name, type, personId } = body;

  if (personId) {
    // Link existing Person to current user (replaces existing profile if any)
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    if (person.userId === userId) return NextResponse.json({ id: person.id, linked: true });
    await prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: personId },
        data: { userId },
      });
      if (person.userId) {
        await tx.user.delete({ where: { id: person.userId } });
      }
    });
    return NextResponse.json({ id: person.id, linked: true });
  }

  // Create new Person and link
  if (!name || !type) return NextResponse.json({ error: 'name and type required' }, { status: 400 });
  if (!PERSON_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${PERSON_TYPES.join(', ')}` }, { status: 400 });
  }

  const sp = splitLegacyName(name);
  const displayName = composePersonName(sp.firstName, sp.middleName, sp.lastName);
  const person = await prisma.person.create({
    data: {
      firstName: sp.firstName,
      middleName: sp.middleName,
      lastName: sp.lastName,
      name: displayName,
      type,
      phone: body.phone || null,
      email: body.email || session.user.email || null,
      notes: body.notes || null,
      userId,
    },
  });
  return NextResponse.json({
    id: person.id,
    name: person.name,
    type: person.type,
    phone: person.phone,
    email: person.email,
    notes: person.notes,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const person = await prisma.person.findFirst({ where: { userId } });
  if (!person) return NextResponse.json({ error: 'No linked profile. Use POST to create one.' }, { status: 404 });

  const body = await req.json();
  const data: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    name?: string;
    type?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  } = {};
  if (body.name !== undefined) {
    const sp = splitLegacyName(String(body.name));
    data.firstName = sp.firstName;
    data.middleName = sp.middleName;
    data.lastName = sp.lastName;
    data.name = composePersonName(sp.firstName, sp.middleName, sp.lastName);
  }
  if (body.type !== undefined) {
    if (!PERSON_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `type must be one of: ${PERSON_TYPES.join(', ')}` }, { status: 400 });
    }
    data.type = body.type;
  }
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const updated = await prisma.person.update({
    where: { id: person.id },
    data,
  });
  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    type: updated.type,
    phone: updated.phone,
    email: updated.email,
    notes: updated.notes,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const person = await prisma.person.findFirst({ where: { userId } });
  if (!person) return NextResponse.json({ error: 'No linked profile' }, { status: 404 });

  await prisma.person.update({
    where: { id: person.id },
    data: { userId: null },
  });
  return NextResponse.json({ ok: true });
}
