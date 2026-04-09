import { prisma } from '@/lib/prisma';

export const STANDARD_ADVANCE_SECTIONS = ['technical', 'rider', 'logistics', 'equipmentTransport'] as const;
export type StandardAdvanceSection = (typeof STANDARD_ADVANCE_SECTIONS)[number];

export function customAdvanceSectionKey(fieldId: string): string {
  return `custom:${fieldId}`;
}

/** Validated section for AdvanceFile.advanceSection (standard slug or custom:&lt;fieldId&gt;). */
export async function normalizeAdvanceFileSection(
  advanceSection: string | null | undefined,
  tourDateId: string
): Promise<string | null> {
  if (advanceSection == null || advanceSection === '') return null;
  if (STANDARD_ADVANCE_SECTIONS.includes(advanceSection as StandardAdvanceSection)) {
    return advanceSection;
  }
  const prefix = 'custom:';
  if (!advanceSection.startsWith(prefix)) return null;
  const fieldId = advanceSection.slice(prefix.length);
  if (!fieldId) return null;
  const field = await prisma.advanceCustomField.findFirst({
    where: { id: fieldId, advance: { tourDateId } },
    select: { id: true },
  });
  return field ? advanceSection : null;
}
