import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditVenue } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const contact = await prisma.venueContact.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      email: true,
      notes: true,
      venueId: true,
      venue: { select: { id: true, name: true, city: true } },
    },
  });
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEditVenue((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: {
    name?: string;
    role?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    venueId?: string | null;
  } = {};
  if (body.name != null) data.name = body.name.trim();
  if (body.role != null) data.role = body.role.trim() || 'Contact';
  if ('phone' in body) data.phone = body.phone?.trim() || null;
  if ('email' in body) data.email = body.email?.trim() || null;
  if ('notes' in body) data.notes = body.notes?.trim() || null;
  if ('venueId' in body) {
    if (body.venueId == null || body.venueId === '') data.venueId = null;
    else {
      const v = await prisma.venue.findUnique({ where: { id: String(body.venueId) } });
      if (!v) return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
      data.venueId = v.id;
    }
  }
  const contact = await prisma.venueContact.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      email: true,
      notes: true,
      venueId: true,
      venue: { select: { id: true, name: true, city: true } },
    },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
