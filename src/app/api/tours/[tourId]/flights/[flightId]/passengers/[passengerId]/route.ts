import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; flightId: string; passengerId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, flightId, passengerId } = await params;
  const flight = await prisma.flight.findFirst({ where: { id: flightId, tourId } });
  if (!flight) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const passenger = await prisma.flightPassenger.findFirst({
    where: { id: passengerId, flightId },
  });
  if (!passenger) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  if (body.bookingRef !== undefined) {
    await prisma.flightPassenger.update({
      where: { id: passengerId },
      data: { bookingRef: body.bookingRef || null },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; flightId: string; passengerId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, flightId, passengerId } = await params;
  const flight = await prisma.flight.findFirst({ where: { id: flightId, tourId } });
  if (!flight) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const passenger = await prisma.flightPassenger.findFirst({
    where: { id: passengerId, flightId },
  });
  if (!passenger) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.flightPassenger.delete({ where: { id: passengerId } });
  return NextResponse.json({ ok: true });
}
