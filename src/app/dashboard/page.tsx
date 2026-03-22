import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ChevronRight, Calendar, FolderOpen, MapPin } from 'lucide-react';
import { ShowStatusBadge } from '@/components/ShowStatusBadge';
import { format } from 'date-fns';
import { hasExtendedAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export default async function DashboardPage() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role;
  const extendedAccess = hasExtendedAccess(role);
  const viewerTourIds = extendedAccess ? null : session?.user?.id
    ? await getViewerAssignedTourIds(session.user.id)
    : [];

  const now = new Date();
  const tourWhere = extendedAccess
    ? {
        projectId: { not: null },
        OR: [
          { startDate: { lte: now }, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
        ],
      }
    : { id: { in: viewerTourIds ?? [] } };

  // Sequential queries avoid grabbing multiple pool connections at once (helps Neon + dev HMR).
  const allProjects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { tours: true } }, tours: { select: { id: true } } },
  });
  const tours = await prisma.tour.findMany({
    where: tourWhere,
    orderBy: [{ startDate: 'asc' }, { updatedAt: 'desc' }],
    include: {
      project: { select: { id: true, name: true } },
      dates: {
        where: { date: { gte: now } },
        orderBy: { date: 'asc' },
        take: 1,
      },
      _count: { select: { dates: true } },
    },
  });
  const upcomingDates = await prisma.tourDate.findMany({
    where: { date: { gte: new Date() }, tourId: extendedAccess ? undefined : { in: viewerTourIds ?? [] } },
    orderBy: { date: 'asc' },
    take: 7,
    include: {
      tour: {
        select: { id: true, name: true, project: { select: { id: true, name: true } } },
      },
    },
  });

  const projects = extendedAccess
    ? allProjects
    : allProjects.filter((p) => p.tours.some((t) => (viewerTourIds ?? []).includes(t.id)));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">Dashboard</h1>

      {/* Artists (projects) */}
      {projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4" /> Artists
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex flex-col justify-between p-5 rounded-lg bg-stage-card border border-stage-border hover:border-stage-accent/50 transition min-h-[100px]"
                >
                  <div>
                    <p className="font-medium text-white">{project.name}</p>
                    <p className="text-sm text-stage-muted mt-1">
                      {project._count.tours > 0
                        ? `${project._count.tours} tour${project._count.tours === 1 ? '' : 's'}`
                        : 'No tours yet'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stage-muted mt-2 self-end" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Upcoming dates */}
      {upcomingDates.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" /> Upcoming shows
          </h2>
          <ul className="space-y-2">
            {upcomingDates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/tours/${d.tourId}/dates/${d.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-stage-card border border-stage-border hover:border-stage-accent/50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {d.venueName}, {d.city}
                      </p>
                      <ShowStatusBadge status={d.status} />
                    </div>
                    <p className="text-sm text-stage-muted">
                      {format(new Date(d.date), 'EEEE, MMM d')} · {d.tour.project?.name ?? d.tour.name} · {d.tour.name}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stage-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Active tours */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4" /> Active tours
        </h2>
        {tours.length === 0 ? (
          <div className="rounded-xl bg-stage-card border border-stage-border p-8 text-center text-stage-muted">
            <p>No tours yet.</p>
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
                    <p className="text-sm text-stage-muted mt-1">
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
      </section>
    </div>
  );
}
