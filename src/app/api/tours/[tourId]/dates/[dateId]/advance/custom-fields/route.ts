import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance } from '@/lib/session';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import { getOrCreateAdvanceId } from '@/lib/ensure-advance';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canEditAdvance(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId } = await params;
  const denied = await requireTourDateReadAccess(session.user.id, role, tourId, dateId);
  if (denied) return denied;
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const titleRaw = body?.title;
  const title =
    typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim().slice(0, 200) : 'Custom';

  const advanceId = await getOrCreateAdvanceId(dateId);
  const agg = await prisma.advanceCustomField.aggregate({
    where: { advanceId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const field = await prisma.advanceCustomField.create({
    data: { advanceId, title, sortOrder },
  });

  return NextResponse.json({
    id: field.id,
    title: field.title,
    body: field.body,
    done: field.done,
    compromises: field.compromises,
    sortOrder: field.sortOrder,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
  });
}
