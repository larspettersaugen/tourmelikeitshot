import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';

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

  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const members = await prisma.tourDateMember.findMany({
    where: { tourDateId: dateId },
    select: { travelGroupMemberId: true },
  });

  return NextResponse.json({
    memberIds: members.map((m) => m.travelGroupMemberId),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tourId, dateId } = await params;
  const body = await req.json();
  const { memberIds } = body as { memberIds?: string[] };

  if (!Array.isArray(memberIds)) {
    return NextResponse.json({ error: 'memberIds array required' }, { status: 400 });
  }

  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const travelingMembers = await prisma.travelGroupMember.findMany({
    where: { tourId },
    select: { id: true },
  });
  const validIds = new Set(travelingMembers.map((m) => m.id));
  const toAdd = memberIds.filter((id) => validIds.has(id));

  await prisma.$transaction([
    prisma.tourDateMember.deleteMany({ where: { tourDateId: dateId } }),
    ...toAdd.map((travelGroupMemberId) =>
      prisma.tourDateMember.create({
        data: { tourDateId: dateId, travelGroupMemberId },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
