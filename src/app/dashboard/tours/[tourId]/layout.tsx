import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasExtendedAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

const TourDatesSidebar = dynamic(
  () => import('@/components/TourDatesSidebar').then((m) => ({ default: m.TourDatesSidebar })),
  { ssr: false }
);

export default async function TourLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tourId: string }>;
}) {
  const session = await getSession();
  const { tourId } = await params;
  const role = (session?.user as { role?: string })?.role;
  const extendedAccess = hasExtendedAccess(role);
  if (!extendedAccess && session?.user?.id) {
    const viewerTourIds = await getViewerAssignedTourIds(session.user.id);
    if (!viewerTourIds.includes(tourId)) redirect('/dashboard/tours');
  }
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: { dates: { orderBy: { date: 'asc' } } },
  });
  if (!tour) redirect('/dashboard/tours');

  const dates = tour.dates.map((d) => ({
    id: d.id,
    venueName: d.venueName,
    city: d.city,
    date: d.date.toISOString(),
    endDate: d.endDate?.toISOString() ?? null,
    kind: d.kind,
    address: d.address,
  }));

  return (
    <>
      <div className="flex-1 min-w-0">{children}</div>
      <TourDatesSidebar tourId={tourId} tourName={tour.name} dates={dates} />
    </>
  );
}
