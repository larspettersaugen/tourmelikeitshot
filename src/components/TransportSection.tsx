'use client';

import { Car, Plus, Phone, Mail, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { shortPassengerLabels } from '@/lib/short-passenger-labels';

type TransportPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  personId?: string | null;
};
type Item = {
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

function AddPassengerForm({
  available,
  onAdd,
  onCancel,
  loading,
  error,
}: {
  available: { id: string; name: string; role: string }[];
  onAdd: (memberId: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [memberId, setMemberId] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (memberId) onAdd(memberId);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <select
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        required
        className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm min-w-[140px]"
      >
        <option value="">Select person</option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.role})
          </option>
        ))}
      </select>
      {error && <span className="text-red-400 text-sm w-full">{error}</span>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !memberId}
          className="px-2 py-1.5 rounded bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
        <button type="button" onClick={onCancel} className="px-2 py-1.5 rounded border border-stage-border text-stage-muted text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TransportSection({
  tourId,
  dateId,
  items,
  travelingGroup,
  allowEdit,
}: {
  tourId: string;
  dateId: string;
  items: Item[];
  travelingGroup: { id: string; name: string; role: string }[];
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(items.length > 0 ? items[0].id : null);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [type, setType] = useState('pickup');
  const [time, setTime] = useState('');
  const [dayAfter, setDayAfter] = useState(false);
  const [driver, setDriver] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.transport.create(tourId, dateId, {
        type,
        time,
        dayAfter,
        driver: driver || undefined,
        driverPhone: driverPhone || undefined,
        driverEmail: driverEmail || undefined,
        company: company || undefined,
        notes: notes || undefined,
      });
      setTime('');
      setDayAfter(false);
      setDriver('');
      setDriverPhone('');
      setDriverEmail('');
      setCompany('');
      setNotes('');
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleAddPassenger(transportId: string, travelGroupMemberId: string) {
    setError('');
    setLoading(true);
    try {
      await api.transport.passengers.add(tourId, dateId, transportId, { travelGroupMemberId });
      setAddingToId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
        <Car className="h-4 w-4" /> Ground transport
      </h3>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {items.length === 0 && !adding ? (
          <div className="p-6 text-center text-stage-muted text-sm">No transport</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const onThisTransport = new Set(item.passengers.map((p) => p.travelGroupMemberId));
              const availableToAdd = travelingGroup.filter((m) => !onThisTransport.has(m.id));
              const isAdding = addingToId === item.id;
              const transportPassengerLabels = shortPassengerLabels(item.passengers.map((p) => p.name));
              return (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="flex items-center gap-2 text-left w-full"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-stage-muted shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-stage-muted shrink-0" />
                        )}
                        <p className="font-medium text-white capitalize">
                          {item.type}
                          <span className="text-stage-accent font-mono text-sm ml-2">{item.time}</span>
                          {item.passengers.length > 0 && (
                            <span className="text-stage-muted text-xs font-normal ml-2">
                              ({item.passengers.length} people)
                            </span>
                          )}
                        </p>
                      </button>
                      {(item.driver || item.company) && (
                        <p className="text-stage-muted text-sm mt-1 ml-6">
                          {[item.driver, item.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {(item.driverPhone || item.driverEmail) && (
                        <div className="flex flex-wrap gap-3 mt-2 ml-6">
                          {item.driverPhone && (
                            <a
                              href={`tel:${item.driverPhone}`}
                              className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" /> {item.driverPhone}
                            </a>
                          )}
                          {item.driverEmail && (
                            <a
                              href={`mailto:${item.driverEmail}`}
                              className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                            >
                              <Mail className="h-3.5 w-3.5" /> {item.driverEmail}
                            </a>
                          )}
                        </div>
                      )}
                      {item.notes && <p className="text-sm text-zinc-400 mt-1 ml-6">{item.notes}</p>}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 ml-6 border-t border-stage-border pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-stage-muted" />
                        <span className="text-sm font-medium text-zinc-400">Passengers</span>
                      </div>
                      {item.passengers.length > 0 ? (
                        <ul className="space-y-2">
                          {item.passengers.map((p, idx) => (
                            <li key={p.id} className="flex items-center justify-between gap-2">
                              <span className="text-sm text-white">
                                {transportPassengerLabels[idx] ?? p.name}
                                {p.role && <span className="text-stage-muted"> ({p.role})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-stage-muted">No passengers assigned</p>
                      )}
                      {allowEdit && availableToAdd.length > 0 && (
                        <div>
                          {isAdding ? (
                            <AddPassengerForm
                              available={availableToAdd}
                              onAdd={(memberId) => handleAddPassenger(item.id, memberId)}
                              onCancel={() => setAddingToId(null)}
                              loading={loading}
                              error={error}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingToId(item.id)}
                              className="text-sm text-stage-accent hover:underline flex items-center gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add passenger
                            </button>
                          )}
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
                <label className="block text-xs text-stage-muted mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                >
                  <option value="pickup">Pickup</option>
                  <option value="bus">Bus</option>
                  <option value="nightliner">Nightliner</option>
                  <option value="car">Car</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-stage-muted mb-1">Time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full min-w-[100px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
                  />
                  <label className="flex items-center gap-1.5 text-sm text-stage-muted whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayAfter}
                      onChange={(e) => setDayAfter(e.target.checked)}
                      className="rounded border-stage-border bg-stage-surface text-stage-accent"
                    />
                    Day after
                  </label>
                </div>
              </div>
            </div>
            <input
              type="text"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              placeholder="Driver"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Driver phone"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="email"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                placeholder="Driver email"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
            </div>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                Add
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
            <Plus className="h-4 w-4" /> Add transport
          </button>
        )}
      </div>
    </section>
  );
}
