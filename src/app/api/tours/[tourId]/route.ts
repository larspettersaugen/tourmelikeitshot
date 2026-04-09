import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess, userMayAccessTour } from '@/lib/viewer-access';

export async function GET(_req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId } = await params;
  const role = (session.user as { role?: string }).role;
  if (!(await userMayAccessTour(session.user.id, role, tourId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      dates: { orderBy: { date: 'asc' } },
      manager: { select: { id: true, name: true } },
    },
  });
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    id: tour.id,
    name: tour.name,
    timezone: tour.timezone,
    startDate: tour.startDate?.toISOString() ?? null,
    endDate: tour.endDate?.toISOString() ?? null,
    manager: tour.manager ? { id: tour.manager.id, name: tour.manager.name } : null,
    dates: tour.dates.map((d) => ({
      id: d.id,
      venueName: d.venueName,
      city: d.city,
      date: d.date.toISOString(),
      status: d.status,
      address: d.address,
      venueId: d.venueId,
      name: d.name,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId } = await params;
  const body = await req.json();
  const data: { name?: string; timezone?: string; startDate?: Date | null; endDate?: Date | null; managerId?: string | null } = {};
  if (body.name != null) data.name = body.name;
  if (body.timezone != null) data.timezone = body.timezone;
  if (body.managerId !== undefined) data.managerId = body.managerId || null;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;

  if (data.startDate !== undefined || data.endDate !== undefined) {
    const existing = await prisma.tour.findUnique({ where: { id: tourId }, select: { startDate: true, endDate: true } });
    const start = data.startDate ?? existing?.startDate ?? null;
    const end = data.endDate ?? existing?.endDate ?? null;
    if (start && end && end < start) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
    }
  }

  await prisma.tour.update({ where: { id: tourId }, data });
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
