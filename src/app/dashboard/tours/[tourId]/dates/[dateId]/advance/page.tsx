import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { getTourWithDatesOrdered } from '@/lib/cached-tour-dashboard';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateInfo } from '@/components/DateInfo';
import { DateNavTabs } from '@/components/DateNavTabs';
import { AdvanceContent } from '@/components/AdvanceContent';
import { canEdit, canEditAdvance, canAccessAdvance, canViewTasks } from '@/lib/session';
import { isReadyForAdvanceComplete } from '@/lib/advance-complete';
import {
  cachedUserCanOpenTourDateDetail,
  getCachedTourDateAccess,
  adjacentOpenTourDates,
} from '@/lib/tour-date-access';

export default async function AdvancePage({
  params,
}: {
  params: Promise<{ tourId: string; dateId: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const { tourId, dateId } = await params;

  const sessionRole = (session.user as { role?: string }).role;

  const allowAdvance = canAccessAdvance(sessionRole);
  if (!allowAdvance) redirect(`/dashboard/tours/${tourId}/dates/${dateId}`);

  const [tour, , advance, advanceFiles, contacts, travelingGroup, taskRowsForComplete] = await Promise.all([
    getTourWithDatesOrdered(tourId),
    cachedUserCanOpenTourDateDetail(session.user.id, sessionRole, tourId, dateId).then((ok) => {
      if (!ok) redirect(`/dashboard/tours/${tourId}?noDateAccess=1`);
    }),
    prisma.advance.findUnique({
      where: { tourDateId: dateId },
      include: {
        customFields: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.advanceFile.findMany({
      where: { tourDateId: dateId },
      orderBy: { createdAt: 'asc' },
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
      select: { done: true },
    }),
  ]);
  if (!tour) redirect('/dashboard');

  const selectedDate = tour.dates.find((d) => d.id === dateId);
  if (!selectedDate) redirect(`/dashboard/tours/${tourId}`);

  const advanceReady = isReadyForAdvanceComplete(
    advance,
    canViewTasks(sessionRole) ? taskRowsForComplete : []
  );

  const allowEdit = canEdit(sessionRole);
  const allowAdvanceEdit = canEditAdvance(sessionRole);

  const dateAccess = session.user.id
    ? await getCachedTourDateAccess(session.user.id, sessionRole, tourId)
    : { openAllDates: false, openDateIds: new Set<string>() };
  const { prev: prevDate, next: nextDate } = adjacentOpenTourDates(tour.dates, dateId, dateAccess);

  const advanceData = {
    technicalInfo: advance?.technicalInfo ?? null,
    rider: advance?.rider ?? null,
    logistics: advance?.logistics ?? null,
    equipmentTransport: advance?.equipmentTransport ?? null,
    technicalDone: advance?.technicalDone ?? false,
    technicalCompromises: advance?.technicalCompromises ?? false,
    riderDone: advance?.riderDone ?? false,
    riderCompromises: advance?.riderCompromises ?? false,
    logisticsDone: advance?.logisticsDone ?? false,
    logisticsCompromises: advance?.logisticsCompromises ?? false,
    equipmentTransportDone: advance?.equipmentTransportDone ?? false,
    equipmentTransportCompromises: advance?.equipmentTransportCompromises ?? false,
    customFields: (advance?.customFields ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body ?? '',
      done: c.done,
      compromises: c.compromises,
      sortOrder: c.sortOrder,
    })),
  };

  const files = advanceFiles.map((f) => ({
    id: f.id,
    filename: f.filename,
    advanceSection: f.advanceSection,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  }));

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
                href={`/dashboard/tours/${tourId}/dates/${prevDate.id}/advance`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-stage-neonCyan transition-colors text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${nextDate.id}/advance`}
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
        allowEdit={allowEdit}
        allowAdvanceComplete={allowAdvanceEdit}
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
        hideAllTourMessage={sessionRole === 'viewer'}
      />

      <DateNavTabs
        tourId={tourId}
        dateId={dateId}
        active="advance"
        allowAdvance={allowAdvance}
        showTasks={canViewTasks(sessionRole)}
      />

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Advance</h2>
        <p className="text-stage-muted text-sm mb-6">
          Technical and logistical information for this date. Share with venue or promoter.
        </p>
        <AdvanceContent
          tourId={tourId}
          dateId={dateId}
          initial={advanceData}
          files={files}
          allowEdit={allowAdvanceEdit}
          allowChecklistToggle={allowAdvanceEdit}
        />
      </div>
    </div>
  );
}
