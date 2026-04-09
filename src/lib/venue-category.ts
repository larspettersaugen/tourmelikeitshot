/** Matches Prisma enum `VenueCategory` — kept here so UI code does not import `@prisma/client`. */
export const VENUE_CATEGORIES = ['venue', 'festival'] as const;
export type VenueCategorySlug = (typeof VENUE_CATEGORIES)[number];

export const VENUE_CATEGORY_LABELS: Record<VenueCategorySlug, string> = {
  venue: 'Venue',
  festival: 'Festival',
};

export function isVenueCategory(value: unknown): value is VenueCategorySlug {
  return value === 'venue' || value === 'festival';
}
