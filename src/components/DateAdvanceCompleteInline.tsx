'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * Current-date advance complete checkbox (no date picker) — sits beside Edit in DateInfo.
 */
export function DateAdvanceCompleteInline({
  tourId,
  dateId,
  advanceComplete,
  ready,
  allowConfirm,
}: {
  tourId: string;
  dateId: string;
  advanceComplete: boolean;
  ready: boolean;
  allowConfirm: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!allowConfirm) return null;

  const disabled = busy || (!advanceComplete && !ready);

  const title = advanceComplete
    ? 'Uncheck to clear advance complete (removes green light from tour list).'
    : !ready
      ? 'Every advance section must be Done and every task completed first.'
      : 'Check to mark advance complete for this date.';

  async function setComplete(next: boolean) {
    setError('');
    setBusy(true);
    try {
      await api.dates.setAdvanceComplete(tourId, dateId, next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 max-w-[min(100%,220px)] sm:max-w-[260px]">
      <label
        className={`flex items-center gap-2 rounded-lg border border-stage-border bg-stage-surface/80 px-2.5 py-1.5 ${
          !disabled ? 'cursor-pointer hover:border-emerald-500/35' : 'cursor-default'
        } ${advanceComplete ? 'border-emerald-500/35 bg-emerald-500/10' : ''}`}
      >
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-2 border-stage-fg/40 accent-emerald-600 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-stage-card disabled:opacity-45"
          checked={advanceComplete}
          disabled={disabled}
          title={title}
          onChange={(e) => {
            const on = e.target.checked;
            if (on && ready && !advanceComplete) void setComplete(true);
            if (!on && advanceComplete) void setComplete(false);
          }}
        />
        <span className="text-xs font-medium text-stage-fg leading-tight text-right">
          Advance complete
        </span>
      </label>
      {error ? (
        <p className="text-[10px] text-red-400 text-right max-w-full" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
