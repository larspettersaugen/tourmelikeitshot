'use client';

import { useState } from 'react';
import { Plane, Car } from 'lucide-react';
import { FlightsSection } from './FlightsSection';
import { TransportSection } from './TransportSection';

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
  driver: string | null;
  driverPhone: string | null;
  driverEmail: string | null;
  company: string | null;
  notes: string | null;
  passengers: TransportPassenger[];
};

const subTabs = [
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'ground', label: 'Ground transport', icon: Car },
] as const;

export function TravelSection({
  tourId,
  dateId,
  flights,
  transport,
  travelingGroup,
  allowEdit,
  date,
  hideEmptyMessage,
}: {
  tourId: string;
  dateId: string;
  flights: Flight[];
  transport: TransportItem[];
  travelingGroup: { id: string; name: string; role: string; subgroup?: string | null }[];
  allowEdit: boolean;
  date?: string;
  hideEmptyMessage?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'flights' | 'ground'>('flights');

  return (
    <section id="travel" className="scroll-mt-24">
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden shadow-card-inset ring-1 ring-white/[0.04]">
        <div className="p-4 border-b border-stage-border">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
            Travel
          </h2>
          <div className="flex gap-1 p-1 rounded-lg bg-stage-surface/50 border border-stage-border">
            {subTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition ${
                  activeTab === id
                    ? 'bg-stage-surface text-white border border-stage-border shadow-sm'
                    : 'text-stage-muted hover:text-stage-fg hover:bg-stage-surface/50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {activeTab === 'flights' && (
            <div id="flights">
              <FlightsSection
                tourId={tourId}
                dateId={dateId}
                flights={flights}
                travelingGroup={travelingGroup}
                allowEdit={allowEdit}
                date={date}
                hideEmptyMessage={hideEmptyMessage}
              />
            </div>
          )}
          {activeTab === 'ground' && (
            <div id="transport">
              <TransportSection
                tourId={tourId}
                dateId={dateId}
                items={transport}
                travelingGroup={travelingGroup}
                allowEdit={allowEdit}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
