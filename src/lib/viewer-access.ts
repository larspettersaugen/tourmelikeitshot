import { prisma } from '@/lib/prisma';

/** Power user, editor, admin see everything. Viewers only see tours they're assigned to (via TravelGroupMember). */
export function hasExtendedAccess(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor' || role === 'power_user';
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
