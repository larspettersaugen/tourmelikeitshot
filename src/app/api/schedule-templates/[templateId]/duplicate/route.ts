import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { templateId } = await params;
  const src = await prisma.daySheetTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: [{ dayAfter: 'asc' }, { time: 'asc' }] } },
  });
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let name: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && typeof body.name === 'string' && body.name.trim()) {
      name = body.name.trim();
    }
  } catch {
    // empty body
  }
  const newName = name ?? `${src.name} (copy)`;

  const created = await prisma.daySheetTemplate.create({
    data: {
      name: newName,
      tourId: src.tourId,
      items: {
        create: src.items.map((it, idx) => ({
          time: it.time || '00:00',
          label: it.label || 'Item',
          endTime: it.endTime ?? null,
          durationMinutes: it.durationMinutes ?? null,
          notes: it.notes ?? null,
          sortOrder: it.sortOrder ?? idx,
          dayAfter: it.dayAfter === true,
        })),
      },
    },
  });

  return NextResponse.json({ id: created.id });
}
