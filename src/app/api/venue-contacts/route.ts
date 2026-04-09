import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditVenue } from '@/lib/session';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const venueId = url.searchParams.get('venueId');
  const where: { name?: { contains: string }; venueId?: string } = {};
  if (q.trim()) where.name = { contains: q.trim() };
  if (venueId?.trim()) where.venueId = venueId.trim();
  const contacts = await prisma.venueContact.findMany({
    where,
    orderBy: { name: 'asc' },
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
  return NextResponse.json(contacts);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEditVenue((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { name, role, phone, email, notes, venueId: bodyVenueId } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  let venueId: string | null = null;
  if (bodyVenueId != null && String(bodyVenueId).trim()) {
    const v = await prisma.venue.findUnique({ where: { id: String(bodyVenueId).trim() } });
    if (!v) return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
    venueId = v.id;
  }
  const contact = await prisma.venueContact.create({
    data: {
      name: name.trim(),
      role: (role?.trim() || 'Contact') as string,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      notes: notes?.trim() || null,
      venueId,
    },
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
