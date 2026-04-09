import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Tour + ordered dates for dashboard tour layout and date subpages.
 * Wrapped in React `cache()` so layout + page in the same RSC request share one DB round-trip.
 */
export const getTourWithDatesOrdered = cache(async (tourId: string) => {
  return prisma.tour.findUnique({
    where: { id: tourId },
    include: { dates: { orderBy: { date: 'asc' } } },
  });
});
