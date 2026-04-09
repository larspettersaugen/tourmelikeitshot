/**
 * True if the tour date span ends on or after the start of the local calendar day (today).
 * Used for the main tour "Dates" list, past-dates section, and the tour dates sidebar.
 */
export function isTourDateUpcomingOrToday(d: { date: Date; endDate: Date | null }): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = d.endDate ?? d.date;
  return new Date(end) >= now;
}
