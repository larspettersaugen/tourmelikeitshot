'use client';

import { Building2, Plus, Users, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { format, addDays } from 'date-fns';

type HotelGuest = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  personId?: string | null;
};
type HotelItem = {
  id: string;
  name: string;
  address: string | null;
  checkIn: string;
  checkOut: string;
  notes: string | null;
  guests: HotelGuest[];
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

function AddGuestForm({
  available,
  onAddBatch,
  onCancel,
  loading,
  error,
  hideCancel,
}: {
  available: TravelMember[];
  onAddBatch: (memberIds: string[]) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
  hideCancel?: boolean;
}) {
  const [memberId, setMemberId] = useState('');
  const [subgroupToAdd, setSubgroupToAdd] = useState<string | null>(null);
  const bySubgroup = groupBySubgroup(available);
  const subgroupKeys = Array.from(bySubgroup.keys()).sort((a, b) => (a || '').localeCompare(b || ''));
  const subgroupMembers = subgroupToAdd ? (bySubgroup.get(subgroupToAdd) ?? []) : [];

  function doAdd() {
    const ids: string[] = [];
    const seen = new Set<string>();
    if (memberId && !seen.has(memberId)) {
      ids.push(memberId);
      seen.add(memberId);
    }
    if (subgroupToAdd && subgroupMembers.length > 0) {
      for (const m of subgroupMembers) {
        if (!seen.has(m.id)) {
          ids.push(m.id);
          seen.add(m.id);
        }
      }
    }
    if (ids.length > 0) {
      onAddBatch(ids);
      setMemberId('');
      setSubgroupToAdd(null);
    }
  }

  const hasSinglePerson = !!memberId;
  const hasSubgroup = !!subgroupToAdd && subgroupMembers.length > 0;
  const canAdd = (hasSinglePerson || hasSubgroup) && !loading;

  function handleAddAllPeople() {
    if (available.length === 0 || loading) return;
    onAddBatch(available.map((m) => m.id));
  }

  return (
    <div className="space-y-3">
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
      </div>
      <div className="pt-2 border-t border-stage-border space-y-2">
        <p className="text-xs font-semibold text-stage-muted">Add subgroup</p>
        {subgroupKeys.filter((k) => k != null).length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={subgroupToAdd ?? ''}
              onChange={(e) => setSubgroupToAdd(e.target.value || null)}
              className="px-2 py-1.5 rounded bg-stage-surface border border-stage-border text-white text-sm min-w-[120px]"
            >
              <option value="">Select subgroup</option>
              {subgroupKeys.filter((k) => k != null).map((key) => (
                <option key={key!} value={key!}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-stage-muted">No subgroups in the traveling group.</p>
        )}
      </div>
      {error && <span className="text-red-400 text-sm block">{error}</span>}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={doAdd}
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

export function HotelSection({
  tourId,
  dateId,
  items,
  travelingGroup,
  allowEdit,
  date,
  hideEmptyMessage,
}: {
  tourId: string;
  dateId: string;
  items: HotelItem[];
  travelingGroup: TravelMember[];
  allowEdit: boolean;
  date?: string;
  hideEmptyMessage?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingGuests, setPendingGuests] = useState<{ travelGroupMemberId: string; name: string; role: string }[]>([]);

  const defaultCheckIn = date ? `${date}T15:00` : '';
  const defaultCheckOut = date ? `${format(addDays(new Date(date), 1), 'yyyy-MM-dd')}T11:00` : '';

  const allAssignedToHotels = new Set(items.flatMap((i) => i.guests.map((g) => g.travelGroupMemberId)));
  const availableForNewHotel = travelingGroup.filter(
    (m) => !allAssignedToHotels.has(m.id) && !pendingGuests.some((p) => p.travelGroupMemberId === m.id)
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { id: hotelId } = await api.hotel.create(tourId, dateId, {
        name,
        address: address || undefined,
        checkIn: new Date(checkIn || defaultCheckIn).toISOString(),
        checkOut: new Date(checkOut || defaultCheckOut).toISOString(),
        notes: notes || undefined,
      });
      for (const g of pendingGuests) {
        await api.hotel.guests.add(tourId, dateId, hotelId, {
          travelGroupMemberId: g.travelGroupMemberId,
        });
      }
      setName('');
      setAddress('');
      setCheckIn('');
      setCheckOut('');
      setNotes('');
      setPendingGuests([]);
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  function addPendingGuests(memberIds: string[]) {
    const existing = new Set(pendingGuests.map((p) => p.travelGroupMemberId));
    const toAdd = memberIds
      .filter((id) => !existing.has(id))
      .map((id) => travelingGroup.find((x) => x.id === id))
      .filter((m): m is TravelMember => !!m)
      .map((m) => ({ travelGroupMemberId: m.id, name: m.name, role: m.role }));
    if (toAdd.length > 0) setPendingGuests((prev) => [...prev, ...toAdd]);
  }

  function removePendingGuest(travelGroupMemberId: string) {
    setPendingGuests((prev) => prev.filter((p) => p.travelGroupMemberId !== travelGroupMemberId));
  }

  function startEditing(h: HotelItem) {
    setEditingId(h.id);
    setName(h.name);
    setAddress(h.address || '');
    setCheckIn(format(new Date(h.checkIn), "yyyy-MM-dd'T'HH:mm"));
    setCheckOut(format(new Date(h.checkOut), "yyyy-MM-dd'T'HH:mm"));
    setNotes(h.notes || '');
  }

  function cancelEditing() {
    setEditingId(null);
    setError('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setLoading(true);
    try {
      await api.hotel.update(tourId, dateId, editingId, {
        name,
        address: address || null,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        notes: notes || null,
      });
      cancelEditing();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGuests(hotelId: string, memberIds: string[]) {
    setError('');
    setLoading(true);
    try {
      for (const travelGroupMemberId of memberIds) {
        await api.hotel.guests.add(tourId, dateId, hotelId, { travelGroupMemberId });
      }
      setAddingToId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(hotelId: string) {
    if (!confirm('Delete this hotel? Guests will be unassigned.')) return;
    setError('');
    setLoading(true);
    try {
      await api.hotel.delete(tourId, dateId, hotelId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 opacity-90" /> Hotel
      </h3>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden shadow-card-inset ring-1 ring-white/[0.04]">
        {items.length === 0 && !adding ? (
          <div className="p-6 text-center text-stage-muted text-sm">No hotel</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const onThisHotel = new Set(item.guests.map((g) => g.travelGroupMemberId));
              const availableToAdd = travelingGroup.filter((m) => !onThisHotel.has(m.id));
              const isAdding = addingToId === item.id;
              const isEditing = editingId === item.id;
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
                        <p className="font-medium text-white">
                          {item.name}
                          {item.guests.length > 0 && (
                            <span className="text-stage-muted text-xs font-normal ml-2">
                              ({item.guests.length} {item.guests.length === 1 ? 'person' : 'people'})
                            </span>
                          )}
                        </p>
                      </button>
                      <p className="text-stage-muted text-sm mt-1 ml-6">
                        {format(new Date(item.checkIn), 'MMM d, HH:mm')} – {format(new Date(item.checkOut), 'MMM d, HH:mm')}
                      </p>
                      {item.address && (
                        <p className="text-stage-muted text-sm mt-0.5 ml-6">{item.address}</p>
                      )}
                      {item.notes && (
                        <p className="text-stage-muted text-sm mt-0.5 ml-6">{item.notes}</p>
                      )}
                    </div>
                    {allowEdit && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          disabled={loading}
                          className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10 disabled:opacity-50"
                          aria-label="Edit hotel"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={loading}
                          className="p-1.5 rounded text-stage-muted hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          aria-label="Delete hotel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <form onSubmit={handleUpdate} className="mt-4 ml-6 border-t border-stage-border pt-4 space-y-3">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Hotel name"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                      />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Address"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Check-in</label>
                          <input
                            type="datetime-local"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Check-out</label>
                          <input
                            type="datetime-local"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                      </div>
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
                          Save
                        </button>
                        <button type="button" onClick={cancelEditing} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {isExpanded && !isEditing && (
                    <div className="mt-4 ml-6 border-t border-stage-border pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-stage-muted" />
                        <span className="text-sm font-medium text-zinc-400">Guests</span>
                      </div>
                      {item.guests.length > 0 ? (
                        <ul className="space-y-2">
                          {item.guests.map((g) => (
                            <li key={g.id} className="text-sm text-white">
                              {g.name}
                              {g.role && <span className="text-stage-muted"> ({g.role})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : hideEmptyMessage ? null : (
                        <p className="text-sm text-stage-muted">No guests assigned</p>
                      )}
                      {allowEdit && availableToAdd.length > 0 && (
                        <div>
                          {isAdding ? (
                            <AddGuestForm
                              available={availableToAdd}
                              onAddBatch={(memberIds) => handleAddGuests(item.id, memberIds)}
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
                              <Plus className="h-3.5 w-3.5" /> Add guest
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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Hotel name"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-stage-muted mb-1">Check-in</label>
                <input
                  type="datetime-local"
                  value={checkIn || defaultCheckIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-stage-muted mb-1">Check-out</label>
                <input
                  type="datetime-local"
                  value={checkOut || defaultCheckOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                />
              </div>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            {travelingGroup.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-stage-muted" />
                  <span className="text-sm font-medium text-zinc-400">Guests</span>
                </div>
                {pendingGuests.length > 0 && (
                  <ul className="space-y-1.5">
                    {pendingGuests.map((g) => (
                      <li key={g.travelGroupMemberId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-white">
                          {g.name}
                          {g.role && <span className="text-stage-muted"> ({g.role})</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingGuest(g.travelGroupMemberId)}
                          className="text-stage-muted hover:text-red-400 text-xs"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {availableForNewHotel.length > 0 && (
                  <AddGuestForm
                    key={pendingGuests.map((p) => p.travelGroupMemberId).join(',')}
                    available={availableForNewHotel}
                    onAddBatch={addPendingGuests}
                    onCancel={() => {}}
                    loading={false}
                    error=""
                    hideCancel
                  />
                )}
                {availableForNewHotel.length === 0 && pendingGuests.length === 0 && (
                  <p className="text-sm text-stage-muted">All traveling group members are already assigned to hotels.</p>
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
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setError(''); setPendingGuests([]); }}
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
            className={`w-full flex items-center justify-center gap-2 border-t border-stage-border text-stage-muted hover:text-stage-accent ${
              items.length > 0 ? 'py-2 text-sm' : 'p-3'
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> {items.length > 0 ? 'Add another hotel' : 'Add hotel'}
          </button>
        )}
      </div>
    </section>
  );
}
