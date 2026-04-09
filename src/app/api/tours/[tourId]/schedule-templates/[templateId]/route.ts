import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; templateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, templateId } = await params;
  const template = await prisma.daySheetTemplate.findFirst({
    where: { id: templateId, tourId },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.daySheetTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}
