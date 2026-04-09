/**
 * Pure tour-date access helpers (no Prisma). Safe to import from client components.
 * Server-only DB logic lives in `tour-date-access.ts`.
 */

export function canOpenDateId(
  access: { openAllDates: boolean; openDateIds: Set<string> },
  dateId: string
): boolean {
  return access.openAllDates || access.openDateIds.has(dateId);
}

/** Previous/next date in tour order that the user may open (for prev/next nav). */
export function adjacentOpenTourDates(
  orderedDates: { id: string }[],
  currentDateId: string,
  access: { openAllDates: boolean; openDateIds: Set<string> }
): { prev: { id: string } | null; next: { id: string } | null } {
  const currentIndex = orderedDates.findIndex((d) => d.id === currentDateId);
  if (currentIndex < 0) return { prev: null, next: null };

  let prev: { id: string } | null = null;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const d = orderedDates[i];
    if (canOpenDateId(access, d.id)) {
      prev = d;
      break;
    }
  }
  let next: { id: string } | null = null;
  for (let i = currentIndex + 1; i < orderedDates.length; i++) {
    const d = orderedDates[i];
    if (canOpenDateId(access, d.id)) {
      next = d;
      break;
    }
  }
  return { prev, next };
}
