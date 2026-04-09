import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { getTourWithDatesOrdered } from '@/lib/cached-tour-dashboard';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateInfo } from '@/components/DateInfo';
import { DateNavTabs } from '@/components/DateNavTabs';
import { TasksContent } from '@/components/TasksContent';
import { canEdit, canAccessAdvance, canEditAdvance, canViewTasks } from '@/lib/session';
import { isReadyForAdvanceComplete } from '@/lib/advance-complete';
import { advanceSelectForComplete } from '@/lib/advance-for-complete';
import {
  cachedUserCanOpenTourDateDetail,
  getCachedTourDateAccess,
  adjacentOpenTourDates,
} from '@/lib/tour-date-access';

export default async function DateTasksPage({
  params,
}: {
  params: Promise<{ tourId: string; dateId: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const { tourId, dateId } = await params;

  const role = (session.user as { role?: string }).role;
  if (!canViewTasks(role)) {
    redirect(`/dashboard/tours/${tourId}/dates/${dateId}`);
  }
  const allowEditTourMeta = canEdit(role);
  const allowAdvance = canAccessAdvance(role);
  const allowTaskEdit = canEditAdvance(role);

  const [tour, , contacts, travelingGroup, taskRows, advanceForComplete] = await Promise.all([
    getTourWithDatesOrdered(tourId),
    cachedUserCanOpenTourDateDetail(session.user.id, role, tourId, dateId).then((ok) => {
      if (!ok) redirect(`/dashboard/tours/${tourId}?noDateAccess=1`);
    }),
    prisma.contact.findMany({
      where: { tourId, OR: [{ tourDateId: null }, { tourDateId: dateId }] },
      orderBy: { name: 'asc' },
    }),
    prisma.travelGroupMember.findMany({
      where: { tourId },
      orderBy: { name: 'asc' },
    }),
    prisma.tourDateTask.findMany({
      where: { tourDateId: dateId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.advance.findUnique({
      where: { tourDateId: dateId },
      select: advanceSelectForComplete,
    }),
  ]);
  if (!tour) redirect('/dashboard');

  const selectedDate = tour.dates.find((d) => d.id === dateId);
  if (!selectedDate) redirect(`/dashboard/tours/${tourId}`);

  const advanceReady = isReadyForAdvanceComplete(
    advanceForComplete,
    canViewTasks(role) ? taskRows : []
  );
  const initialTasks = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    done: t.done,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
  }));

  const dateAccess = session.user.id
    ? await getCachedTourDateAccess(session.user.id, role, tourId)
    : { openAllDates: false, openDateIds: new Set<string>() };
  const { prev: prevDate, next: nextDate } = adjacentOpenTourDates(tour.dates, dateId, dateAccess);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
        <Link
          href={`/dashboard/tours/${tourId}`}
          className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-neonCyan transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {tour.name}
        </Link>
        {(prevDate || nextDate) && (
          <nav className="flex items-center gap-3">
            {prevDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${prevDate.id}/tasks`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-stage-neonCyan transition-colors text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${nextDate.id}/tasks`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-stage-neonCyan transition-colors text-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </nav>
        )}
      </div>

      <DateInfo
        tourId={tourId}
        dateId={dateId}
        dateName={selectedDate.name}
        linkedVenueId={selectedDate.venueId}
        venueName={selectedDate.venueName}
        city={selectedDate.city}
        date={selectedDate.date.toISOString()}
        endDate={selectedDate.endDate?.toISOString() ?? null}
        kind={selectedDate.kind}
        status={selectedDate.status}
        address={selectedDate.address}
        promoterName={selectedDate.promoterName}
        promoterPhone={selectedDate.promoterPhone}
        promoterEmail={selectedDate.promoterEmail}
        allowEdit={allowEditTourMeta}
        allowAdvanceComplete={allowTaskEdit}
        advanceComplete={selectedDate.advanceComplete}
        advanceReady={advanceReady}
        contacts={contacts}
        travelingGroup={travelingGroup.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          subgroup: m.subgroup,
          phone: m.phone,
          email: m.email,
        }))}
        hideAllTourMessage={role === 'viewer'}
      />

      <DateNavTabs
        tourId={tourId}
        dateId={dateId}
        active="tasks"
        allowAdvance={allowAdvance}
        showTasks={canViewTasks(role)}
      />

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Tasks</h2>
        <p className="text-stage-muted text-sm mb-6">
          Quick checklist for this date (calls, parking, reminders). Power users and editors can add and complete tasks.
        </p>
        <TasksContent tourId={tourId} dateId={dateId} initialTasks={initialTasks} allowEdit={allowTaskEdit} />
      </div>
    </div>
  );
}
