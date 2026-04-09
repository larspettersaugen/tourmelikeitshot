import { prisma } from '@/lib/prisma';

/** Sum ticket counts for a date, optionally excluding one entry (for PATCH). */
export async function sumGuestListTicketsForDate(tourDateId: string, excludeEntryId?: string): Promise<number> {
  const rows = await prisma.tourDateGuestListEntry.findMany({
    where: excludeEntryId ? { tourDateId, NOT: { id: excludeEntryId } } : { tourDateId },
    select: { ticketCount: true },
  });
  return rows.reduce((s, r) => s + r.ticketCount, 0);
}
