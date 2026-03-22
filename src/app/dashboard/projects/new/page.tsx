'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { id } = await api.projects.create({ name: name.trim() });
      router.push(`/dashboard/projects/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-stage-muted hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Artists
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">New project</h1>
      <p className="text-stage-muted text-sm mb-6">
        Add an artist or project name, e.g. &quot;Chris Holsten&quot;
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Chris Holsten"
            className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-stage-accent hover:bg-stage-accentHover text-stage-dark font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create project'}
          </button>
          <Link
            href="/dashboard/projects"
            className="py-2.5 px-4 rounded-lg border border-stage-border text-stage-muted hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
