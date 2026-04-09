import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId } = await params;
  const url = new URL(req.url);
  const dateId = url.searchParams.get('dateId');
  const where = { tourId } as { tourId: string; tourDateId?: string | null };
  if (dateId) where.tourDateId = dateId;
  const contacts = await prisma.contact.findMany({ where, orderBy: { name: 'asc' } });
  return NextResponse.json(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      tourDateId: c.tourDateId,
    }))
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
  const body = await req.json();
  const {
    name,
    role: contactRole,
    phone,
    email,
    notes,
    tourDateId,
    personId,
    venueContactId: bodyVenueContactId,
    venueId: newVenueContactVenueId,
  } = body;
  if (!name || !contactRole) return NextResponse.json({ error: 'name, role required' }, { status: 400 });
  const nameTrim = typeof name === 'string' ? name.trim() : String(name).trim();
  const roleTrim = typeof contactRole === 'string' ? contactRole.trim() : String(contactRole).trim();
  const phoneNorm = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  const emailNorm = typeof email === 'string' && email.trim() ? email.trim() : null;
  const notesNorm = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
  const dateId = tourDateId || null;

  let resolvedVenueContactVenueId: string | null | undefined;
  if (newVenueContactVenueId != null && String(newVenueContactVenueId).trim()) {
    const v = await prisma.venue.findUnique({ where: { id: String(newVenueContactVenueId).trim() } });
    if (!v) return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
    resolvedVenueContactVenueId = v.id;
  }

  let resolvedVenueContactId: string | undefined;

  if (bodyVenueContactId) {
    const vc = await prisma.venueContact.findUnique({ where: { id: bodyVenueContactId } });
    if (!vc) return NextResponse.json({ error: 'Venue contact not found' }, { status: 400 });
    resolvedVenueContactId = vc.id;
  } else if (!personId && dateId) {
    const existingVc = await prisma.venueContact.findFirst({
      where: { name: nameTrim },
    });
    if (existingVc) {
      resolvedVenueContactId = existingVc.id;
      const patch: { phone?: string; email?: string; notes?: string } = {};
      if (phoneNorm && !existingVc.phone) patch.phone = phoneNorm;
      if (emailNorm && !existingVc.email) patch.email = emailNorm;
      if (notesNorm && !existingVc.notes) patch.notes = notesNorm;
      if (Object.keys(patch).length > 0) {
        await prisma.venueContact.update({
          where: { id: existingVc.id },
          data: patch,
        });
      }
    } else {
      const created = await prisma.venueContact.create({
        data: {
          name: nameTrim,
          role: roleTrim || 'Contact',
          phone: phoneNorm,
          email: emailNorm,
          notes: notesNorm,
          venueId: resolvedVenueContactVenueId ?? null,
        },
      });
      resolvedVenueContactId = created.id;
    }
  }

  const data: {
    tourId: string;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    tourDateId: string | null;
    personId?: string;
    venueContactId?: string;
  } = {
    tourId,
    name: nameTrim,
    role: roleTrim,
    phone: phoneNorm,
    email: emailNorm,
    notes: notesNorm,
    tourDateId: dateId,
  };

  if (personId) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (person) data.personId = personId;
  }
  if (resolvedVenueContactId) data.venueContactId = resolvedVenueContactId;

  if (dateId && resolvedVenueContactId) {
    const dup = await prisma.contact.findFirst({
      where: { tourId, tourDateId: dateId, venueContactId: resolvedVenueContactId },
    });
    if (dup) return NextResponse.json({ id: dup.id });
  }

  const contact = await prisma.contact.create({ data });
  return NextResponse.json({ id: contact.id });
}
