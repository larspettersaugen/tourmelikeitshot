'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, MapPin, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { googleMapsSearchUrl } from '@/lib/google-maps-url';
import { VENUE_CATEGORY_LABELS, type VenueCategorySlug } from '@/lib/venue-category';

export type VenueRow = {
  id: string;
  category: VenueCategorySlug;
  name: string;
  city: string;
  address: string | null;
  capacity: number | null;
  notes: string | null;
  loadInNotes: string | null;
  cateringNotes: string | null;
  accessNotes: string | null;
};

export function VenuesContent({
  initialVenues,
  allowEdit,
}: {
  initialVenues: VenueRow[];
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueRow[]>(initialVenues);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<VenueCategorySlug>('venue');

  useEffect(() => {
    setVenues(initialVenues);
  }, [initialVenues]);

  const filtered = venues.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) ||
      VENUE_CATEGORY_LABELS[v.category].toLowerCase().includes(q) ||
      (v.address?.toLowerCase().includes(q) ?? false) ||
      (v.notes?.toLowerCase().includes(q) ?? false) ||
      (v.loadInNotes?.toLowerCase().includes(q) ?? false) ||
      (v.cateringNotes?.toLowerCase().includes(q) ?? false) ||
      (v.accessNotes?.toLowerCase().includes(q) ?? false) ||
      (v.capacity != null && String(v.capacity).includes(q))
    );
  });

  function resetForm() {
    setName('');
    setCity('');
    setAddress('');
    setCategory('venue');
    setError('');
    setAdding(false);
  }

  async function refreshList() {
    const list = await api.venues.list();
    setVenues(list);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await api.venues.create({
        name: name.trim(),
        city: city.trim(),
        category,
        address: address.trim() || undefined,
      });
      await refreshList();
      resetForm();
      router.push(`/dashboard/venues/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this venue from the list?')) return;
    setError('');
    try {
      await api.venues.delete(id);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stage-muted">
        Reference list of places you play or might play. Open a venue for its profile (contacts, load-in, catering,
        access). Tour dates still use their own venue and city fields.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by venue, city, address…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        {allowEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add venue
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4 space-y-3"
        >
          <h3 className="text-sm font-medium text-white">New venue</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Venue name"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder="City"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address (optional)"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <label className="block space-y-1">
            <span className="text-xs text-stage-muted">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VenueCategorySlug)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            >
              <option value="venue">{VENUE_CATEGORY_LABELS.venue}</option>
              <option value="festival">{VENUE_CATEGORY_LABELS.festival}</option>
            </select>
          </label>
          <p className="text-xs text-stage-muted">After adding, you’ll open the venue profile for detailed notes and contacts.</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Add & open profile'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!adding && error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-stage-muted text-sm">
            {venues.length === 0 ? 'No venues yet' : 'No matches'}
          </div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {filtered.map((v) => (
              <li key={v.id} className="flex items-stretch divide-x divide-stage-border/50">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/venues/${v.id}`}
                    className="block p-4 hover:bg-stage-surface/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">
                          {v.name}
                          <span className="font-normal text-stage-muted"> · {VENUE_CATEGORY_LABELS[v.category]}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-stage-muted mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {v.city}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-stage-muted shrink-0 mt-0.5" aria-hidden />
                    </div>
                  </Link>
                  {v.address && (
                    <div className="px-4 pb-4 -mt-1">
                      <a
                        href={googleMapsSearchUrl(v.address, v.city)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-400 hover:text-stage-accent hover:underline"
                      >
                        {v.address}
                      </a>
                    </div>
                  )}
                </div>
                {allowEdit && (
                  <div className="flex items-center gap-1 shrink-0 px-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="p-1.5 rounded text-stage-muted hover:text-red-400 hover:bg-stage-surface"
                      aria-label="Delete venue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
