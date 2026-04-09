import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { canBypassTourAssignment, hasFullTourCatalogAccess } from '@/lib/viewer-access';
import { canOpenDateId } from './tour-date-access-shared';

/**
 * Who may open a tour date detail page / date APIs:
 * - superadmin, admin, legacy editor: always
 * - Not on the tour traveling group: only if full-catalog staff (bypass); otherwise no access
 * - On the tour traveling group: only dates where they have TourDateMember for their TravelGroupMember row
 */
export async function userCanOpenTourDateDetail(
  userId: string | undefined,
  role: string | undefined,
  tourId: string,
  dateId: string
): Promise<boolean> {
  if (!userId) return false;
  if (hasFullTourCatalogAccess(role)) return true;

  const person = await prisma.person.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!person) {
    return canBypassTourAssignment(role);
  }

  const travelMember = await prisma.travelGroupMember.findFirst({
    where: { tourId, personId: person.id },
    select: { id: true },
  });
  if (!travelMember) {
    return canBypassTourAssignment(role);
  }

  const onDate = await prisma.tourDateMember.findFirst({
    where: { tourDateId: dateId, travelGroupMemberId: travelMember.id },
    select: { id: true },
  });
  return !!onDate;
}

/** Batch for sidebar / cards: which date IDs this user may open on this tour (empty set + openAll=false means none, except full-catalog staff handled separately). */
export async function getTourDateOpenDateIdsForUser(
  userId: string | undefined,
  role: string | undefined,
  tourId: string
): Promise<{ openAllDates: boolean; openDateIds: Set<string> }> {
  if (!userId) return { openAllDates: false, openDateIds: new Set() };
  if (hasFullTourCatalogAccess(role)) {
    return { openAllDates: true, openDateIds: new Set() };
  }

  const person = await prisma.person.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!person) {
    return { openAllDates: canBypassTourAssignment(role), openDateIds: new Set() };
  }

  const travelMember = await prisma.travelGroupMember.findFirst({
    where: { tourId, personId: person.id },
    select: { id: true },
  });
  if (!travelMember) {
    return { openAllDates: canBypassTourAssignment(role), openDateIds: new Set() };
  }

  const rows = await prisma.tourDateMember.findMany({
    where: { travelGroupMemberId: travelMember.id, tourDate: { tourId } },
    select: { tourDateId: true },
  });
  return {
    openAllDates: false,
    openDateIds: new Set(rows.map((r) => r.tourDateId)),
  };
}

/**
 * React-cached access set for RSC (layout + page share one set of DB lookups per request).
 * API routes must keep using `getTourDateOpenDateIdsForUser` directly.
 */
export const getCachedTourDateAccess = cache(
  (userId: string, role: string | undefined, tourId: string) =>
    getTourDateOpenDateIdsForUser(userId, role, tourId)
);

/**
 * Derive single-date access from the cached batch result (avoids 3 extra serial DB queries
 * that `userCanOpenTourDateDetail` would do).
 */
export async function cachedUserCanOpenTourDateDetail(
  userId: string | undefined,
  role: string | undefined,
  tourId: string,
  dateId: string
): Promise<boolean> {
  if (!userId) return false;
  if (hasFullTourCatalogAccess(role)) return true;
  const access = await getCachedTourDateAccess(userId, role, tourId);
  return canOpenDateId(access, dateId);
}

export { canOpenDateId, adjacentOpenTourDates } from './tour-date-access-shared';
