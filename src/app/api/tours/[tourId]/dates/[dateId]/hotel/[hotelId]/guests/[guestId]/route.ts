import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; hotelId: string; guestId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { dateId, hotelId, guestId } = await params;
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, tourDateId: dateId } });
  if (!hotel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const guest = await prisma.hotelGuest.findFirst({ where: { id: guestId, hotelId } });
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  if (body.roomNumber !== undefined) {
    await prisma.hotelGuest.update({
      where: { id: guestId },
      data: { roomNumber: body.roomNumber || null },
    });
  }
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
