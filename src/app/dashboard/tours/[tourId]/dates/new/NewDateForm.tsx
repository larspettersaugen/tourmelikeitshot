'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { SHOW_STATUSES } from '@/lib/show-status';
import { DATE_KINDS } from '@/lib/date-kind';
import { tryShowDatePicker } from '@/lib/date-input-show-picker';

export type NewDateVenueOption = {
  id: string;
  name: string;
  city: string;
  address: string | null;
};

function sortVenues(list: NewDateVenueOption[]) {
  return [...list].sort(
    (a, b) => a.city.localeCompare(b.city, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name)
  );
}

function AddVenueModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (row: NewDateVenueOption) => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loadInNotes, setLoadInNotes] = useState('');
  const [cateringNotes, setCateringNotes] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setCity('');
    setAddress('');
    setNotes('');
    setLoadInNotes('');
    setCateringNotes('');
    setAccessNotes('');
    setError('');
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function handleSave() {
    setError('');
    const n = name.trim();
    const c = city.trim();
    if (!n || !c) {
      setError('Venue name and city are required');
      return;
    }
    setSaving(true);
    try {
      const created = await api.venues.create({
        name: n,
        city: c,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        loadInNotes: loadInNotes.trim() || undefined,
        cateringNotes: cateringNotes.trim() || undefined,
        accessNotes: accessNotes.trim() || undefined,
      });
      onSaved({
        id: created.id,
        name: created.name,
        city: created.city,
        address: created.address,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save venue');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-venue-modal-title"
        className="relative z-10 w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-xl border border-stage-border bg-stage-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-stage-border bg-stage-card px-4 py-3">
          <h2 id="add-venue-modal-title" className="text-lg font-semibold text-white">
            Add venue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stage-muted hover:text-white hover:bg-stage-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-stage-muted">
            Saved to your venue directory and selected for this show date.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Venue name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
              placeholder="Room or venue name"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
              placeholder="e.g. Oslo"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Address (optional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
              placeholder="Street, postal code"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">General notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm resize-y min-h-[52px]"
              placeholder="Capacity, quirks…"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Load-in & logistics (optional)</label>
            <textarea
              value={loadInNotes}
              onChange={(e) => setLoadInNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm resize-y min-h-[72px]"
              placeholder="Docks, parking, timing…"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Catering & hospitality (optional)</label>
            <textarea
              value={cateringNotes}
              onChange={(e) => setCateringNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm resize-y min-h-[72px]"
              placeholder="Dressing rooms, guest list…"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Access & security (optional)</label>
            <textarea
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm resize-y min-h-[72px]"
              placeholder="Doors, crew entrance…"
              disabled={saving}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-stage-accent text-stage-accentFg font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save venue'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="py-2.5 px-4 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewDateForm({
  tourId,
  initialVenues,
  allowVenueCreate = false,
}: {
  tourId: string;
  initialVenues: NewDateVenueOption[];
  allowVenueCreate?: boolean;
}) {
  const router = useRouter();
  const [venues, setVenues] = useState<NewDateVenueOption[]>(() => sortVenues(initialVenues));

  useEffect(() => {
    setVenues(sortVenues(initialVenues));
  }, [initialVenues]);

  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kind, setKind] = useState('concert');
  const [status, setStatus] = useState('confirmed');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [addVenueOpen, setAddVenueOpen] = useState(false);
  /** Label for this day on the tour (lists, day header). */
  const [tourDateName, setTourDateName] = useState('');

  function onVenueSelect(venueId: string) {
    setSelectedVenueId(venueId);
    if (!venueId) {
      setVenueName('');
      setTourDateName('');
      return;
    }
    const v = venues.find((x) => x.id === venueId);
    if (v) {
      setVenueName(v.name);
      setCity(v.city);
      setAddress(v.address ?? '');
      setTourDateName(v.name);
    }
  }

  function handleVenueCreated(row: NewDateVenueOption) {
    setVenues((prev) => sortVenues([...prev, row]));
    setSelectedVenueId(row.id);
    setVenueName(row.name);
    setCity(row.city);
    setAddress(row.address ?? '');
    setTourDateName(row.name);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const resolvedVenueName = venueName.trim() || city.trim();
    if (!resolvedVenueName) {
      setError('Choose a venue above or enter a city.');
      return;
    }
    const nameTrim = tourDateName.trim();
    if (!nameTrim) {
      setError('Enter a name for this show date.');
      return;
    }
    setLoading(true);
    try {
      await api.dates.create(tourId, {
        name: nameTrim,
        venueName: resolvedVenueName,
        city,
        date,
        kind,
        status,
        address,
        ...(selectedVenueId ? { venueId: selectedVenueId } : {}),
        ...((kind === 'preproduction' || kind === 'rehearsal') && endDate ? { endDate } : {}),
      });
      router.push(`/dashboard/tours/${tourId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add date');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
      {allowVenueCreate && (
        <AddVenueModal
          open={addVenueOpen}
          onClose={() => setAddVenueOpen(false)}
          onSaved={handleVenueCreated}
        />
      )}
      <Link
        href={`/dashboard/tours/${tourId}`}
        className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-fg mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dates
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Add show date</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
          <input
            type="text"
            value={tourDateName}
            onChange={(e) => setTourDateName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            placeholder="e.g. Sentrum Scene, Oslo — release show"
          />
          <p className="text-xs text-stage-muted mt-1.5">
            How this date appears on the tour. Choosing or adding a venue fills the venue name; you can edit it.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Venue</label>
          <select
            value={selectedVenueId}
            onChange={(e) => onVenueSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
          >
            <option value="">— None —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}, {v.city}
              </option>
            ))}
          </select>
          <p className="text-xs text-stage-muted mt-1.5">
            Picks from your venue directory (or add one). Fills city and address below. With &quot;None&quot;,
            enter city for this show—the name on the tour will match city if no venue is linked.
          </p>
          {allowVenueCreate ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setAddVenueOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-stage-accent hover:underline font-medium"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add venue
              </button>
            </div>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
          >
            {DATE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            placeholder="e.g. Oslo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onClick={(e) => tryShowDatePicker(e.currentTarget)}
            required
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
          />
        </div>
        {(kind === 'preproduction' || kind === 'rehearsal') && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => tryShowDatePicker(e.currentTarget)}
              min={date}
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
          >
            {SHOW_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Address (optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            placeholder="Venue address"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add date'}
          </button>
          <Link
            href={`/dashboard/tours/${tourId}`}
            className="py-2.5 px-4 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
