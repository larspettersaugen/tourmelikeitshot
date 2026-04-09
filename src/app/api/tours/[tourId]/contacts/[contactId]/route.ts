import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; contactId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, contactId } = await params;
  const existing = await prisma.contact.findFirst({ where: { id: contactId, tourId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = body.name;
  if (body.role != null) data.role = body.role;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.tourDateId !== undefined) data.tourDateId = body.tourDateId;
  if (body.personId !== undefined) data.personId = body.personId || null;
  await prisma.contact.update({
    where: { id: contactId },
    data: data as Parameters<typeof prisma.contact.update>[0]['data'],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; contactId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, contactId } = await params;
  const existing = await prisma.contact.findFirst({ where: { id: contactId, tourId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.contact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
