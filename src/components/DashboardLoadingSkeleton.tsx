/** Instant loading UI for App Router `loading.tsx` boundaries (theme-aligned, no client JS). */

export function DashboardLoadingSkeleton() {
  return (
    <div
      className="w-full max-w-6xl mx-auto p-6 lg:p-8 animate-pulse space-y-6"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-5 w-36 rounded-md bg-stage-surface" />
      <div className="h-10 max-w-md rounded-lg bg-stage-card border border-stage-border" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-28 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04]" />
        <div className="h-28 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04]" />
        <div className="h-28 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] sm:col-span-2 xl:col-span-1" />
      </div>
      <div className="h-40 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04]" />
    </div>
  );
}

/** Matches day / tasks / advance / files layout (header + info + tabs + card). */
export function TourDateLoadingSkeleton() {
  return (
    <div
      className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-24 lg:pb-8 animate-pulse space-y-6"
      role="status"
      aria-label="Loading date"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-5 w-44 rounded-md bg-stage-surface" />
        <div className="h-5 w-28 rounded-md bg-stage-surface" />
      </div>
      <div className="h-36 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04]" />
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-16 rounded-lg bg-stage-surface" />
        <div className="h-9 w-20 rounded-lg bg-stage-surface" />
        <div className="h-9 w-14 rounded-lg bg-stage-surface" />
        <div className="h-9 w-16 rounded-lg bg-stage-surface" />
      </div>
      <div className="min-h-[240px] rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6">
        <div className="h-6 w-32 rounded-md bg-stage-surface mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-stage-surface/80" />
          <div className="h-4 w-11/12 rounded bg-stage-surface/80" />
          <div className="h-4 w-4/5 rounded bg-stage-surface/80" />
        </div>
      </div>
    </div>
  );
}
