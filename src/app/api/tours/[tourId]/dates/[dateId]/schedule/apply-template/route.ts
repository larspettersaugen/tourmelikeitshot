import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

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
  const { templateId } = body;
  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });
  const template = await prisma.daySheetTemplate.findFirst({
    where: { id: templateId },
    include: { items: { orderBy: [{ dayAfter: 'asc' }, { time: 'asc' }] } },
  });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  const maxOrder = await prisma.scheduleItem.aggregate({
    where: { tourDateId: dateId },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  for (const it of template.items) {
    await prisma.scheduleItem.create({
      data: {
        tourDateId: dateId,
        time: it.time,
        label: it.label,
        endTime: it.endTime,
        durationMinutes: it.durationMinutes,
        notes: it.notes,
        sortOrder: nextOrder++,
        dayAfter: it.dayAfter,
      },
    });
  }
  return NextResponse.json({ ok: true, added: template.items.length });
}
