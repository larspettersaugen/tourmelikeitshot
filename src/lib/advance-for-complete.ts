import type { Prisma } from '@prisma/client';

/** Load only fields needed for `isReadyForAdvanceComplete` (include on every advance fetch used for that check). */
export const advanceSelectForComplete: Prisma.AdvanceSelect = {
  technicalDone: true,
  riderDone: true,
  logisticsDone: true,
  equipmentTransportDone: true,
  customFields: { select: { done: true } },
};
