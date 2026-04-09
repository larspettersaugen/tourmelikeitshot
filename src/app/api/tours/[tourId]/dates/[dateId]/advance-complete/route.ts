import { NextResponse } from 'next/server';
import { getSession, canEditAdvance } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { isReadyForAdvanceComplete } from '@/lib/advance-complete';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import { advanceSelectForComplete } from '@/lib/advance-for-complete';

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
  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    include: {
      advance: { select: advanceSelectForComplete },
      tasks: { select: { done: true } },
    },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const complete = body?.complete === true;

  if (complete) {
    if (!isReadyForAdvanceComplete(tourDate.advance, tourDate.tasks)) {
      return NextResponse.json(
        { error: 'All advance sections (including any custom sections) must be marked done and all tasks completed first.' },
        { status: 400 }
      );
    }
    await prisma.tourDate.update({
      where: { id: dateId },
      data: { advanceComplete: true },
    });
  } else {
    await prisma.tourDate.update({
      where: { id: dateId },
      data: { advanceComplete: false },
    });
  }

  return NextResponse.json({ ok: true });
}
