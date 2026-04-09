import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; hotelId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId, hotelId } = await params;
  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, tourDateId: dateId },
    include: { tourDate: { select: { tourId: true } } },
  });
  if (!hotel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (hotel.tourDate.tourId !== tourId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { travelGroupMemberId, roomNumber } = body;
  if (!travelGroupMemberId) {
    return NextResponse.json({ error: 'travelGroupMemberId required' }, { status: 400 });
  }
  const member = await prisma.travelGroupMember.findFirst({
    where: { id: travelGroupMemberId, tourId },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  const existing = await prisma.hotelGuest.findUnique({
    where: {
      hotelId_travelGroupMemberId: { hotelId, travelGroupMemberId },
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'Person already at this hotel' }, { status: 400 });
  }
  const guest = await prisma.hotelGuest.create({
    data: {
      hotelId,
      travelGroupMemberId,
      roomNumber: roomNumber || null,
    },
  });
  return NextResponse.json({ id: guest.id });
}
