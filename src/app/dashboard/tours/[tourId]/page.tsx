import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Pencil, Plus, Users } from 'lucide-react';
import { canEdit } from '@/lib/session';
import { cleanupOrphanedTravelGroupMembers } from '@/lib/traveling-group';
import { TravelingGroupSection } from '@/components/TravelingGroupSection';
import { TourDateCard } from '@/components/TourDateCard';
import { ArchiveTourDatesSection, type ArchiveTourDatePayload } from '@/components/ArchiveTourDatesSection';
import { isTourDateUpcomingOrToday } from '@/lib/tour-date-upcoming';
import { getTourDateOpenDateIdsForUser, canOpenDateId } from '@/lib/tour-date-access';

type TourDateRow = {
  id: string;
  name: string | null;
  venueName: string;
  city: string;
  date: Date;
  endDate: Date | null;
  kind: string;
  status: string;
  advanceComplete: boolean;
};

function toArchivePayload(d: TourDateRow): ArchiveTourDatePayload {
  return {
    id: d.id,
    name: d.name,
    venueName: d.venueName,
    city: d.city,
    date: d.date.toISOString(),
    endDate: d.endDate ? d.endDate.toISOString() : null,
    kind: d.kind,
    status: d.status,
    advanceComplete: d.advanceComplete,
  };
}

function DatesSections({
  tourId,
  dates,
  allowEdit,
  dateOpenAccess,
}: {
  tourId: string;
  dates: TourDateRow[];
  allowEdit: boolean;
  dateOpenAccess: { openAllDates: boolean; openDateIds: Set<string> };
}) {
  if (dates.length === 0) {
    return (
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-8 text-center text-stage-muted">
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
    );
  }

  const upcoming = dates.filter((d) => isTourDateUpcomingOrToday({ date: d.date, endDate: d.endDate }));
  const archived = dates.filter((d) => !isTourDateUpcomingOrToday({ date: d.date, endDate: d.endDate }));

  return (
    <>
      {allowEdit && (
        <Link
          href={`/dashboard/tours/${tourId}/dates/new`}
          className="flex items-center justify-center gap-2 mb-4 py-3 rounded-lg border border-dashed border-stage-border text-stage-muted hover:border-stage-neonCyan/40 hover:text-stage-neonCyan"
        >
          <Plus className="h-4 w-4" /> Add date
        </Link>
      )}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" /> Dates
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((date) => (
              <TourDateCard
                key={date.id}
                tourId={tourId}
                date={date}
                canOpenDetail={canOpenDateId(dateOpenAccess, date.id)}
              />
            ))}
          </ul>
        </section>
      )}
      {archived.length > 0 && (
        <ArchiveTourDatesSection
          tourId={tourId}
          dates={archived.map(toArchivePayload)}
          dateOpenAccess={dateOpenAccess}
        />
      )}
      {upcoming.length === 0 && archived.length > 0 && allowEdit && (
        <p className="text-stage-muted text-sm mt-4">
          All dates are in the past. Expand Past dates below or add a new date above.
        </p>
      )}
    </>
  );
}

export default async function TourDatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tourId: string }>;
  searchParams?: Promise<{ noDateAccess?: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const { tourId } = await params;
  const sp = (await searchParams) ?? {};

  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      project: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      dates: { orderBy: { date: 'asc' } },
    },
  });
  if (!tour) redirect('/dashboard/tours');

  await cleanupOrphanedTravelGroupMembers(tourId);
  const travelingGroup = await prisma.travelGroupMember.findMany({
    where: { tourId },
    orderBy: { name: 'asc' },
  });

  const role = (session.user as { role?: string }).role;
  const allowEdit = canEdit(role);

  const dateOpenAccess = session.user.id
    ? await getTourDateOpenDateIdsForUser(session.user.id, role, tourId)
    : { openAllDates: false, openDateIds: new Set<string>() };

  const projectName = tour.project?.name ?? 'Project';

  const dateRangeLine =
    tour.startDate && tour.endDate
      ? `${format(new Date(tour.startDate), 'MMM d, yyyy')} – ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
      : tour.startDate
        ? `From ${format(new Date(tour.startDate), 'MMM d, yyyy')}`
        : tour.endDate
          ? `Until ${format(new Date(tour.endDate), 'MMM d, yyyy')}`
          : tour.timezone && tour.timezone !== 'UTC'
            ? tour.timezone
            : null;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      {sp.noDateAccess != null && (
        <p className="mb-4 text-sm text-amber-200/90 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
          You can see this tour&apos;s dates on the calendar, but only dates you&apos;re assigned to can be opened. Ask a
          tour editor to add you to a date.
        </p>
      )}
      <Link
        href={tour.projectId ? `/dashboard/projects/${tour.projectId}` : '/dashboard/projects'}
        className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-neonCyan transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {projectName}
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{tour.name}</h1>
          {dateRangeLine && <p className="text-stage-muted text-sm mt-0.5">{dateRangeLine}</p>}
          <p className="text-stage-muted text-sm mt-1">
            {tour.manager ? (
              <>
                Tour owner: <span className="text-stage-fg">{tour.manager.name}</span>
              </>
            ) : allowEdit ? (
              <>
                Tour owner: <span className="text-stage-muted">Not set</span>
                {' · '}
                <Link href={`/dashboard/tours/${tourId}/edit`} className="text-stage-accent hover:underline">
                  Edit tour to assign
                </Link>
              </>
            ) : (
              <>Tour owner: —</>
            )}
          </p>
        </div>
        {allowEdit && (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end shrink-0">
            <Link
              href={`/dashboard/tours/${tourId}/edit`}
              className="shrink-0 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-stage-border text-stage-muted hover:border-stage-neonCyan/40 hover:text-stage-accent transition sm:self-start"
            >
              <Pencil className="h-4 w-4" /> Edit tour
            </Link>
          </div>
        )}
      </div>

      <section className="mb-6 w-full min-w-0 md:w-1/2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stage-neonCyan flex items-center gap-1.5 mb-2">
          <Users className="h-3.5 w-3.5 shrink-0" /> People on this tour
        </h2>
        <p className="text-stage-muted text-xs mb-2 leading-relaxed">
          Add crew, musicians and superstars from the people database. You can then assign them to specific dates.
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

      <DatesSections tourId={tourId} dates={tour.dates} allowEdit={allowEdit} dateOpenAccess={dateOpenAccess} />
    </div>
  );
}
