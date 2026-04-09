import { prisma } from '@/lib/prisma';

/**
 * Full-catalog staff: see all projects/tours and edit tour data (booking firm + platform).
 * Legacy `editor` rows are still honored until migrated.
 */
export function hasFullTourCatalogAccess(role: string | undefined): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'editor';
}

/**
 * Same as full catalog — may open any tour/date by URL without traveling-group assignment.
 */
export function canBypassTourAssignment(role: string | undefined): boolean {
  return hasFullTourCatalogAccess(role);
}

/**
 * Linked User has access beyond a plain viewer (tour power_user or full-catalog staff).
 */
export function isElevatedLinkedAccount(role: string | undefined): boolean {
  return role === 'power_user' || hasFullTourCatalogAccess(role);
}

/**
 * Returns tour IDs the viewer can access.
 * Viewers are assigned to tours via TravelGroupMember (their Person is on the tour).
 */
export async function getViewerAssignedTourIds(userId: string): Promise<string[]> {
  const members = await prisma.travelGroupMember.findMany({
    where: { person: { userId } },
    select: { tourId: true },
  });
  return members.map((m) => m.tourId);
}

/** Tour detail / APIs: full-catalog staff see any tour; others only if on traveling group for that tour. */
export async function userMayAccessTour(
  userId: string | undefined,
  role: string | undefined,
  tourId: string
): Promise<boolean> {
  if (!userId) return false;
  if (canBypassTourAssignment(role)) return true;
  const ids = await getViewerAssignedTourIds(userId);
  return ids.includes(tourId);
}

/** Project detail / APIs: full-catalog staff see any project; others only if they have at least one assigned tour in it. */
export async function userMayAccessProject(
  userId: string | undefined,
  role: string | undefined,
  projectId: string
): Promise<boolean> {
  if (!userId) return false;
  if (hasFullTourCatalogAccess(role)) return true;
  const assigned = await getViewerAssignedTourIds(userId);
  if (assigned.length === 0) return false;
  const n = await prisma.tour.count({
    where: { projectId, id: { in: assigned } },
  });
  return n > 0;
}
