'use client';

import { ClipboardList, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export type GuestListEntry = {
  id: string;
  name: string;
  ticketCount: number;
  representing: string | null;
  phone: string | null;
  sortOrder: number;
  createdAt: string;
};

export function GuestListSection({
  tourId,
  dateId,
  capacity,
  capacityLocked,
  entries,
  allowEdit,
}: {
  tourId: string;
  dateId: string;
  capacity: number | null;
  capacityLocked: boolean;
  entries: GuestListEntry[];
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capacityInput, setCapacityInput] = useState(capacity == null ? '' : String(capacity));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTickets, setFormTickets] = useState('1');
  const [formRepresenting, setFormRepresenting] = useState('');
  const [formPhone, setFormPhone] = useState('');

  useEffect(() => {
    setCapacityInput(capacity == null ? '' : String(capacity));
  }, [capacity]);

  /** Cleared when server `capacityLocked` updates after refresh — until then, UI follows this for instant lock/unlock. */
  const [optimisticLocked, setOptimisticLocked] = useState<boolean | null>(null);
  useEffect(() => {
    setOptimisticLocked(null);
  }, [capacityLocked]);

  const displayLocked = optimisticLocked ?? capacityLocked;

  const ticketsUsed = entries.reduce((sum, e) => sum + e.ticketCount, 0);
  const remaining = capacity != null ? capacity - ticketsUsed : null;
  const overLockedLimit =
    displayLocked && capacity != null && remaining != null && remaining < 0;

  const formTicketsParsed = Number(formTickets);
  const formTicketsValid =
    Number.isFinite(formTicketsParsed) &&
    formTicketsParsed >= 1 &&
    Number.isInteger(formTicketsParsed);
  let formWouldExceedLockedLimit = false;
  if (displayLocked && capacity != null && formTicketsValid) {
    if (adding) {
      formWouldExceedLockedLimit = ticketsUsed + formTicketsParsed > capacity;
    } else if (editingId) {
      const prev = entries.find((x) => x.id === editingId)?.ticketCount ?? 0;
      formWouldExceedLockedLimit = ticketsUsed - prev + formTicketsParsed > capacity;
    }
  }

  function parseCapacityFromInput(): number | null {
    const t = capacityInput.trim();
    if (t === '') return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
    return n;
  }

  async function toggleCapacityLock(lock: boolean) {
    setError('');
    let capacityToSaveWithLock: number | null = null;
    if (lock && capacity == null) {
      capacityToSaveWithLock = parseCapacityFromInput();
      if (capacityToSaveWithLock === null) {
        setError('Enter a valid whole number (≥ 0) in the box before locking.');
        return;
      }
    }
    setOptimisticLocked(lock);
    setLoading(true);
    try {
      if (!lock) {
        await api.dates.update(tourId, dateId, { guestListCapacityLocked: false });
      } else if (capacity != null) {
        await api.dates.update(tourId, dateId, { guestListCapacityLocked: true });
      } else if (capacityToSaveWithLock != null) {
        await api.dates.update(tourId, dateId, {
          guestListCapacity: capacityToSaveWithLock,
          guestListCapacityLocked: true,
        });
      }
      void router.refresh();
    } catch (err) {
      setOptimisticLocked(null);
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function saveCapacity() {
    setError('');
    if (displayLocked) {
      setError('Unlock the limit before changing guest list spots.');
      return;
    }
    const trimmed = capacityInput.trim();
    if (trimmed === '') {
      setLoading(true);
      try {
        await api.dates.update(tourId, dateId, { guestListCapacity: null });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setError('Guest list spots must be a whole number ≥ 0, or empty to clear.');
      return;
    }
    setLoading(true);
    try {
      await api.dates.update(tourId, dateId, { guestListCapacity: n });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(e: GuestListEntry) {
    setEditingId(e.id);
    setFormName(e.name);
    setFormTickets(String(e.ticketCount));
    setFormRepresenting(e.representing || '');
    setFormPhone(e.phone || '');
    setAdding(false);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setAdding(false);
    setFormName('');
    setFormTickets('1');
    setFormRepresenting('');
    setFormPhone('');
    setError('');
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    const tc = Number(formTickets);
    if (!Number.isFinite(tc) || tc < 1 || !Number.isInteger(tc)) {
      setError('Tickets must be a positive whole number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.dates.guestList.create(tourId, dateId, {
        name,
        ticketCount: tc,
        representing: formRepresenting.trim() || null,
        phone: formPhone.trim() || null,
      });
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function submitUpdate(entryId: string, e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    const tc = Number(formTickets);
    if (!Number.isFinite(tc) || tc < 1 || !Number.isInteger(tc)) {
      setError('Tickets must be a positive whole number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.dates.guestList.update(tourId, dateId, entryId, {
        name,
        ticketCount: tc,
        representing: formRepresenting.trim() || null,
        phone: formPhone.trim() || null,
      });
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Remove this person from the guest list?')) return;
    setError('');
    setLoading(true);
    try {
      await api.dates.guestList.delete(tourId, dateId, entryId);
      if (editingId === entryId) cancelEdit();
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
        <ClipboardList className="h-4 w-4" /> Guest list
      </h3>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        <div className="p-4 border-b border-stage-border space-y-3">
          <p className="text-xs font-semibold text-stage-muted">Guest list spots (total)</p>
          {allowEdit ? (
            <div className="flex flex-wrap items-end gap-2 w-full justify-between">
              <div className="flex flex-wrap items-end gap-2 min-w-0">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={capacityInput}
                  onChange={(ev) => setCapacityInput(ev.target.value)}
                  placeholder="e.g. 20"
                  disabled={displayLocked}
                  className="w-28 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => toggleCapacityLock(!displayLocked)}
                  disabled={loading}
                  className={
                    displayLocked
                      ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 hover:border-amber-400 text-sm font-medium disabled:opacity-50'
                      : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:bg-stage-surface/80 text-sm disabled:opacity-50'
                  }
                >
                  {displayLocked ? (
                    <>
                      <Unlock className="h-4 w-4" /> Unlock limit
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Lock limit
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={saveCapacity}
                disabled={loading || displayLocked}
                className="px-3 py-2 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50 shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-white">{capacity == null ? '—' : capacity}</p>
          )}
          {remaining != null && (
            <p
              className={`text-sm font-semibold tabular-nums ${
                remaining >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              Remaining: {remaining}
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xs text-stage-muted">Tickets on list: {ticketsUsed}</p>
            {overLockedLimit && (
              <p className="text-xs text-red-400 shrink-0">Over locked limit, please reduce.</p>
            )}
          </div>
        </div>

        {entries.length === 0 && !adding && !editingId ? (
          <div className="p-6 text-center text-stage-muted text-sm">No names on the guest list yet.</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {entries.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <li key={row.id} className="p-4">
                  {isEditing ? (
                    <form onSubmit={(ev) => submitUpdate(row.id, ev)} className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Name</label>
                          <input
                            value={formName}
                            onChange={(ev) => setFormName(ev.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Tickets</label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={formTickets}
                            onChange={(ev) => setFormTickets(ev.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Representing</label>
                          <input
                            value={formRepresenting}
                            onChange={(ev) => setFormRepresenting(ev.target.value)}
                            placeholder="Label, company, project…"
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm placeholder-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Phone</label>
                          <input
                            value={formPhone}
                            onChange={(ev) => setFormPhone(ev.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                          />
                        </div>
                      </div>
                      {formWouldExceedLockedLimit && (
                        <p className="text-sm text-amber-400">
                          This would go over the locked limit—you can save, but fix the limit or tickets when you can.
                        </p>
                      )}
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white">
                          {row.name}
                          <span className="text-stage-muted text-sm font-normal ml-2">
                            {row.ticketCount} {row.ticketCount === 1 ? 'ticket' : 'tickets'}
                          </span>
                        </p>
                        {(row.representing || row.phone) && (
                          <p className="text-stage-muted text-sm mt-1">
                            {row.representing && <span>{row.representing}</span>}
                            {row.representing && row.phone && <span className="mx-1">·</span>}
                            {row.phone && <span>{row.phone}</span>}
                          </p>
                        )}
                      </div>
                      {allowEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            disabled={loading}
                            className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10 disabled:opacity-50"
                            aria-label="Edit guest list entry"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            disabled={loading}
                            className="p-1.5 rounded text-stage-muted hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            aria-label="Remove from guest list"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {allowEdit && adding && (
          <div className="p-4 border-t border-stage-border">
            <form onSubmit={submitCreate} className="space-y-3">
              <p className="text-xs font-semibold text-stage-muted">Add person</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-stage-muted mb-1">Name</label>
                  <input
                    value={formName}
                    onChange={(ev) => setFormName(ev.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stage-muted mb-1">Tickets</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formTickets}
                    onChange={(ev) => setFormTickets(ev.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stage-muted mb-1">Representing</label>
                  <input
                    value={formRepresenting}
                    onChange={(ev) => setFormRepresenting(ev.target.value)}
                    placeholder="Label, company, project…"
                    className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stage-muted mb-1">Phone</label>
                  <input
                    value={formPhone}
                    onChange={(ev) => setFormPhone(ev.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white text-sm"
                  />
                </div>
              </div>
              {formWouldExceedLockedLimit && (
                <p className="text-sm text-amber-400">
                  This would go over the locked limit—you can save, but fix the limit or tickets when you can.
                </p>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {allowEdit && !adding && !editingId && (
          <div className="p-3 border-t border-stage-border">
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setFormName('');
                setFormTickets('1');
                setFormRepresenting('');
                setFormPhone('');
                setError('');
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-white text-sm disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add person
            </button>
          </div>
        )}

        {allowEdit && error && !adding && !editingId && <p className="px-4 pb-4 text-red-400 text-sm">{error}</p>}
      </div>
    </section>
  );
}
