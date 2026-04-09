import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { hasFullTourCatalogAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const fullCatalog = hasFullTourCatalogAccess(role);
  const viewerTourIds = fullCatalog ? null : await getViewerAssignedTourIds(session.user.id);
  const allProjects = await prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tours: true } },
      tours: { select: { id: true } },
      owner: { select: { id: true, name: true } },
    },
  });
  const projects = fullCatalog
    ? allProjects
    : allProjects.filter((p) => p.tours.some((t) => (viewerTourIds ?? []).includes(t.id)));
  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      tourCount: p._count.tours,
      owner: p.owner ? { id: p.owner.id, name: p.owner.name } : null,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { name, ownerId } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const data: { name: string; ownerId?: string | null } = { name: name.trim() };
  if (ownerId !== undefined) data.ownerId = ownerId || null;
  const project = await prisma.project.create({ data });
  return NextResponse.json({ id: project.id });
}
