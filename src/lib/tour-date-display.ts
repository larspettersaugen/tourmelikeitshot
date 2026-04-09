/** Primary label for a tour date in lists and headers. */
export function tourDateDisplayName(d: {
  name?: string | null;
  venueName: string;
  city: string;
}): string {
  const n = d.name?.trim();
  if (n) return n;
  return `${d.venueName}, ${d.city}`;
}
