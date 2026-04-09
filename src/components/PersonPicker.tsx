'use client';

import { Search, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type Person = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export function PersonPicker({
  onSelect,
  onSelectMultiple,
  onCancel,
  roleMap,
  excludePersonIds = [],
}: {
  onSelect: (person: Person & { role: string }) => void;
  onSelectMultiple?: (people: (Person & { role: string })[]) => void;
  onCancel: () => void;
  roleMap: (type: string) => string;
  excludePersonIds?: string[];
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const multiSelect = !!onSelectMultiple;
  const availablePeople = people;

  const excludeKey = [...excludePersonIds].sort().join('|');

  useEffect(() => {
    setLoading(true);
    const exclude = new Set(excludePersonIds);
    api.people.list({ q: q || undefined }).then((list) => {
      setPeople(list.filter((p) => !exclude.has(p.id)));
      setLoading(false);
    });
  }, [q, excludeKey, excludePersonIds]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(availablePeople.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleAddSelected() {
    if (!onSelectMultiple || selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const exclude = new Set(excludePersonIds);
      const list = await api.people.list();
      const toAdd = list
        .filter((p) => !exclude.has(p.id) && selectedIds.has(p.id))
        .map((p) => ({ ...p, role: roleMap(p.type) }));
      if (toAdd.length > 0) {
        onSelectMultiple(toAdd);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 border-t border-stage-border space-y-3">
      <p className="text-xs text-stage-muted">Add from people database</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          autoFocus
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-stage-border divide-y divide-stage-border">
        {loading ? (
          <div className="p-4 text-center text-stage-muted text-sm">Loading...</div>
        ) : people.length === 0 ? (
          <div className="p-4 text-center text-stage-muted text-sm">No people found</div>
        ) : multiSelect ? (
          <>
            <div className="flex gap-2 p-2 border-b border-stage-border sticky top-0 bg-stage-card">
              <button type="button" onClick={selectAll} className="text-xs text-stage-muted hover:text-stage-fg">
                Select all
              </button>
              <button type="button" onClick={clearSelection} className="text-xs text-stage-muted hover:text-stage-fg">
                Clear
              </button>
            </div>
            {availablePeople.map((p) => (
              <label
                key={p.id}
                className="w-full flex items-center gap-3 p-3 cursor-pointer hover:bg-stage-surface has-[:checked]:bg-stage-accent/10"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelection(p.id)}
                  className="rounded border-stage-border w-4 h-4 accent-stage-accent"
                />
                <User className="h-4 w-4 text-stage-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-stage-muted capitalize">{p.type.replace('_', ' ')}</p>
                </div>
              </label>
            ))}
          </>
        ) : (
          people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect({ ...p, role: roleMap(p.type) })}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-stage-surface"
            >
              <User className="h-4 w-4 text-stage-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white truncate">{p.name}</p>
                <p className="text-xs text-stage-muted capitalize">{p.type.replace('_', ' ')}</p>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {multiSelect && (
          <button
            type="button"
            onClick={() => void handleAddSelected()}
            disabled={selectedIds.size === 0 || submitting}
            className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}selected
          </button>
        )}
        <button type="button" onClick={onCancel} className="text-sm text-stage-muted hover:text-stage-fg">
          Cancel
        </button>
      </div>
    </div>
  );
}
