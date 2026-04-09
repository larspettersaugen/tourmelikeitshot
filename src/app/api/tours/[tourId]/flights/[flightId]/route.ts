import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; flightId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, flightId } = await params;
  const existing = await prisma.flight.findFirst({ where: { id: flightId, tourId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.tourDateId !== undefined) data.tourDateId = body.tourDateId;
  if (body.departureTime != null) data.departureTime = new Date(body.departureTime);
  if (body.arrivalTime != null) data.arrivalTime = new Date(body.arrivalTime);
  if (body.departureAirport != null) data.departureAirport = body.departureAirport;
  if (body.arrivalAirport != null) data.arrivalAirport = body.arrivalAirport;
  if (body.flightNumber !== undefined) data.flightNumber = body.flightNumber;
  if (body.notes !== undefined) data.notes = body.notes;
  await prisma.flight.update({ where: { id: flightId }, data: data as Parameters<typeof prisma.flight.update>[0]['data'] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
