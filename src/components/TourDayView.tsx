'use client';

import { ScheduleSection } from './ScheduleSection';
import { TravelSection } from './TravelSection';
import { HotelSection } from './HotelSection';
import { DayNotesSection } from './DayNotesSection';

type ScheduleItem = {
  id: string;
  time: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  label: string;
  notes: string | null;
  sortOrder: number;
  dayAfter?: boolean;
};
type FlightPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  bookingRef: string | null;
  personId?: string | null;
};
type Flight = {
  id: string;
  tourDateId: string | null;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber: string | null;
  notes: string | null;
  passengers: FlightPassenger[];
};
type TransportPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  personId?: string | null;
};
type TransportItem = {
  id: string;
  type: string;
  time: string;
  dayAfter?: boolean;
  driver: string | null;
  driverPhone: string | null;
  driverEmail: string | null;
  company: string | null;
  notes: string | null;
  passengers: TransportPassenger[];
};
export function TourDayView({
  tourId,
  dateId,
  dateLabel,
  date,
  schedule,
  flights,
  flightsForSchedule,
  viewerPersonId,
  transport,
  transportForSchedule,
  hotels,
  travelingGroup,
  notes,
  allowEdit,
  hideAllTourMessage,
}: {
  tourId: string;
  dateId: string;
  dateLabel: string;
  date?: string;
  schedule: ScheduleItem[];
  flights: Flight[];
  flightsForSchedule: Flight[];
  transport: TransportItem[];
  transportForSchedule: TransportItem[];
  hotels: { id: string; name: string; address: string | null; checkIn: string; checkOut: string; notes: string | null; guests: { id: string; travelGroupMemberId: string; name: string; role: string; personId: string | null; roomNumber: string | null }[] }[];
  viewerPersonId: string | null;
  travelingGroup: { id: string; name: string; role: string; subgroup: string | null; phone: string | null; email: string | null; notes: string | null }[];
  notes: string | null;
  allowEdit: boolean;
  hideAllTourMessage?: boolean;
}) {
  return (
    <div className="grid gap-8 xl:grid-cols-2 xl:gap-x-12 xl:items-start">
      <section id="schedule" className="scroll-mt-24 space-y-6">
        <div className="hidden print:block mb-4 pb-4 border-b border-stage-border">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan mb-2">Day notes</h2>
          <p className="text-sm whitespace-pre-wrap">{notes || '—'}</p>
        </div>
        <ScheduleSection
          tourId={tourId}
          dateId={dateId}
          items={schedule}
          flights={flightsForSchedule}
          transport={transportForSchedule}
          viewerPersonId={viewerPersonId}
          date={date}
          allowEdit={allowEdit}
        />
      </section>
      <section id="travelling" className="scroll-mt-24 space-y-6 print:hidden">
        <DayNotesSection tourId={tourId} dateId={dateId} notes={notes} allowEdit={allowEdit} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
          Travelling
        </h2>
        <TravelSection
          tourId={tourId}
          dateId={dateId}
          flights={flights}
          transport={transport}
          travelingGroup={travelingGroup}
          allowEdit={allowEdit}
          date={date}
          hideEmptyMessage={hideAllTourMessage}
        />
        <HotelSection
          tourId={tourId}
          dateId={dateId}
          items={hotels}
          travelingGroup={travelingGroup.map((m) => ({ id: m.id, name: m.name, role: m.role, subgroup: m.subgroup }))}
          allowEdit={allowEdit}
          hideEmptyMessage={hideAllTourMessage}
          date={date}
        />
      </section>
    </div>
  );
}
