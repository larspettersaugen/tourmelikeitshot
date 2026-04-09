import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; flightId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId, flightId } = await params;
  const flight = await prisma.flight.findFirst({
    where: { id: flightId, tourId },
    include: {
      passengers: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  if (!flight) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(
    flight.passengers.map((p) => ({
      id: p.id,
      travelGroupMemberId: p.travelGroupMemberId,
      name: p.travelGroupMember.name,
      role: p.travelGroupMember.role,
      bookingRef: p.bookingRef,
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; flightId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, flightId } = await params;
  const flight = await prisma.flight.findFirst({ where: { id: flightId, tourId } });
  if (!flight) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { travelGroupMemberId, bookingRef } = body;
  if (!travelGroupMemberId) {
    return NextResponse.json({ error: 'travelGroupMemberId required' }, { status: 400 });
  }
  const member = await prisma.travelGroupMember.findFirst({
    where: { id: travelGroupMemberId, tourId },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  const existing = await prisma.flightPassenger.findUnique({
    where: {
      flightId_travelGroupMemberId: { flightId, travelGroupMemberId },
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'Person already on this flight' }, { status: 400 });
  }
  const passenger = await prisma.flightPassenger.create({
    data: {
      flightId,
      travelGroupMemberId,
      bookingRef: bookingRef || null,
    },
  });
  return NextResponse.json({ id: passenger.id });
}
