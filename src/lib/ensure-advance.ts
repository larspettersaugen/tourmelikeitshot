import { prisma } from '@/lib/prisma';

export async function getOrCreateAdvanceId(tourDateId: string): Promise<string> {
  const existing = await prisma.advance.findUnique({ where: { tourDateId } });
  if (existing) return existing.id;
  const created = await prisma.advance.create({ data: { tourDateId } });
  return created.id;
}
