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
  const transports = await prisma.transport.findMany({ where: { tourDateId: dateId } });
  return NextResponse.json(
    transports.map((t) => ({
      id: t.id,
      type: t.type,
      time: t.time,
      dayAfter: t.dayAfter,
      driver: t.driver,
      driverPhone: t.driverPhone,
      driverEmail: t.driverEmail,
      company: t.company,
      notes: t.notes,
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
  const { type, time, dayAfter, driver, driverPhone, driverEmail, company, notes } = body;
  if (!type || !time) return NextResponse.json({ error: 'type, time required' }, { status: 400 });
  const transport = await prisma.transport.create({
    data: {
      tourDateId: dateId,
      type,
      time,
      dayAfter: dayAfter === true,
      driver: driver || null,
      driverPhone: driverPhone || null,
      driverEmail: driverEmail || null,
      company: company || null,
      notes: notes || null,
    },
  });
  return NextResponse.json({ id: transport.id });
}
