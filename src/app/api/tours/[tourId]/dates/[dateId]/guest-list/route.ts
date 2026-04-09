import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';
function mapEntry(e: {
  id: string;
  name: string;
  ticketCount: number;
  representing: string | null;
  phone: string | null;
  sortOrder: number;
  createdAt: Date;
}) {
  return {
    id: e.id,
    name: e.name,
    ticketCount: e.ticketCount,
    representing: e.representing,
    phone: e.phone,
    sortOrder: e.sortOrder,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId, dateId } = await params;
  const denied = await requireTourDateReadAccess(
    session.user.id,
    (session.user as { role?: string }).role,
    tourId,
    dateId
  );
  if (denied) return denied;
  const date = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    select: { guestListCapacity: true, guestListCapacityLocked: true },
  });
  if (!date) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const entries = await prisma.tourDateGuestListEntry.findMany({
    where: { tourDateId: dateId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({
    capacity: date.guestListCapacity,
    capacityLocked: date.guestListCapacityLocked,
    entries: entries.map(mapEntry),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId } = await params;
  const date = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    select: { guestListCapacity: true, guestListCapacityLocked: true },
  });
  if (!date) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  let ticketCount = 1;
  if (body.ticketCount != null && body.ticketCount !== '') {
    const n = Number(body.ticketCount);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      return NextResponse.json({ error: 'ticketCount must be a positive integer' }, { status: 400 });
    }
    ticketCount = n;
  }
  const representing =
    typeof body.representing === 'string' ? body.representing.trim() || null : null;
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null;

  const last = await prisma.tourDateGuestListEntry.findFirst({
    where: { tourDateId: dateId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;
  const row = await prisma.tourDateGuestListEntry.create({
    data: {
      tourDateId: dateId,
      name,
      ticketCount,
      representing: representing ?? undefined,
      phone: phone ?? undefined,
      sortOrder,
    },
  });
  return NextResponse.json(mapEntry(row));
}
