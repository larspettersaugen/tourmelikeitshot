import { format } from 'date-fns';

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

/**
 * True if `day`'s local calendar day falls within the tour span [date, endDate] (inclusive).
 * Used for "today's shows" sections on dashboards.
 */
export function isTourDateOnLocalCalendarDay(
  d: { date: Date; endDate: Date | null },
  day: Date = new Date()
): boolean {
  const startKey = format(new Date(d.date), 'yyyy-MM-dd');
  const endKey = format(new Date(d.endDate ?? d.date), 'yyyy-MM-dd');
  const dayKey = format(day, 'yyyy-MM-dd');
  return dayKey >= startKey && dayKey <= endKey;
}
