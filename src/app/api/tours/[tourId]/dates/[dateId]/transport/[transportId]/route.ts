import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; transportId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { dateId, transportId } = await params;
  const existing = await prisma.transport.findFirst({ where: { id: transportId, tourDateId: dateId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type != null) data.type = body.type;
  if (body.time != null) data.time = body.time;
  if (body.dayAfter != null) data.dayAfter = body.dayAfter;
  if (body.driver !== undefined) data.driver = body.driver;
  if (body.driverPhone !== undefined) data.driverPhone = body.driverPhone;
  if (body.driverEmail !== undefined) data.driverEmail = body.driverEmail;
  if (body.company !== undefined) data.company = body.company;
  if (body.notes !== undefined) data.notes = body.notes;
  await prisma.transport.update({
    where: { id: transportId },
    data: data as Parameters<typeof prisma.transport.update>[0]['data'],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
