/** Full display name for sorting, search, and legacy consumers. */
export function composePersonName(
  first: string,
  middle: string | null | undefined,
  last: string
): string {
  const f = first.trim();
  const m = middle?.trim();
  const l = last.trim();
  const parts: string[] = [];
  if (f) parts.push(f);
  if (m) parts.push(m);
  if (l) parts.push(l);
  return parts.join(' ');
}

/** Split a legacy full name into parts: first token, last token, middle = between. */
export function splitLegacyName(full: string): {
  firstName: string;
  middleName: string | null;
  lastName: string;
} {
  const t = full.trim().replace(/\s+/g, ' ');
  if (!t) return { firstName: '', middleName: null, lastName: '' };
  const parts = t.split(' ');
  if (parts.length === 1) return { firstName: parts[0], middleName: null, lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: null, lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' ') || null,
    lastName: parts[parts.length - 1],
  };
}
