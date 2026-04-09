'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, X } from 'lucide-react';
import { api } from '@/lib/api';

export function ProjectOwnerSection({
  projectId,
  initialOwner,
  allowEdit,
}: {
  projectId: string;
  initialOwner: { id: string; name: string } | null;
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [owner, setOwner] = useState(initialOwner);
  const [showPicker, setShowPicker] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOwner(initialOwner);
  }, [initialOwner]);

  useEffect(() => {
    if (!showPicker) return;
    setSearching(true);
    api.people
      .list({ q: q || undefined })
      .then(setResults)
      .finally(() => setSearching(false));
  }, [q, showPicker]);

  async function selectPerson(id: string, name: string) {
    setSaving(true);
    setError('');
    try {
      await api.projects.update(projectId, { ownerId: id });
      setOwner({ id, name });
      setShowPicker(false);
      setQ('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function clearOwner() {
    setSaving(true);
    setError('');
    try {
      await api.projects.update(projectId, { ownerId: null });
      setOwner(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-stage-border/80 bg-stage-card/60 p-4 mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan mb-2">Project owner</p>
      <p className="text-xs text-stage-muted mb-3">
        Person responsible for this project (artist rep, manager, etc.). Optional.
      </p>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      {owner ? (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border min-w-0 flex-1 sm:flex-initial">
            <User className="h-4 w-4 text-stage-muted shrink-0" />
            <span className="text-sm text-white truncate">{owner.name}</span>
          </div>
          {allowEdit && (
            <button
              type="button"
              onClick={() => void clearOwner()}
              disabled={saving}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-stage-border text-xs text-stage-muted hover:text-red-400 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-stage-muted mb-2">No project owner set.</p>
      )}
      {allowEdit && !showPicker && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          disabled={saving}
          className="text-sm text-stage-accent hover:underline disabled:opacity-50"
        >
          {owner ? 'Change project owner' : 'Choose project owner'}
        </button>
      )}
      {allowEdit && showPicker && (
        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              autoFocus
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-stage-border divide-y divide-stage-border">
            {searching ? (
              <p className="p-3 text-stage-muted text-sm text-center">Loading…</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-stage-muted text-sm text-center">No people found</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void selectPerson(p.id, p.name)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-stage-surface disabled:opacity-50"
                >
                  <User className="h-4 w-4 text-stage-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-stage-muted capitalize">{p.type.replace('_', ' ')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPicker(false);
              setQ('');
            }}
            className="text-sm text-stage-muted hover:text-stage-fg"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
