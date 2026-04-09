'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { tryShowDatePicker } from '@/lib/date-input-show-picker';

export default function NewTourPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be before start date');
      return;
    }
    setLoading(true);
    try {
      const { id } = await api.projects.createTour(projectId, {
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      router.push(`/dashboard/tours/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tour');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-neonCyan transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">New tour</h1>
      <p className="text-stage-muted text-sm mb-6">
        Add a tour for this project, e.g. &quot;Oppe På Månen Tour&quot;
      </p>
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-accentFg font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create tour'}
          </button>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="py-2.5 px-4 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
