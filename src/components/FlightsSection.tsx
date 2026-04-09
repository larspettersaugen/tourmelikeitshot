'use client';

import { Plane, Plus, Search, Users, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { shortPassengerLabels } from '@/lib/short-passenger-labels';
import { format } from 'date-fns';

type FlightPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  bookingRef: string | null;
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

type TravelMember = { id: string; name: string; role: string; subgroup?: string | null };

function groupBySubgroup(members: TravelMember[]): Map<string | null, TravelMember[]> {
  const map = new Map<string | null, TravelMember[]>();
  for (const m of members) {
    const key = m.subgroup?.trim() || null;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return map;
}

function AddPassengerForm({
  available,
  onAddBatch,
  onCancel,
  loading,
  error,
  hideCancel,
}: {
  available: TravelMember[];
  onAddBatch: (items: { memberId: string; bookingRef: string }[]) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
  hideCancel?: boolean;
}) {
  const [memberId, setMemberId] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [subgroupToAdd, setSubgroupToAdd] = useState<string | null>(null);
  const [subgroupBookingRef, setSubgroupBookingRef] = useState('');
  const [subgroupIndividualRefs, setSubgroupIndividualRefs] = useState<Record<string, string>>({});
  const bySubgroup = groupBySubgroup(available);
  const subgroupKeys = Array.from(bySubgroup.keys()).sort((a, b) => (a || '').localeCompare(b || ''));
  const subgroupMembers = subgroupToAdd ? (bySubgroup.get(subgroupToAdd) ?? []) : [];

  function setSubgroupMemberRef(memberId: string, value: string) {
    setSubgroupIndividualRefs((prev) => ({ ...prev, [memberId]: value }));
  }

  function doAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const items: { memberId: string; bookingRef: string }[] = [];
    const seen = new Set<string>();
    if (memberId) {
      items.push({ memberId, bookingRef: bookingRef.trim() });
      seen.add(memberId);
    }
    if (subgroupToAdd && subgroupMembers.length > 0) {
      for (const m of subgroupMembers) {
        if (!seen.has(m.id)) {
          items.push({
            memberId: m.id,
            bookingRef: (subgroupIndividualRefs[m.id] ?? subgroupBookingRef).trim() || '',
          });
          seen.add(m.id);
        }
      }
    }
    if (items.length > 0) {
      onAddBatch(items);
      setMemberId('');
      setBookingRef('');
      setSubgroupToAdd(null);
      setSubgroupBookingRef('');
      setSubgroupIndividualRefs({});
    }
  }

  const hasSinglePerson = !!memberId;
  const hasSubgroup = !!subgroupToAdd && subgroupMembers.length > 0;
  const canAdd = (hasSinglePerson || hasSubgroup) && !loading;

  function handleAddAllPeople() {
    if (available.length === 0 || loading) return;
    const items = available.map((m) => ({ memberId: m.id, bookingRef: '' }));
    onAddBatch(items);
  }

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doAdd();
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm min-w-[140px]"
        >
          <option value="">Select person</option>
          {subgroupKeys.map((key) => {
            const members = bySubgroup.get(key)!;
            const label = key || 'No subgroup';
            return (
              <optgroup key={label} label={label}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <input
          type="text"
          value={bookingRef}
          onChange={(e) => setBookingRef(e.target.value)}
          placeholder="Booking ref"
          className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm w-24"
        />
      </div>
      <div className="pt-2 border-t border-stage-border space-y-3">
        <p className="text-xs font-semibold text-stage-muted">Add subgroup</p>
        {subgroupKeys.filter((k) => k != null).length > 0 ? (
          <>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={subgroupToAdd ?? ''}
              onChange={(e) => {
                setSubgroupToAdd(e.target.value || null);
                setSubgroupIndividualRefs({});
              }}
              className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm min-w-[120px]"
            >
              <option value="">Select subgroup</option>
              {subgroupKeys.filter((k) => k != null).map((key) => (
                <option key={key!} value={key!}>
                  {key}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={subgroupBookingRef}
              onChange={(e) => setSubgroupBookingRef(e.target.value)}
              placeholder="Group booking ref (optional)"
              className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm w-40 placeholder-zinc-500"
            />
          </div>
          {subgroupMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-stage-muted">Individual booking refs:</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {subgroupMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-sm text-white min-w-[100px] truncate">{m.name}</span>
                    <input
                      type="text"
                      value={subgroupIndividualRefs[m.id] ?? ''}
                      onChange={(e) => setSubgroupMemberRef(m.id, e.target.value)}
                      placeholder={subgroupBookingRef || 'Booking ref'}
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-stage-surface border border-stage-border text-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        ) : (
          <p className="text-xs text-stage-muted">No subgroups in the traveling group. Add a group with subgroups to the tour first.</p>
        )}
      </div>
      {error && <span className="text-red-400 text-sm block">{error}</span>}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => doAdd()}
          disabled={!canAdd}
          className="px-2 py-1.5 rounded bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
        {available.length > 0 && (
          <button
            type="button"
            onClick={handleAddAllPeople}
            disabled={loading}
            className="px-2 py-1.5 rounded border border-stage-accent text-stage-accent text-sm font-medium hover:bg-stage-accent/10 disabled:opacity-50"
          >
            Add all ({available.length})
          </button>
        )}
        {!hideCancel && (
          <button type="button" onClick={onCancel} className="px-2 py-1.5 rounded border border-stage-border text-stage-muted text-sm">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function FlightsSection({
  tourId,
  dateId,
  flights,
  travelingGroup,
  allowEdit,
  date,
  hideEmptyMessage,
}: {
  tourId: string;
  dateId: string;
  flights: Flight[];
  travelingGroup: { id: string; name: string; role: string; subgroup?: string | null }[];
  allowEdit: boolean;
  date?: string;
  hideEmptyMessage?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [addingToFlightId, setAddingToFlightId] = useState<string | null>(null);
  const [editingPeopleFlightId, setEditingPeopleFlightId] = useState<string | null>(null);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<Set<string>>(new Set());
  const [removingPassengerId, setRemovingPassengerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingPassengers, setPendingPassengers] = useState<{ travelGroupMemberId: string; name: string; role: string; bookingRef: string }[]>([]);
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [editDepartureAirport, setEditDepartureAirport] = useState('');
  const [editArrivalAirport, setEditArrivalAirport] = useState('');
  const [editFlightNumber, setEditFlightNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { id: flightId } = await api.flights.create(tourId, {
        tourDateId: dateId,
        departureTime: new Date(departureTime).toISOString(),
        arrivalTime: new Date(arrivalTime).toISOString(),
        departureAirport,
        arrivalAirport,
        flightNumber: flightNumber || undefined,
        notes: notes || undefined,
      });
      for (const p of pendingPassengers) {
        await api.flights.passengers.add(tourId, flightId, {
          travelGroupMemberId: p.travelGroupMemberId,
          bookingRef: p.bookingRef || undefined,
        });
      }
      setDepartureTime('');
      setArrivalTime('');
      setDepartureAirport('');
      setArrivalAirport('');
      setFlightNumber('');
      setNotes('');
      setPendingPassengers([]);
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  function addPendingPassenger(memberId: string, bookingRef: string) {
    const m = travelingGroup.find((x) => x.id === memberId);
    if (m) setPendingPassengers((prev) => [...prev, { travelGroupMemberId: m.id, name: m.name, role: m.role, bookingRef }]);
  }

  function removePendingPassenger(travelGroupMemberId: string) {
    setPendingPassengers((prev) => prev.filter((p) => p.travelGroupMemberId !== travelGroupMemberId));
  }

  async function handleLookup() {
    if (!flightNumber.trim()) {
      setError('Enter a flight number first');
      return;
    }
    setError('');
    setLookupLoading(true);
    try {
      const data = await api.flights.lookup({
        flight_number: flightNumber.trim(),
        date: date || undefined,
      });
      setDepartureAirport(data.departureAirport);
      setArrivalAirport(data.arrivalAirport);
      setFlightNumber(data.flightNumber);
      if (data.departureTime) {
        setDepartureTime(format(new Date(data.departureTime), "yyyy-MM-dd'T'HH:mm"));
      }
      if (data.arrivalTime) {
        setArrivalTime(format(new Date(data.arrivalTime), "yyyy-MM-dd'T'HH:mm"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleEditLookup() {
    if (!editFlightNumber.trim()) {
      setError('Enter a flight number first');
      return;
    }
    setError('');
    setLookupLoading(true);
    try {
      const data = await api.flights.lookup({
        flight_number: editFlightNumber.trim(),
        date: date || undefined,
      });
      setEditDepartureAirport(data.departureAirport);
      setEditArrivalAirport(data.arrivalAirport);
      setEditFlightNumber(data.flightNumber);
      if (data.departureTime) {
        setEditDepartureTime(format(new Date(data.departureTime), "yyyy-MM-dd'T'HH:mm"));
      }
      if (data.arrivalTime) {
        setEditArrivalTime(format(new Date(data.arrivalTime), "yyyy-MM-dd'T'HH:mm"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }

  function startEditing(f: Flight) {
    setEditingFlightId(f.id);
    setExpandedFlightId(f.id);
    setEditDepartureTime(format(new Date(f.departureTime), "yyyy-MM-dd'T'HH:mm"));
    setEditArrivalTime(format(new Date(f.arrivalTime), "yyyy-MM-dd'T'HH:mm"));
    setEditDepartureAirport(f.departureAirport);
    setEditArrivalAirport(f.arrivalAirport);
    setEditFlightNumber(f.flightNumber || '');
    setEditNotes(f.notes || '');
  }

  function cancelEditing() {
    setEditingFlightId(null);
    setError('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFlightId) return;
    setError('');
    setLoading(true);
    try {
      await api.flights.update(tourId, editingFlightId, {
        departureTime: new Date(editDepartureTime).toISOString(),
        arrivalTime: new Date(editArrivalTime).toISOString(),
        departureAirport: editDepartureAirport,
        arrivalAirport: editArrivalAirport,
        flightNumber: editFlightNumber || null,
        notes: editNotes || null,
      });
      cancelEditing();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePassenger(flightId: string, passengerId: string) {
    setError('');
    setRemovingPassengerId(passengerId);
    try {
      await api.flights.passengers.remove(tourId, flightId, passengerId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
      setRemovingPassengerId(null);
    }
  }

  async function handleRemoveSelectedPassengers(flightId: string) {
    const ids = Array.from(selectedPassengerIds);
    if (ids.length === 0) return;
    setError('');
    setLoading(true);
    try {
      for (const passengerId of ids) {
        await api.flights.passengers.remove(tourId, flightId, passengerId);
      }
      setSelectedPassengerIds(new Set());
      setEditingPeopleFlightId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
      setLoading(false);
    }
  }

  function togglePassengerSelection(passengerId: string) {
    setSelectedPassengerIds((prev) => {
      const next = new Set(prev);
      if (next.has(passengerId)) next.delete(passengerId);
      else next.add(passengerId);
      return next;
    });
  }

  async function handleAddPassengers(flightId: string, items: { memberId: string; bookingRef: string }[]) {
    setLoading(true);
    setError('');
    try {
      for (const { memberId: travelGroupMemberId, bookingRef } of items) {
        await api.flights.passengers.add(tourId, flightId, { travelGroupMemberId, bookingRef: bookingRef || undefined });
      }
      setAddingToFlightId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add passengers');
    } finally {
      setLoading(false);
    }
  }

  function addPendingBatch(items: { memberId: string; bookingRef: string }[]) {
    const toAdd = items
      .map(({ memberId, bookingRef }) => {
        const m = travelingGroup.find((x) => x.id === memberId);
        return m ? { travelGroupMemberId: m.id, name: m.name, role: m.role, bookingRef } : null;
      })
      .filter(Boolean) as { travelGroupMemberId: string; name: string; role: string; bookingRef: string }[];
    setPendingPassengers((prev) => {
      const existing = new Set(prev.map((p) => p.travelGroupMemberId));
      const newOnes = toAdd.filter((p) => !existing.has(p.travelGroupMemberId));
      return [...prev, ...newOnes];
    });
  }

  async function handleUpdateBookingRef(flightId: string, passengerId: string, bookingRef: string) {
    try {
      await api.flights.passengers.update(tourId, flightId, passengerId, { bookingRef: bookingRef || undefined });
      router.refresh();
    } catch {
      // ignore
    }
  }

  const pendingPassengerDisplayLabels = shortPassengerLabels(pendingPassengers.map((p) => p.name));

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
        <Plane className="h-4 w-4" /> Flights
      </h3>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {flights.length === 0 && !adding ? (
          <div className="p-6 text-center text-stage-muted text-sm">No flights</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {flights.map((f) => {
              const isExpanded = expandedFlightId === f.id;
              const onThisFlight = new Set(f.passengers.map((p) => p.travelGroupMemberId));
              const availableToAdd = travelingGroup.filter((m) => !onThisFlight.has(m.id));
              const isAdding = addingToFlightId === f.id;
              const passengerLabels = shortPassengerLabels(f.passengers.map((p) => p.name));
              return (
                <li key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedFlightId(isExpanded ? null : f.id)}
                        className="flex items-center gap-2 text-left w-full"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-stage-muted shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-stage-muted shrink-0" />
                        )}
                        <p className="font-medium text-white">
                          {f.departureAirport} → {f.arrivalAirport}
                          {f.flightNumber && <span className="text-stage-muted ml-2">{f.flightNumber}</span>}
                          {f.passengers.length > 0 && (
                            <span className="text-stage-muted text-xs font-normal ml-2">
                              ({f.passengers.length} people)
                            </span>
                          )}
                        </p>
                      </button>
                      <p className="text-sm text-stage-muted mt-1 ml-6">
                        {format(new Date(f.departureTime), 'MMM d, HH:mm')} – {format(new Date(f.arrivalTime), 'HH:mm')}
                      </p>
                      {f.notes && <p className="text-sm text-zinc-400 mt-1 ml-6">{f.notes}</p>}
                    </div>
                    {allowEdit && (
                      <button
                        type="button"
                        onClick={() => startEditing(f)}
                        disabled={loading}
                        className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10 disabled:opacity-50 flex items-center gap-1.5 text-sm"
                        aria-label="Edit flight"
                      >
                        <Pencil className="h-4 w-4" /> Edit flight
                      </button>
                    )}
                  </div>
                  {editingFlightId === f.id && (
                    <form onSubmit={handleUpdate} className="mt-4 ml-6 border-t border-stage-border pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Departure</label>
                          <input
                            type="datetime-local"
                            value={editDepartureTime}
                            onChange={(e) => setEditDepartureTime(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Arrival</label>
                          <input
                            type="datetime-local"
                            value={editArrivalTime}
                            onChange={(e) => setEditArrivalTime(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editDepartureAirport}
                          onChange={(e) => setEditDepartureAirport(e.target.value)}
                          required
                          placeholder="From (e.g. OSL)"
                          className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                        />
                        <input
                          type="text"
                          value={editArrivalAirport}
                          onChange={(e) => setEditArrivalAirport(e.target.value)}
                          required
                          placeholder="To (e.g. CDG)"
                          className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editFlightNumber}
                          onChange={(e) => setEditFlightNumber(e.target.value)}
                          placeholder="Flight number (e.g. SK123)"
                          className="flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={handleEditLookup}
                          disabled={lookupLoading}
                          className="px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg disabled:opacity-50 flex items-center gap-1.5"
                          title="Look up flight details"
                        >
                          <Search className="h-4 w-4" />
                          {lookupLoading ? '…' : 'Look up'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notes"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                      />
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {isExpanded && editingFlightId !== f.id && (
                    <div className="mt-4 ml-6 border-t border-stage-border pt-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-stage-muted flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" /> People on this flight
                        </h4>
                        {allowEdit && f.passengers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPeopleFlightId(editingPeopleFlightId === f.id ? null : f.id);
                              setSelectedPassengerIds(new Set());
                            }}
                            className={`p-1 rounded ${editingPeopleFlightId === f.id ? 'text-stage-accent bg-stage-accent/10' : 'text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10'}`}
                            aria-label="Edit people on this flight"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {editingPeopleFlightId === f.id && allowEdit && f.passengers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-stage-border">
                          <button
                            type="button"
                            onClick={() => {
                              const ids = f.passengers.map((m) => m.id);
                              setSelectedPassengerIds(new Set(ids));
                            }}
                            className="text-xs text-stage-muted hover:text-stage-fg"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPassengerIds(new Set())}
                            className="text-xs text-stage-muted hover:text-stage-fg"
                          >
                            Clear
                          </button>
                          {selectedPassengerIds.size > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedPassengers(f.id)}
                              disabled={loading}
                              className="text-xs text-red-400 hover:underline disabled:opacity-50"
                            >
                              Remove selected
                            </button>
                          )}
                        </div>
                      )}
                      {f.passengers.length === 0 ? (
                        hideEmptyMessage ? null : (
                          <p className="text-sm text-stage-muted">No people added yet</p>
                        )
                      ) : (
                        <ul className="space-y-2">
                          {f.passengers.map((p, idx) => (
                            <li key={p.id} className="flex items-center gap-3 text-sm">
                              {allowEdit && editingPeopleFlightId === f.id && (
                                <input
                                  type="checkbox"
                                  checked={selectedPassengerIds.has(p.id)}
                                  onChange={() => togglePassengerSelection(p.id)}
                                  className="rounded border-stage-border w-4 h-4 shrink-0 accent-stage-accent"
                                  aria-label={`Select ${p.name}`}
                                />
                              )}
                              <span className="text-white">{passengerLabels[idx] ?? p.name}</span>
                              {editingPeopleFlightId === f.id && allowEdit ? (
                                <input
                                  type="text"
                                  defaultValue={p.bookingRef || ''}
                                  placeholder="Booking ref"
                                  className="flex-1 max-w-[120px] px-2 py-1 rounded bg-stage-surface border border-stage-border text-white text-xs"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (p.bookingRef || '')) handleUpdateBookingRef(f.id, p.id, v);
                                  }}
                                />
                              ) : p.bookingRef ? (
                                <span className="text-stage-muted text-xs">{p.bookingRef}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      {allowEdit && (
                        <div className="mt-3">
                          {isAdding ? (
                            <AddPassengerForm
                              available={availableToAdd}
                              onAddBatch={(items) => handleAddPassengers(f.id, items)}
                              onCancel={() => setAddingToFlightId(null)}
                              loading={loading}
                              error={error}
                            />
                          ) : availableToAdd.length > 0 || travelingGroup.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => setAddingToFlightId(f.id)}
                              className="text-sm text-stage-accent hover:text-stage-accentHover"
                            >
                              + Add people to this flight
                            </button>
                          ) : (
                            <p className="text-xs text-stage-muted">All tour people are on this flight</p>
                          )}
                          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {adding && (
          <form onSubmit={handleAdd} className="p-4 border-t border-stage-border space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-stage-muted mb-1">Departure</label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-stage-muted mb-1">Arrival</label>
                <input
                  type="datetime-local"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value)}
                required
                placeholder="From (e.g. OSL)"
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="text"
                value={arrivalAirport}
                onChange={(e) => setArrivalAirport(e.target.value)}
                required
                placeholder="To (e.g. CDG)"
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Flight number (e.g. SK123)"
                className="flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading}
                className="px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg disabled:opacity-50 flex items-center gap-1.5"
                title="Look up flight details"
              >
                <Search className="h-4 w-4" />
                {lookupLoading ? '…' : 'Look up'}
              </button>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            {allowEdit && travelingGroup.length > 0 && (
              <div className="border-t border-stage-border pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-stage-muted flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> People on this flight
                </h4>
                {pendingPassengers.length > 0 && (
                  <ul className="space-y-2">
                    {pendingPassengers.map((p, idx) => (
                      <li key={p.travelGroupMemberId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-white">{pendingPassengerDisplayLabels[idx] ?? p.name}</span>
                        {p.bookingRef && <span className="text-stage-muted text-xs">{p.bookingRef}</span>}
                        <button
                          type="button"
                          onClick={() => removePendingPassenger(p.travelGroupMemberId)}
                          className="p-1 rounded text-red-400 hover:bg-red-400/10 text-xs"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {pendingPassengers.length < travelingGroup.length && (
                  <AddPassengerForm
                    available={travelingGroup.filter((m) => !pendingPassengers.some((p) => p.travelGroupMemberId === m.id))}
                    onAddBatch={addPendingBatch}
                    onCancel={() => {}}
                    loading={false}
                    error=""
                    hideCancel
                  />
                )}
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
              >
                Add flight
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setError(''); }}
                className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {allowEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full p-3 flex items-center justify-center gap-2 text-stage-muted hover:text-stage-accent border-t border-stage-border"
          >
            <Plus className="h-4 w-4" /> Add flight
          </button>
        )}
      </div>
    </section>
  );
}
