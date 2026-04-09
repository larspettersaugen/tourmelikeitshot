import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId } = await params;
  const tour = await prisma.tour.findFirst({ where: { id: tourId } });
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const templates = await prisma.daySheetTemplate.findMany({
    where: { tourId },
    include: {
      items: { orderBy: [{ dayAfter: 'asc' }, { time: 'asc' }] },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      items: t.items.map((i) => ({
        time: i.time,
        endTime: i.endTime,
        durationMinutes: i.durationMinutes,
        label: i.label,
        notes: i.notes,
        sortOrder: i.sortOrder,
        dayAfter: i.dayAfter,
      })),
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId } = await params;
  const tour = await prisma.tour.findFirst({ where: { id: tourId } });
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { name, items } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array required (at least one)' }, { status: 400 });
  }
  const template = await prisma.daySheetTemplate.create({
    data: {
      tourId,
      name: name.trim(),
      items: {
        create: items.map((it: { time: string; label: string; endTime?: string; durationMinutes?: number; notes?: string; sortOrder?: number; dayAfter?: boolean }, idx: number) => ({
          time: it.time || '00:00',
          label: it.label || 'Item',
          endTime: it.endTime || null,
          durationMinutes: it.durationMinutes != null ? Number(it.durationMinutes) : null,
          notes: it.notes || null,
          sortOrder: it.sortOrder ?? idx,
          dayAfter: it.dayAfter === true,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json({ id: template.id });
}
