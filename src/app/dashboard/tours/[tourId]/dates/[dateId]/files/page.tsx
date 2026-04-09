import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { getTourWithDatesOrdered } from '@/lib/cached-tour-dashboard';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateInfo } from '@/components/DateInfo';
import { DateNavTabs } from '@/components/DateNavTabs';
import { DayFilesSection } from '@/components/DayFilesSection';
import { canEdit, canAccessAdvance, canEditAdvance, canViewTasks } from '@/lib/session';
import { isReadyForAdvanceComplete } from '@/lib/advance-complete';
import { advanceSelectForComplete } from '@/lib/advance-for-complete';
import { customAdvanceSectionKey } from '@/lib/advance-file-section';
import {
  cachedUserCanOpenTourDateDetail,
  getCachedTourDateAccess,
  adjacentOpenTourDates,
} from '@/lib/tour-date-access';

export default async function DateFilesPage({
  params,
}: {
  params: Promise<{ tourId: string; dateId: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const { tourId, dateId } = await params;

  const role = (session.user as { role?: string }).role;

  const [tour, , advanceFiles, contacts, travelingGroup, advanceForComplete, customFieldLabels, taskRowsForComplete] =
    await Promise.all([
    getTourWithDatesOrdered(tourId),
    cachedUserCanOpenTourDateDetail(session.user.id, role, tourId, dateId).then((ok) => {
      if (!ok) redirect(`/dashboard/tours/${tourId}?noDateAccess=1`);
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
    prisma.advance.findUnique({
      where: { tourDateId: dateId },
      select: advanceSelectForComplete,
    }),
    prisma.advanceCustomField.findMany({
      where: { advance: { tourDateId: dateId } },
      select: { id: true, title: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.tourDateTask.findMany({
      where: { tourDateId: dateId },
      select: { done: true },
    }),
  ]);

  if (!tour) redirect('/dashboard');

  const selectedDate = tour.dates.find((d) => d.id === dateId);
  if (!selectedDate) redirect(`/dashboard/tours/${tourId}`);

  const advanceSectionLabels: Record<string, string> = Object.fromEntries(
    customFieldLabels.map((c) => [customAdvanceSectionKey(c.id), c.title])
  );

  const sessionRole = (session.user as { role?: string }).role;
  const allowEdit = canEdit(sessionRole);
  const advanceReady = isReadyForAdvanceComplete(
    advanceForComplete,
    canViewTasks(sessionRole) ? taskRowsForComplete : []
  );

  const dateAccess = session.user.id
    ? await getCachedTourDateAccess(session.user.id, role, tourId)
    : { openAllDates: false, openDateIds: new Set<string>() };
  const { prev: prevDate, next: nextDate } = adjacentOpenTourDates(tour.dates, dateId, dateAccess);

  const allowAdvanceAccess = canAccessAdvance(sessionRole);
  const files = allowAdvanceAccess
    ? advanceFiles.map((f) => ({
        id: f.id,
        filename: f.filename,
        advanceSection: f.advanceSection,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt.toISOString(),
      }))
    : [];

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
                href={`/dashboard/tours/${tourId}/dates/${prevDate.id}/files`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-stage-neonCyan transition-colors text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${nextDate.id}/files`}
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
        allowAdvanceComplete={canEditAdvance(sessionRole)}
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
        active="files"
        allowAdvance={allowAdvanceAccess}
        showTasks={canViewTasks(sessionRole)}
      />

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6">
        <DayFilesSection
          tourId={tourId}
          dateId={dateId}
          files={files}
          allowEdit={allowEdit}
          sectionLabelExtra={advanceSectionLabels}
        />
      </div>
    </div>
  );
}
