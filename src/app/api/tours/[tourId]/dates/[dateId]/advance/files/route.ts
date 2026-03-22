import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance, canAccessAdvance } from '@/lib/session';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const ADVANCE_SECTIONS = ['technical', 'rider', 'logistics', 'equipmentTransport'] as const;

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId } = await params;
  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    include: { advanceFiles: { orderBy: { createdAt: 'asc' } } },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(
    tourDate.advanceFiles.map((f) => ({
      id: f.id,
      filename: f.filename,
      advanceSection: f.advanceSection,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      createdAt: f.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEditAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId } = await params;
  const tourDate = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const advanceSection = formData.get('advanceSection') as string | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const section =
    advanceSection && ADVANCE_SECTIONS.includes(advanceSection as (typeof ADVANCE_SECTIONS)[number])
      ? advanceSection
      : null;

  const ext = path.extname(file.name) || '';
  const storedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  await prisma.advanceFile.create({
    data: {
      tourDateId: dateId,
      advanceSection: section,
      filename: file.name,
      storedName,
      mimeType: file.type || null,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ ok: true });
}
