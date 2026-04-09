import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance, canViewTasks } from '@/lib/session';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; taskId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canViewTasks(role) || !canEditAdvance(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, taskId } = await params;
  const denied = await requireTourDateReadAccess(session.user.id, role, tourId, dateId);
  if (denied) return denied;
  const task = await prisma.tourDateTask.findFirst({
    where: { id: taskId, tourDateId: dateId },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const data: { title?: string; done?: boolean; sortOrder?: number } = {};
  if ('title' in body) {
    const t = typeof body.title === 'string' ? body.title.trim() : '';
    if (!t) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    data.title = t;
  }
  if (typeof body.done === 'boolean') data.done = body.done;
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) data.sortOrder = body.sortOrder;
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  await prisma.tourDateTask.update({ where: { id: taskId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; taskId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const roleDel = (session.user as { role?: string }).role;
  if (!canViewTasks(roleDel) || !canEditAdvance(roleDel)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, taskId } = await params;
  const deniedDel = await requireTourDateReadAccess(session.user.id, roleDel, tourId, dateId);
  if (deniedDel) return deniedDel;
  const task = await prisma.tourDateTask.findFirst({
    where: { id: taskId, tourDateId: dateId },
  });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.tourDateTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
