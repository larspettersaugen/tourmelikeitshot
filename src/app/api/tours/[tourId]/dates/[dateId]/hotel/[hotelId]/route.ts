import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; hotelId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { dateId, hotelId } = await params;
  const existing = await prisma.hotel.findFirst({ where: { id: hotelId, tourDateId: dateId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = body.name;
  if (body.address !== undefined) data.address = body.address;
  if (body.checkIn != null) data.checkIn = new Date(body.checkIn);
  if (body.checkOut != null) data.checkOut = new Date(body.checkOut);
  if (body.notes !== undefined) data.notes = body.notes;
  await prisma.hotel.update({
    where: { id: hotelId },
    data: data as Parameters<typeof prisma.hotel.update>[0]['data'],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; hotelId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { dateId, hotelId } = await params;
  const existing = await prisma.hotel.findFirst({ where: { id: hotelId, tourDateId: dateId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.hotel.delete({ where: { id: hotelId } });
  return NextResponse.json({ ok: true });
}
