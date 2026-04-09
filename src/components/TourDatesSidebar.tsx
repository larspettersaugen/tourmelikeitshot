'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { Calendar, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { AdvanceCompleteGreenLight } from '@/components/AdvanceCompleteGreenLight';
import { format } from 'date-fns';
import { useTourDatesSidebar } from '@/contexts/TourDatesSidebarContext';
import { getDateKindLabel } from '@/lib/date-kind';
import { isTourDateUpcomingOrToday } from '@/lib/tour-date-upcoming';

type TourDate = {
  id: string;
  venueName: string;
  city: string;
  date: string;
  endDate?: string | null;
  kind?: string | null;
  address: string | null;
  advanceComplete?: boolean;
  /** Precomputed list label (name or venue + city) */
  label: string;
  /** When false, show in calendar but do not link to the date page */
  canOpenDetail?: boolean;
};

export function TourDatesSidebar({
  tourId,
  tourName,
  dates,
}: {
  tourId: string;
  tourName: string;
  dates: TourDate[];
}) {
  const tourDatesSidebar = useTourDatesSidebar();
  const collapsed = tourDatesSidebar?.rightSidebarCollapsed ?? false;
  const setCollapsed = tourDatesSidebar?.setRightSidebarCollapsed ?? (() => {});
  const pathname = usePathname();
  const dateIdsKey = dates.map((d) => d.id).join('|');
  const activeDateId = useMemo(() => {
    const raw = pathname.match(/\/dates\/([^/]+)/)?.[1] ?? null;
    if (!raw || raw === 'new') return null;
    return dateIdsKey.split('|').includes(raw) ? raw : null;
  }, [pathname, dateIdsKey]);
  const navRef = useRef<HTMLElement>(null);

  /** Default: first upcoming/today row at top (past rows above, revealed by scrolling up). On a date page, scroll that row into view. */
  useEffect(() => {
    if (!navRef.current || collapsed) return;
    const nav = navRef.current;

    const run = () => {
      if (activeDateId) {
        nav.querySelector<HTMLAnchorElement>(`a[data-tour-date-id="${activeDateId}"]`)?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
        return;
      }
      const upcomingIdx = dates.findIndex((d) =>
        isTourDateUpcomingOrToday({
          date: new Date(d.date),
          endDate: d.endDate ? new Date(d.endDate) : null,
        })
      );
      const targetIdx = upcomingIdx >= 0 ? upcomingIdx : Math.max(0, dates.length - 1);
      const id = dates[targetIdx]?.id;
      if (!id) return;
      nav.querySelector<HTMLAnchorElement>(`a[data-tour-date-id="${id}"]`)?.scrollIntoView({
        block: 'start',
      });
    };

    requestAnimationFrame(run);
  }, [pathname, activeDateId, collapsed, dates]);

  return (
    <div
      className={`hidden lg:flex lg:fixed lg:top-0 lg:bottom-0 lg:right-0 lg:z-20 lg:flex-col transition-[width] duration-200 shrink-0 ${
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'
      }`}
      onWheel={(e) => {
        const t = e.target as Node;
        if (e.currentTarget.querySelector('[data-tour-sidebar-scroll]')?.contains(t)) return;
        e.preventDefault();
      }}
    >
        <aside
          className="flex flex-col h-full min-h-0 overflow-hidden border-l border-stage-border bg-stage-card w-full"
          aria-label="Tour dates"
        >
          <div
            className={`shrink-0 border-b border-stage-border flex items-center ${collapsed ? 'p-3 justify-center' : 'p-4'}`}
          >
            <div
              className={`flex items-center text-white font-semibold ${collapsed ? 'justify-center' : 'gap-2 truncate'}`}
            >
              <Calendar className="h-6 w-6 shrink-0 text-stage-neonCyan" />
              {!collapsed && <span className="truncate">{tourName}</span>}
            </div>
          </div>
          <nav
            ref={navRef}
            data-tour-sidebar-scroll
            className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain flex flex-col gap-1 ${collapsed ? 'p-2 items-center' : 'p-3'}`}
          >
            {dates.map((date) => {
              const href = `/dashboard/tours/${tourId}/dates/${date.id}`;
              const isActive = date.id === activeDateId;
              const canOpen = date.canOpenDetail !== false;
              const navTitle =
                collapsed
                  ? `${date.advanceComplete ? 'Advance complete (green light) · ' : ''}${getDateKindLabel(date.kind)}: ${date.label}`
                  : undefined;
              const rowClass = `flex items-center rounded-lg text-sm transition shrink-0 ${
                collapsed ? 'p-2.5 justify-center' : 'gap-3 px-3 py-2.5'
              } ${
                isActive ? 'bg-stage-neonCyan/10 text-stage-neonCyan border border-stage-neonCyan/30' : 'text-stage-muted hover:text-stage-neonCyan hover:bg-stage-surface/50'
              }`;
              const rowInner = (
                <>
                  {!collapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{date.label}</span>
                          {date.advanceComplete ? (
                            <span className="shrink-0 pt-0.5" title="Advance complete">
                              <AdvanceCompleteGreenLight />
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-stage-muted truncate">
                          {getDateKindLabel(date.kind)} · {date.endDate
                            ? `${format(new Date(date.date), 'EEE MMM d')} – ${format(new Date(date.endDate), 'EEE MMM d')}`
                            : format(new Date(date.date), 'EEE MMM d')}
                        </p>
                      </div>
                      {isActive && canOpen && <span className="text-stage-accent">•</span>}
                    </>
                  ) : (
                    <span className="text-xs font-medium w-6 text-center flex flex-col items-center gap-0.5">
                      <span>{format(new Date(date.date), 'd')}</span>
                      {date.advanceComplete ? (
                        <AdvanceCompleteGreenLight className="scale-90" label="Advance complete" />
                      ) : null}
                    </span>
                  )}
                </>
              );
              return canOpen ? (
                <Link
                  key={date.id}
                  href={href}
                  data-tour-date-id={date.id}
                  title={navTitle}
                  className={rowClass}
                >
                  {rowInner}
                </Link>
              ) : (
                <div
                  key={date.id}
                  data-tour-date-id={date.id}
                  title={
                    navTitle
                      ? `${navTitle} — not assigned to this date`
                      : 'Not assigned to this date — open the tour to see it on the calendar only'
                  }
                  className={`${rowClass} cursor-not-allowed opacity-70`}
                >
                  {rowInner}
                </div>
              );
            })}
          </nav>
        </aside>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-4 bottom-8 z-10 h-10 w-10 flex items-center justify-center rounded-full border-2 border-stage-border bg-stage-card text-stage-muted hover:text-stage-accent hover:border-stage-accent hover:bg-stage-surface shadow-lg"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
        </button>
      </div>
  );
}
