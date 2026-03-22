import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Pencil, Plus, Users } from 'lucide-react';
import { ShowStatusBadge } from '@/components/ShowStatusBadge';
import { getStatusCardClasses } from '@/lib/show-status';
import { getDateKindLabel } from '@/lib/date-kind';
import { canEdit } from '@/lib/session';
import { cleanupOrphanedTravelGroupMembers } from '@/lib/traveling-group';
import { TravelingGroupSection } from '@/components/TravelingGroupSection';

export default async function TourDatesPage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  const { tourId } = await params;

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      project: { select: { id: true, name: true } },
      dates: { orderBy: { date: 'asc' } },
    },
  });
  if (!tour) redirect('/dashboard/tours');

  await cleanupOrphanedTravelGroupMembers(tourId);
  const travelingGroup = await prisma.travelGroupMember.findMany({
    where: { tourId },
    orderBy: { name: 'asc' },
  });

  const allowEdit = canEdit((session.user as { role?: string }).role);

  const projectName = tour.project?.name ?? 'Project';

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <Link
        href={tour.projectId ? `/dashboard/projects/${tour.projectId}` : '/dashboard/projects'}
        className="inline-flex items-center gap-2 text-stage-muted hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {projectName}
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{tour.name}</h1>
          <p className="text-stage-muted text-sm mt-0.5">
          {tour.startDate && tour.endDate
            ? `${format(new Date(tour.startDate), 'MMM d, yyyy')} – ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
            : tour.startDate
              ? `From ${format(new Date(tour.startDate), 'MMM d, yyyy')}`
              : tour.endDate
                ? `Until ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
                : tour.timezone && tour.timezone !== 'UTC'
                  ? tour.timezone
                  : null}
          </p>
        </div>
        {allowEdit && (
          <Link
            href={`/dashboard/tours/${tourId}/edit`}
            className="shrink-0 flex items-center gap-2 py-2 px-3 rounded-lg border border-stage-border text-stage-muted hover:border-stage-accent/50 hover:text-stage-accent transition"
          >
            <Pencil className="h-4 w-4" /> Edit tour
          </Link>
        )}
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" /> People on this tour
        </h2>
        <p className="text-stage-muted text-sm mb-3">
          Add crew, artists and superstars from the people database. You can then assign them to specific dates.
        </p>
        <TravelingGroupSection
          tourId={tourId}
          members={travelingGroup.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            subgroup: m.subgroup,
            phone: m.phone,
            email: m.email,
            notes: m.notes,
            personId: m.personId ?? undefined,
          }))}
          allowEdit={allowEdit}
        />
      </section>

      {tour.dates.length === 0 ? (
        <div className="rounded-xl bg-stage-card border border-stage-border p-8 text-center text-stage-muted">
          <p>No dates yet.</p>
          {allowEdit && (
            <Link
              href={`/dashboard/tours/${tourId}/dates/new`}
              className="mt-4 inline-block text-stage-accent hover:underline"
            >
              Add date
            </Link>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" /> Dates
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tour.dates.map((date) => (
              <li key={date.id}>
                <Link
                  href={`/dashboard/tours/${tourId}/dates/${date.id}`}
                  className={`flex items-center justify-between p-4 rounded-lg border transition ${getStatusCardClasses(date.status)}`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white">{date.venueName}, {date.city}</p>
                      <span className="text-xs text-stage-muted bg-stage-dark px-1.5 py-0.5 rounded">
                        {getDateKindLabel(date.kind)}
                      </span>
                      <ShowStatusBadge status={date.status} />
                    </div>
                    <p className="text-sm text-stage-muted">
                      {date.endDate
                        ? `${format(new Date(date.date), 'EEE MMM d')} – ${format(new Date(date.endDate), 'EEE MMM d, yyyy')}`
                        : format(new Date(date.date), 'EEE MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-stage-muted">→</span>
                </Link>
              </li>
            ))}
          </ul>
          {allowEdit && (
            <Link
              href={`/dashboard/tours/${tourId}/dates/new`}
              className="flex items-center justify-center gap-2 mt-6 py-3 rounded-lg border border-dashed border-stage-border text-stage-muted hover:border-stage-accent/50 hover:text-stage-accent"
            >
              <Plus className="h-4 w-4" /> Add date
            </Link>
          )}
        </>
      )}
    </div>
  );
}
