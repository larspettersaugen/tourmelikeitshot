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
  const items = await prisma.scheduleItem.findMany({
    where: { tourDateId: dateId },
    orderBy: { time: 'asc' },
  });
  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      time: i.time,
      endTime: i.endTime,
      durationMinutes: i.durationMinutes,
      label: i.label,
      notes: i.notes,
      sortOrder: i.sortOrder,
      dayAfter: i.dayAfter,
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
  const { time, label, notes, sortOrder, dayAfter, endTime, durationMinutes } = body;
  if (!time || !label) return NextResponse.json({ error: 'time, label required' }, { status: 400 });
  const maxOrder = await prisma.scheduleItem.aggregate({
    where: { tourDateId: dateId },
    _max: { sortOrder: true },
  });
  const item = await prisma.scheduleItem.create({
    data: {
      tourDateId: dateId,
      time,
      label,
      notes: notes || null,
      sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      dayAfter: dayAfter === true,
      endTime: endTime || null,
      durationMinutes: durationMinutes != null ? Number(durationMinutes) : null,
    },
  });
  return NextResponse.json({ id: item.id });
}
