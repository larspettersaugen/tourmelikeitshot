import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { userMayAccessProject, hasFullTourCatalogAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const role = (session.user as { role?: string }).role;
  if (!(await userMayAccessProject(session.user.id, role, projectId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true } },
      tours: {
        orderBy: { startDate: 'asc' },
        include: { _count: { select: { dates: true } } },
      },
    },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const fullCatalog = hasFullTourCatalogAccess(role);
  const viewerTourIds = fullCatalog ? null : await getViewerAssignedTourIds(session.user.id);
  const tours = fullCatalog
    ? project.tours
    : project.tours.filter((t) => (viewerTourIds ?? []).includes(t.id));
  return NextResponse.json({
    id: project.id,
    name: project.name,
    owner: project.owner ? { id: project.owner.id, name: project.owner.name } : null,
    tours: tours.map((t) => ({
      id: t.id,
      name: t.name,
      timezone: t.timezone,
      dateCount: t._count.dates,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { projectId } = await params;
  const body = await req.json();
  const { name, ownerId } = body;
  const data: { name?: string; ownerId?: string | null } = {};
  if (name !== undefined) {
    if (!String(name).trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    data.name = String(name).trim();
  }
  if (ownerId !== undefined) data.ownerId = ownerId || null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const project = await prisma.project.update({
    where: { id: projectId },
    data,
  });
  return NextResponse.json({ id: project.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
