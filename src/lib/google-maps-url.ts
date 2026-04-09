/** Google Maps search URL for an address and/or city (opens in browser / app). */
export function googleMapsSearchUrl(address: string | null | undefined, city: string) {
  const q = [address?.trim(), city.trim()].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
