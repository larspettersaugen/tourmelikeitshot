import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance, canAccessAdvance } from '@/lib/session';
import path from 'node:path';
import fs from 'node:fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; fileId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEditAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, fileId } = await params;
  const file = await prisma.advanceFile.findFirst({
    where: { id: fileId, tourDateId: dateId },
  });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, file.storedName);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if file already gone
  }
  await prisma.advanceFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string; fileId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId, fileId } = await params;
  const file = await prisma.advanceFile.findFirst({
    where: { id: fileId, tourDateId: dateId },
  });
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, file.storedName);
  try {
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
