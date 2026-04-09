import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(_req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId } = await params;
  const flights = await prisma.flight.findMany({
    where: { tourId },
    orderBy: { departureTime: 'asc' },
  });
  return NextResponse.json(
    flights.map((f) => ({
      id: f.id,
      tourDateId: f.tourDateId,
      departureTime: f.departureTime.toISOString(),
      arrivalTime: f.arrivalTime.toISOString(),
      departureAirport: f.departureAirport,
      arrivalAirport: f.arrivalAirport,
      flightNumber: f.flightNumber,
      notes: f.notes,
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
    tourDateId,
    departureTime,
    arrivalTime,
    departureAirport,
    arrivalAirport,
    flightNumber,
    notes,
  } = body;
  if (!departureTime || !arrivalTime || !departureAirport || !arrivalAirport) {
    return NextResponse.json({ error: 'departureTime, arrivalTime, departureAirport, arrivalAirport required' }, { status: 400 });
  }
  const flight = await prisma.flight.create({
    data: {
      tourId,
      tourDateId: tourDateId || null,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(arrivalTime),
      departureAirport,
      arrivalAirport,
      flightNumber: flightNumber || null,
      notes: notes || null,
    },
  });
  return NextResponse.json({ id: flight.id });
}
