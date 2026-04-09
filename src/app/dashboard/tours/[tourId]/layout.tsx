import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { getTourWithDatesOrdered } from '@/lib/cached-tour-dashboard';
import { canBypassTourAssignment, getViewerAssignedTourIds } from '@/lib/viewer-access';
import { getCachedTourDateAccess, canOpenDateId } from '@/lib/tour-date-access';
import { TourDatesSidebar } from '@/components/TourDatesSidebar';
import { tourDateDisplayName } from '@/lib/tour-date-display';

export default async function TourLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tourId: string }>;
}) {
  const session = await getCachedSession();
  const { tourId } = await params;
  const role = (session?.user as { role?: string })?.role;
  const bypassAssignment = canBypassTourAssignment(role);

  const [tour] = await Promise.all([
    getTourWithDatesOrdered(tourId),
    bypassAssignment || !session?.user?.id
      ? Promise.resolve()
      : getViewerAssignedTourIds(session.user.id).then((ids) => {
          if (!ids.includes(tourId)) redirect('/dashboard/tours');
        }),
  ]);
  if (!tour) redirect('/dashboard/tours');

  const dateAccess = session?.user?.id
    ? await getCachedTourDateAccess(session.user.id, role, tourId)
    : { openAllDates: false, openDateIds: new Set<string>() };

  const dates = tour.dates.map((d) => ({
      id: d.id,
      venueName: d.venueName,
      city: d.city,
      date: d.date.toISOString(),
      endDate: d.endDate?.toISOString() ?? null,
      kind: d.kind,
      address: d.address,
      advanceComplete: d.advanceComplete,
      label: tourDateDisplayName({ name: d.name, venueName: d.venueName, city: d.city }),
      canOpenDetail: canOpenDateId(dateAccess, d.id),
    }));

  return (
    <>
      <div className="flex-1 min-w-0">{children}</div>
      <TourDatesSidebar tourId={tourId} tourName={tour.name} dates={dates} />
    </>
  );
}
