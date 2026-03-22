import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateInfo } from '@/components/DateInfo';
import { DateNavTabs } from '@/components/DateNavTabs';
import { AdvanceContent } from '@/components/AdvanceContent';
import { canEdit, canAccessAdvance } from '@/lib/session';
import { cleanupOrphanedTravelGroupMembers } from '@/lib/traveling-group';

export default async function AdvancePage({
  params,
}: {
  params: Promise<{ tourId: string; dateId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  const { tourId, dateId } = await params;

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: { dates: { orderBy: { date: 'asc' } } },
  });
  if (!tour) redirect('/dashboard');

  const selectedDate = tour.dates.find((d) => d.id === dateId);
  if (!selectedDate) redirect(`/dashboard/tours/${tourId}`);

  const advance = await prisma.advance.findUnique({
    where: { tourDateId: dateId },
  });

  const advanceFiles = await prisma.advanceFile.findMany({
    where: { tourDateId: dateId },
    orderBy: { createdAt: 'asc' },
  });

  const contacts = await prisma.contact.findMany({
    where: { tourId, OR: [{ tourDateId: null }, { tourDateId: dateId }] },
    orderBy: { name: 'asc' },
  });

  await cleanupOrphanedTravelGroupMembers(tourId);
  const travelingGroup = await prisma.travelGroupMember.findMany({
    where: { tourId },
    orderBy: { name: 'asc' },
  });

  const allowEdit = canEdit((session.user as { role?: string }).role);
  const allowAdvance = canAccessAdvance((session.user as { role?: string }).role);
  if (!allowAdvance) redirect(`/dashboard/tours/${tourId}/dates/${dateId}`);

  const currentIndex = tour.dates.findIndex((d) => d.id === dateId);
  const prevDate = currentIndex > 0 ? tour.dates[currentIndex - 1] : null;
  const nextDate = currentIndex >= 0 && currentIndex < tour.dates.length - 1 ? tour.dates[currentIndex + 1] : null;

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
          className="inline-flex items-center gap-2 text-stage-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> {tour.name}
        </Link>
        {(prevDate || nextDate) && (
          <nav className="flex items-center gap-3">
            {prevDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${prevDate.id}/advance`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-white transition text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${nextDate.id}/advance`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-white transition text-sm"
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
        contacts={contacts}
        travelingGroup={travelingGroup.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          subgroup: m.subgroup,
          phone: m.phone,
          email: m.email,
        }))}
        hideAllTourMessage={(session.user as { role?: string }).role === 'viewer'}
      />

      <DateNavTabs tourId={tourId} dateId={dateId} active="advance" allowAdvance={allowAdvance} />

      <div className="rounded-xl bg-stage-card border border-stage-border p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Advance</h2>
        <p className="text-stage-muted text-sm mb-6">
          Technical and logistical information for this date. Share with venue or promoter.
        </p>
        <AdvanceContent
          tourId={tourId}
          dateId={dateId}
          initial={advanceData}
          files={files}
          allowEdit={allowEdit}
        />
      </div>
    </div>
  );
}
