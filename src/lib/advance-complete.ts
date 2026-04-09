export type AdvanceDoneFlags = {
  technicalDone: boolean;
  riderDone: boolean;
  logisticsDone: boolean;
  equipmentTransportDone: boolean;
};

export type AdvanceForCompleteCheck = AdvanceDoneFlags & {
  customFields?: { done: boolean }[];
};

/** All standard + custom advance checklist "Done" flags are true (compromises don't block). */
export function areAllAdvanceSectionsDone(advance: AdvanceForCompleteCheck | null): boolean {
  if (!advance) return false;
  const standard =
    advance.technicalDone &&
    advance.riderDone &&
    advance.logisticsDone &&
    advance.equipmentTransportDone;
  const customs = advance.customFields ?? [];
  return standard && customs.every((c) => c.done);
}

/** Every task is done; dates with zero tasks count as satisfied. */
export function areAllTasksDone(tasks: { done: boolean }[]): boolean {
  if (tasks.length === 0) return true;
  return tasks.every((t) => t.done);
}

export function isReadyForAdvanceComplete(
  advance: AdvanceForCompleteCheck | null,
  tasks: { done: boolean }[]
): boolean {
  return areAllAdvanceSectionsDone(advance) && areAllTasksDone(tasks);
}
