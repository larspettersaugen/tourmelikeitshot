import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; transportId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId, dateId, transportId } = await params;
  const denied = await requireTourDateReadAccess(
    session.user.id,
    (session.user as { role?: string }).role,
    tourId,
    dateId
  );
  if (denied) return denied;
  const transport = await prisma.transport.findFirst({
    where: { id: transportId, tourDateId: dateId },
    include: {
      passengers: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  if (!transport) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(
    transport.passengers.map((p) => ({
      id: p.id,
      travelGroupMemberId: p.travelGroupMemberId,
      name: p.travelGroupMember.name,
      role: p.travelGroupMember.role,
      personId: p.travelGroupMember.personId,
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; transportId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId, transportId } = await params;
  const transport = await prisma.transport.findFirst({
    where: { id: transportId, tourDateId: dateId },
    include: { tourDate: { select: { tourId: true } } },
  });
  if (!transport) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (transport.tourDate.tourId !== tourId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { travelGroupMemberId } = body;
  if (!travelGroupMemberId) {
    return NextResponse.json({ error: 'travelGroupMemberId required' }, { status: 400 });
  }
  const member = await prisma.travelGroupMember.findFirst({
    where: { id: travelGroupMemberId, tourId },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  try {
    const passenger = await prisma.transportPassenger.create({
      data: {
        transportId,
        travelGroupMemberId,
      },
    });
    return NextResponse.json({ id: passenger.id });
  } catch (e) {
    const prismaError = e as { code?: string };
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Person already on this transport' }, { status: 400 });
    }
    throw e;
  }
}
