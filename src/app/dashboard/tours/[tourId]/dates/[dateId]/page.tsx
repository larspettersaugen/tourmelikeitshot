import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { TourDayView } from '@/components/TourDayView';
import { DateInfo } from '@/components/DateInfo';
import { DateNavTabs } from '@/components/DateNavTabs';
import { PrintDaySheetButton } from '@/components/PrintDaySheetButton';
import { canEdit, canAccessAdvance } from '@/lib/session';
import { cleanupOrphanedTravelGroupMembers } from '@/lib/traveling-group';

export default async function TourDateDetailPage({
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

  const schedule = await prisma.scheduleItem.findMany({
    where: { tourDateId: dateId },
    orderBy: { time: 'asc' },
  });
  const transportRaw = await prisma.transport.findMany({
    where: { tourDateId: dateId },
    include: {
      passengers: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  const hotelsRaw = await prisma.hotel.findMany({
    where: { tourDateId: dateId },
    include: {
      guests: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  const hotels = hotelsRaw.map((h) => ({
    id: h.id,
    name: h.name,
    address: h.address,
    checkIn: h.checkIn.toISOString(),
    checkOut: h.checkOut.toISOString(),
    notes: h.notes,
    guests: h.guests.map((g) => ({
      id: g.id,
      travelGroupMemberId: g.travelGroupMemberId,
      name: g.travelGroupMember.name,
      role: g.travelGroupMember.role,
      personId: g.travelGroupMember.personId,
      roomNumber: g.roomNumber,
    })),
  }));
  const transport = transportRaw.map((t) => ({
    id: t.id,
    type: t.type,
    time: t.time,
    dayAfter: t.dayAfter,
    driver: t.driver,
    driverPhone: t.driverPhone,
    driverEmail: t.driverEmail,
    company: t.company,
    notes: t.notes,
    passengers: t.passengers.map((p) => ({
      id: p.id,
      travelGroupMemberId: p.travelGroupMemberId,
      name: p.travelGroupMember.name,
      role: p.travelGroupMember.role,
      personId: p.travelGroupMember.personId,
    })),
  }));
  const flightsRaw = await prisma.flight.findMany({
    where: { tourId },
    orderBy: { departureTime: 'asc' },
    include: {
      passengers: {
        include: {
          travelGroupMember: { select: { id: true, name: true, role: true, personId: true } },
        },
      },
    },
  });
  const viewerPersonId = await prisma.person.findFirst({
    where: { userId: (session.user as { id?: string }).id },
    select: { id: true, type: true },
  });
  const viewerRole = (session.user as { role?: string }).role;
  const hasExtendedAccess = viewerRole === 'admin' || viewerRole === 'editor' || viewerRole === 'power_user';
  const isTourManager = viewerPersonId?.type === 'tour_manager';
  const seeAllFlightsInSchedule = hasExtendedAccess || isTourManager;
  const flights = flightsRaw.map((f) => ({
    id: f.id,
    tourDateId: f.tourDateId,
    departureTime: f.departureTime.toISOString(),
    arrivalTime: f.arrivalTime.toISOString(),
    departureAirport: f.departureAirport,
    arrivalAirport: f.arrivalAirport,
    flightNumber: f.flightNumber,
    notes: f.notes,
    passengers: f.passengers.map((p) => ({
      id: p.id,
      travelGroupMemberId: p.travelGroupMemberId,
      name: p.travelGroupMember.name,
      role: p.travelGroupMember.role,
      bookingRef: p.bookingRef,
      personId: p.travelGroupMember.personId,
    })),
  }));
  const tourDateStr = selectedDate.date.toISOString().slice(0, 10);
  const flightsOnThisDate = flights.filter(
    (f) => f.tourDateId === dateId || (f.tourDateId === null && f.departureTime.slice(0, 10) === tourDateStr)
  );
  const flightsForSchedule = seeAllFlightsInSchedule
    ? flightsOnThisDate
    : viewerPersonId
      ? flightsOnThisDate.filter((f) => f.passengers.some((p) => p.personId === viewerPersonId.id))
      : [];
  const transportForSchedule =
    seeAllFlightsInSchedule /* same visibility as flights */
      ? transport
      : viewerPersonId
        ? transport.filter((t) => t.passengers.some((p) => p.personId === viewerPersonId.id))
        : [];
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

  const currentIndex = tour.dates.findIndex((d) => d.id === dateId);
  const prevDate = currentIndex > 0 ? tour.dates[currentIndex - 1] : null;
  const nextDate = currentIndex >= 0 && currentIndex < tour.dates.length - 1 ? tour.dates[currentIndex + 1] : null;

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
                href={`/dashboard/tours/${tourId}/dates/${prevDate.id}`}
                className="flex items-center gap-1.5 text-stage-muted hover:text-white transition text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {nextDate && (
              <Link
                href={`/dashboard/tours/${tourId}/dates/${nextDate.id}`}
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
        extraActions={(session.user as { role?: string }).role === 'viewer' ? undefined : <PrintDaySheetButton />}
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

      <DateNavTabs tourId={tourId} dateId={dateId} active="day" allowAdvance={canAccessAdvance((session.user as { role?: string }).role)} />

      <TourDayView
        tourId={tourId}
        dateId={dateId}
        dateLabel={`${selectedDate.venueName}, ${selectedDate.city}`}
        date={selectedDate.date.toISOString().slice(0, 10)}
        schedule={schedule}
        flights={flightsOnThisDate}
        flightsForSchedule={flightsForSchedule}
        transport={transport}
        transportForSchedule={transportForSchedule}
        hotels={hotels}
        viewerPersonId={viewerPersonId?.id ?? null}
        notes={selectedDate.notes}
        travelingGroup={travelingGroup.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          subgroup: m.subgroup,
          phone: m.phone,
          email: m.email,
          notes: m.notes,
        }))}
        allowEdit={allowEdit}
        hideAllTourMessage={(session.user as { role?: string }).role === 'viewer'}
      />
    </div>
  );
}
