'use client';

import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type VenueContact = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  venueId: string | null;
  venue: { id: string; name: string; city: string } | null;
};

export function VenueContactPicker({
  onSelect,
  onCancel,
  variant = 'contact',
  /** When set, only list contacts tied to this saved venue */
  filterVenueId,
}: {
  onSelect: (contact: VenueContact) => void;
  onCancel: () => void;
  /** Same picker; title differs for date contacts vs promoter */
  variant?: 'contact' | 'promoter';
  filterVenueId?: string;
}) {
  const [contacts, setContacts] = useState<VenueContact[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.venueContacts
      .list({ q: q || undefined, venueId: filterVenueId || undefined })
      .then((list) => {
        setContacts(list);
      })
      .catch(() => {
        setContacts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [q, filterVenueId]);

  return (
    <div className="p-4 border-t border-stage-border space-y-3">
      <p className="text-sm font-medium text-white">
        {variant === 'promoter' ? 'Choose promoter from venue contacts' : 'Choose from venue contacts'}
      </p>
      <p className="text-xs text-stage-muted">
        {filterVenueId ? 'Contacts linked to this venue. Search by name.' : 'Search by name'}
      </p>
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
      {loading ? (
        <p className="text-sm text-stage-muted">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-stage-muted">No venue contacts found</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-1">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-stage-surface text-white text-sm"
              >
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-stage-muted ml-1.5">({c.role})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded border border-stage-border text-stage-muted hover:text-stage-fg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
