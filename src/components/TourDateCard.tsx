import Link from 'next/link';
import { format } from 'date-fns';
import { AdvanceCompleteGreenLight } from '@/components/AdvanceCompleteGreenLight';
import { ShowStatusBadge } from '@/components/ShowStatusBadge';
import { getStatusCardClasses } from '@/lib/show-status';
import { getDateKindLabel } from '@/lib/date-kind';
import { tourDateDisplayName } from '@/lib/tour-date-display';

export type TourDateCardModel = {
  id: string;
  name: string | null;
  venueName: string;
  city: string;
  date: Date | string;
  endDate: Date | string | null;
  kind: string;
  status: string;
  advanceComplete: boolean;
};

export function TourDateCard({
  tourId,
  date,
  canOpenDetail = true,
}: {
  tourId: string;
  date: TourDateCardModel;
  /** When false, date is visible on the tour but this user is not assigned to the date (calendar-only). */
  canOpenDetail?: boolean;
}) {
  const customName = date.name?.trim() ?? '';
  const venue = date.venueName.trim();
  const city = date.city.trim();

  let primaryTitle: string;
  let secondaryLine: string | null = null;

  if (customName) {
    primaryTitle = customName;
    secondaryLine = city || null;
  } else if (venue) {
    primaryTitle = venue;
    secondaryLine = city || null;
  } else if (city) {
    primaryTitle = city;
  } else {
    primaryTitle = tourDateDisplayName({ name: null, venueName: date.venueName, city: date.city });
  }

  const cardClasses = `flex items-center justify-between p-4 rounded-lg border transition ${getStatusCardClasses(date.status)}`;
  const inner = (
    <>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-white min-w-0">
              {primaryTitle}
            </p>
            {date.advanceComplete ? (
              <span className="flex items-center gap-1.5 shrink-0" title="Advance complete — green light on">
                <AdvanceCompleteGreenLight />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90 hidden sm:inline">
                  OK
                </span>
              </span>
            ) : null}
            <span className="text-xs text-stage-muted bg-stage-surface px-1.5 py-0.5 rounded">
              {getDateKindLabel(date.kind)}
            </span>
          </div>
          {secondaryLine ? (
            <p className="text-xs text-stage-muted truncate" title={secondaryLine}>
              {secondaryLine}
            </p>
          ) : null}
          <div>
            <ShowStatusBadge status={date.status} />
          </div>
          <p className="text-sm text-stage-muted">
            {date.endDate
              ? `${format(new Date(date.date), 'EEE MMM d')} – ${format(new Date(date.endDate), 'EEE MMM d, yyyy')}`
              : format(new Date(date.date), 'EEE MMM d, yyyy')}
          </p>
        </div>
        <span className="text-stage-muted">{canOpenDetail ? '→' : '—'}</span>
    </>
  );

  return (
    <li>
      {canOpenDetail ? (
        <Link href={`/dashboard/tours/${tourId}/dates/${date.id}`} className={cardClasses}>
          {inner}
        </Link>
      ) : (
        <div
          className={`${cardClasses} cursor-not-allowed opacity-80`}
          title="You are not assigned to this date. Ask a tour editor to add you to the date to open it."
        >
          {inner}
        </div>
      )}
    </li>
  );
}
