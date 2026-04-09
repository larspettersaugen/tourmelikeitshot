import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

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
  const date = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!date) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const hotels = await prisma.hotel.findMany({
    where: { tourDateId: dateId },
    include: {
      guests: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  return NextResponse.json(
    hotels.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      checkIn: h.checkIn.toISOString(),
      checkOut: h.checkOut.toISOString(),
      notes: h.notes,
      guests: h.guests.map((g) => ({
        id: g.id,
        travelGroupMemberId: g.travelGroupMemberId,
        name: g.travelGroupMember.name,
        role: g.travelGroupMember.role,
        personId: g.travelGroupMember.personId,
        roomNumber: g.roomNumber,
      })),
    }))
  );
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
  const date = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!date) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { name, address, checkIn, checkOut, notes } = body;
  if (!name || !checkIn || !checkOut) {
    return NextResponse.json({ error: 'name, checkIn, checkOut required' }, { status: 400 });
  }
  const hotel = await prisma.hotel.create({
    data: {
      tourDateId: dateId,
      name,
      address: address || null,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      notes: notes || null,
    },
  });
  return NextResponse.json({ id: hotel.id });
}
