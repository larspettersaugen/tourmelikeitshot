import { NextResponse } from 'next/server';
import { getSession, canEditAdvance, canViewTasks } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canViewTasks(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
  const tasks = await prisma.tourDateTask.findMany({
    where: { tourDateId: dateId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      done: t.done,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEditAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const last = await prisma.tourDateTask.findFirst({
    where: { tourDateId: dateId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;
  const task = await prisma.tourDateTask.create({
    data: { tourDateId: dateId, title, sortOrder },
  });
  return NextResponse.json({
    id: task.id,
    title: task.title,
    done: task.done,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
  });
}
