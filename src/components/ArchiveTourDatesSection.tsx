'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { TourDateCard, type TourDateCardModel } from '@/components/TourDateCard';
import { canOpenDateId } from '@/lib/tour-date-access-shared';

/** ISO date strings — safe across server → client boundary */
export type ArchiveTourDatePayload = Omit<TourDateCardModel, 'date' | 'endDate'> & {
  date: string;
  endDate: string | null;
};

export function ArchiveTourDatesSection({
  tourId,
  dates,
  dateOpenAccess,
}: {
  tourId: string;
  dates: ArchiveTourDatePayload[];
  dateOpenAccess: { openAllDates: boolean; openDateIds: Set<string> };
}) {
  const [expanded, setExpanded] = useState(false);
  const count = dates.length;

  return (
    <section className="border border-stage-border rounded-lg bg-stage-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stage-surface/60 transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
          <History className="h-4 w-4 shrink-0" />
          Past dates
          <span className="text-xs font-normal text-stage-muted">({count})</span>
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-stage-muted shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-stage-muted shrink-0" aria-hidden />
        )}
      </button>
      {expanded ? (
        <div className="px-4 pb-4 pt-0 border-t border-stage-border">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pt-4">
            {dates.map((d) => (
              <TourDateCard
                key={d.id}
                tourId={tourId}
                date={d}
                canOpenDetail={canOpenDateId(dateOpenAccess, d.id)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
