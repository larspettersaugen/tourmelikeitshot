import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';
async function getEntry(tourId: string, dateId: string, entryId: string) {
  const date = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    select: { id: true, guestListCapacity: true, guestListCapacityLocked: true },
  });
  if (!date) return null;
  const entry = await prisma.tourDateGuestListEntry.findFirst({
    where: { id: entryId, tourDateId: dateId },
  });
  if (!entry) return null;
  return { entry, date };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; entryId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId, entryId } = await params;
  const found = await getEntry(tourId, dateId, entryId);
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { entry: existing, date: tourDate } = found;
  const body = await req.json();
  const data: {
    name?: string;
    ticketCount?: number;
    representing?: string | null;
    phone?: string | null;
    sortOrder?: number;
  } = {};
  if (body.name != null) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    data.name = name;
  }
  if (body.ticketCount != null) {
    const n = Number(body.ticketCount);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      return NextResponse.json({ error: 'ticketCount must be a positive integer' }, { status: 400 });
    }
    data.ticketCount = n;
  }
  if ('representing' in body) {
    data.representing =
      body.representing == null || body.representing === ''
        ? null
        : typeof body.representing === 'string'
          ? body.representing.trim() || null
          : null;
  }
  if ('phone' in body) {
    data.phone =
      body.phone == null || body.phone === ''
        ? null
        : typeof body.phone === 'string'
          ? body.phone.trim() || null
          : null;
  }
  if (body.sortOrder != null) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return NextResponse.json({ error: 'sortOrder must be an integer' }, { status: 400 });
    }
    data.sortOrder = n;
  }

  await prisma.tourDateGuestListEntry.update({ where: { id: entryId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; entryId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId, entryId } = await params;
  const found = await getEntry(tourId, dateId, entryId);
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.tourDateGuestListEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
