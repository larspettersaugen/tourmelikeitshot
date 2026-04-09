import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance } from '@/lib/session';
import { requireTourDateReadAccess } from '@/lib/tour-date-access-api';
import path from 'node:path';
import fs from 'node:fs/promises';
import { customAdvanceSectionKey } from '@/lib/advance-file-section';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function findFieldForDate(tourId: string, dateId: string, fieldId: string) {
  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    select: { id: true },
  });
  if (!tourDate) return null;
  return prisma.advanceCustomField.findFirst({
    where: { id: fieldId, advance: { tourDateId: dateId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; fieldId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canEditAdvance(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, fieldId } = await params;
  const denied = await requireTourDateReadAccess(session.user.id, role, tourId, dateId);
  if (denied) return denied;

  const existing = await findFieldForDate(tourId, dateId, fieldId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    body?: string | null;
    done?: boolean;
    compromises?: boolean;
    sortOrder?: number;
  } = {};

  if ('title' in body) {
    const t = body.title;
    data.title = typeof t === 'string' && t.trim() ? t.trim().slice(0, 200) : 'Custom';
  }
  if ('body' in body) {
    data.body = body.body === '' || body.body == null ? null : String(body.body);
  }
  if (typeof body.done === 'boolean') data.done = body.done;
  if (typeof body.compromises === 'boolean') data.compromises = body.compromises;
  if (typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.round(body.sortOrder);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  const field = await prisma.advanceCustomField.update({
    where: { id: fieldId },
    data,
  });

  return NextResponse.json({
    id: field.id,
    title: field.title,
    body: field.body,
    done: field.done,
    compromises: field.compromises,
    sortOrder: field.sortOrder,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; fieldId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canEditAdvance(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, fieldId } = await params;
  const denied = await requireTourDateReadAccess(session.user.id, role, tourId, dateId);
  if (denied) return denied;

  const existing = await findFieldForDate(tourId, dateId, fieldId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sectionKey = customAdvanceSectionKey(fieldId);
  const files = await prisma.advanceFile.findMany({
    where: { tourDateId: dateId, advanceSection: sectionKey },
  });
  for (const f of files) {
    const filePath = path.join(UPLOAD_DIR, f.storedName);
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
  }
  await prisma.advanceFile.deleteMany({
    where: { tourDateId: dateId, advanceSection: sectionKey },
  });
  await prisma.advanceCustomField.delete({ where: { id: fieldId } });

  return NextResponse.json({ ok: true });
}
