import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { canEdit } from '@/lib/session';
import { hasExtendedAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  const { projectId } = await params;
  const role = (session.user as { role?: string }).role;
  const extendedAccess = hasExtendedAccess(role);
  const viewerTourIds = extendedAccess ? null : (session.user.id ? await getViewerAssignedTourIds(session.user.id) : []);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tours: {
        orderBy: { startDate: 'asc' },
        include: { _count: { select: { dates: true } } },
      },
    },
  });
  if (!project) redirect('/dashboard/projects');

  const tours = extendedAccess
    ? project.tours
    : project.tours.filter((t) => (viewerTourIds ?? []).includes(t.id));
  if (!extendedAccess && tours.length === 0) redirect('/dashboard/projects');

  const allowEdit = canEdit(role);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-stage-muted hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Artists
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">{project.name}</h1>
        <p className="text-stage-muted text-sm mt-0.5">Tours</p>
      </div>

      {tours.length === 0 ? (
        <div className="rounded-xl bg-stage-card border border-stage-border p-8 text-center text-stage-muted">
          <p>No tours yet.</p>
          {allowEdit && (
            <Link
              href={`/dashboard/projects/${projectId}/tours/new`}
              className="mt-4 inline-block text-stage-accent hover:underline"
            >
              Add tour
            </Link>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" /> Tours
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tours.map((tour) => (
              <li key={tour.id}>
                <Link
                  href={`/dashboard/tours/${tour.id}`}
                  className="flex justify-between p-4 rounded-lg bg-stage-card border border-stage-border hover:border-stage-accent/50 transition"
                >
                  <div>
                    <p className="font-medium text-white">{tour.name}</p>
                    <p className="text-sm text-stage-muted">
                      {tour.startDate && tour.endDate
                        ? `${format(new Date(tour.startDate), 'MMM d')} – ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
                        : tour.startDate
                          ? `From ${format(new Date(tour.startDate), 'MMM d, yyyy')}`
                          : tour.endDate
                            ? `Until ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
                            : tour._count.dates > 0
                              ? `${tour._count.dates} date${tour._count.dates === 1 ? '' : 's'}`
                              : 'No dates yet'}
                    </p>
                  </div>
                  <span className="text-stage-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
          {allowEdit && (
            <Link
              href={`/dashboard/projects/${projectId}/tours/new`}
              className="flex items-center justify-center gap-2 mt-6 py-3 rounded-lg border border-dashed border-stage-border text-stage-muted hover:border-stage-accent/50 hover:text-stage-accent"
            >
              <Plus className="h-4 w-4" /> Add tour
            </Link>
          )}
        </>
      )}
    </div>
  );
}
