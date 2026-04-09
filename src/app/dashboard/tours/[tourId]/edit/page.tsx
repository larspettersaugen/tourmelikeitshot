'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, X, User } from 'lucide-react';
import { api } from '@/lib/api';
import { tryShowDatePicker } from '@/lib/date-input-show-picker';

function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export default function EditTourPage() {
  const router = useRouter();
  const params = useParams();
  const tourId = params.tourId as string;
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [managerName, setManagerName] = useState<string | null>(null);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerResults, setManagerResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [managerSearching, setManagerSearching] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    api.tours
      .get(tourId)
      .then((tour) => {
        setName(tour.name);
        setStartDate(formatDateForInput(tour.startDate));
        setEndDate(formatDateForInput(tour.endDate));
        setManagerId(tour.manager?.id ?? null);
        setManagerName(tour.manager?.name ?? null);
        setFetched(true);
      })
      .catch(() => setError('Failed to load tour'));
  }, [tourId]);

  useEffect(() => {
    if (!showManagerPicker) return;
    setManagerSearching(true);
    api.people
      .list({ q: managerSearch || undefined })
      .then((list) => setManagerResults(list))
      .finally(() => setManagerSearching(false));
  }, [managerSearch, showManagerPicker]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be before start date');
      return;
    }
    setLoading(true);
    try {
      await api.tours.update(tourId, {
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        managerId: managerId,
      });
      router.push(`/dashboard/tours/${tourId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tour');
      setLoading(false);
    }
  }

  if (!fetched && !error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
        <p className="text-stage-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
      <Link
        href={`/dashboard/tours/${tourId}`}
        className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-neonCyan transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Edit tour</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Tour name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Oppe På Månen Tour"
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => tryShowDatePicker(e.currentTarget)}
              max={endDate || undefined}
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => tryShowDatePicker(e.currentTarget)}
              min={startDate || undefined}
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Tour owner</label>
          {managerId && managerName ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-stage-card border border-stage-border">
              <User className="h-4 w-4 text-stage-muted shrink-0" />
              <span className="text-sm text-white flex-1">{managerName}</span>
              <button
                type="button"
                onClick={() => {
                  setManagerId(null);
                  setManagerName(null);
                }}
                className="p-1 rounded text-stage-muted hover:text-red-400"
                aria-label="Remove tour owner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : showManagerPicker ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
                <input
                  type="text"
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  placeholder="Search people..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-stage-border divide-y divide-stage-border">
                {managerSearching ? (
                  <p className="p-3 text-stage-muted text-sm text-center">Loading...</p>
                ) : managerResults.length === 0 ? (
                  <p className="p-3 text-stage-muted text-sm text-center">No people found</p>
                ) : (
                  managerResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setManagerId(p.id);
                        setManagerName(p.name);
                        setShowManagerPicker(false);
                        setManagerSearch('');
                      }}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-stage-surface"
                    >
                      <User className="h-4 w-4 text-stage-muted shrink-0" />
                      <div>
                        <p className="text-sm text-white">{p.name}</p>
                        <p className="text-xs text-stage-muted capitalize">{p.type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManagerPicker(false);
                  setManagerSearch('');
                }}
                className="text-sm text-stage-muted hover:text-stage-fg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowManagerPicker(true)}
              className="text-sm text-stage-accent hover:underline"
            >
              Select tour owner
            </button>
          )}
          <p className="text-xs text-stage-muted mt-1">Person responsible for managing this tour (optional).</p>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save changes'}
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
