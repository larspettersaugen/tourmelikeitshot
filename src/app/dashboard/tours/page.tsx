import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ChevronRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { hasExtendedAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export default async function ToursListPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role;
  const extendedAccess = hasExtendedAccess(role);
  const viewerTourIds = extendedAccess ? null : session?.user?.id
    ? await getViewerAssignedTourIds(session.user.id)
    : [];

  const tourWhere = extendedAccess
    ? { projectId: { not: null } }
    : { id: { in: viewerTourIds ?? [] } };

  const tours = await prisma.tour.findMany({
    where: tourWhere,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { dates: true } },
    },
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">Tours</h1>
      <p className="text-stage-muted text-sm mb-6">All tours you can access. Open a tour for schedule, flights, and contacts.</p>
      {tours.length === 0 ? (
        <div className="rounded-xl bg-stage-card border border-stage-border p-8 text-center text-stage-muted">
          <p>No tours yet.</p>
          <p className="text-sm mt-2">Create a tour from an artist under Artists.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => (
            <li key={tour.id}>
              <Link
                href={`/dashboard/tours/${tour.id}`}
                className="flex flex-col justify-between p-5 rounded-lg bg-stage-card border border-stage-border hover:border-stage-accent/50 transition min-h-[100px]"
              >
                <div>
                  <p className="font-medium text-white">{tour.name}</p>
                  <p className="text-sm text-stage-muted mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {tour.project?.name ?? 'Project'}
                    {tour.startDate && tour.endDate
                      ? ` · ${format(new Date(tour.startDate), 'MMM d')} – ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
                      : tour.startDate
                        ? ` · From ${format(new Date(tour.startDate), 'MMM d, yyyy')}`
                        : tour.endDate
                          ? ` · Until ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
                          : ` · ${tour._count.dates} date${tour._count.dates === 1 ? '' : 's'}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-stage-muted mt-2 self-end" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
