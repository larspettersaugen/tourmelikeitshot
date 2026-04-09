import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as { role?: string }).role;
    if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { dateId, itemId } = await params;
    const body = await req.json();
    const item = await prisma.scheduleItem.findFirst({ where: { id: itemId, tourDateId: dateId } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data: {
      time?: string;
      label?: string;
      notes?: string | null;
      sortOrder?: number;
      dayAfter?: boolean;
      endTime?: string | null;
      durationMinutes?: number | null;
    } = {};
    if (body.time != null) data.time = String(body.time);
    if (body.label != null) data.label = String(body.label);
    if (body.notes !== undefined) data.notes = body.notes === '' || body.notes == null ? null : String(body.notes);
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder);
    if (body.dayAfter != null) data.dayAfter = Boolean(body.dayAfter);
    if (body.endTime !== undefined) data.endTime = body.endTime ? String(body.endTime) : null;
    if (body.durationMinutes !== undefined) {
      const n = body.durationMinutes != null ? Number(body.durationMinutes) : null;
      data.durationMinutes = n != null && !isNaN(n) ? n : null;
    }
    await prisma.scheduleItem.update({ where: { id: itemId }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Schedule PATCH error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { dateId, itemId } = await params;
  const item = await prisma.scheduleItem.findFirst({ where: { id: itemId, tourDateId: dateId } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.scheduleItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
