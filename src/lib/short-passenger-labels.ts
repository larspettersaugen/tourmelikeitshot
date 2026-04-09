/**
 * Compact labels for passenger lists (schedule, flights, transport): first name only,
 * or "First L." when two people share the same first name on the same leg.
 */
function parseNamePartsForShortLabel(fullName: string): {
  firstToken: string;
  surnameInitial: string | null;
} {
  const t = fullName.trim();
  if (!t) return { firstToken: '', surnameInitial: null };
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstToken: parts[0], surnameInitial: null };
  const surname = parts[parts.length - 1];
  const firstToken = parts[0];
  const ch = surname[0];
  const surnameInitial =
    ch && /[A-Za-z\u00C0-\u024F]/.test(ch) ? ch.toUpperCase() : null;
  return { firstToken, surnameInitial };
}

export function shortPassengerLabels(allFullNames: string[]): string[] {
  const parsed = allFullNames.map((full) => ({ full, ...parseNamePartsForShortLabel(full) }));
  const firstCounts = new Map<string, number>();
  for (const p of parsed) {
    if (!p.firstToken) continue;
    const key = p.firstToken.toLowerCase();
    firstCounts.set(key, (firstCounts.get(key) ?? 0) + 1);
  }
  return parsed.map((p) => {
    if (!p.firstToken) return p.full || '';
    const dup = (firstCounts.get(p.firstToken.toLowerCase()) ?? 0) > 1;
    if (dup) {
      if (p.surnameInitial) return `${p.firstToken} ${p.surnameInitial}.`;
      return p.full;
    }
    return p.firstToken;
  });
}
