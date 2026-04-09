import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { templateId } = await params;
  const template = await prisma.daySheetTemplate.findFirst({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { name, items } = body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array required (at least one)' }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.daySheetTemplateItem.deleteMany({ where: { templateId } });
    await tx.daySheetTemplate.update({
      where: { id: templateId },
      data: {
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
    });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { templateId } = await params;
  const template = await prisma.daySheetTemplate.findFirst({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.daySheetTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
