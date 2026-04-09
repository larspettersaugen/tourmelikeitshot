import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const fullCatalog = hasFullTourCatalogAccess(role);
  const viewerTourIds = fullCatalog ? null : await getViewerAssignedTourIds(session.user.id);
  const tours = await prisma.tour.findMany({
    where: fullCatalog ? undefined : { id: { in: viewerTourIds ?? [] } },
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true, timezone: true },
  });
  return NextResponse.json(tours);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as { role?: string }).role;
    if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const { name, timezone = 'UTC' } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const tour = await prisma.tour.create({
      data: { name, timezone },
    });
    return NextResponse.json({ id: tour.id });
  } catch (err) {
    console.error('[API tours POST]', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
