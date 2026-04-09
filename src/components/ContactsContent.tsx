'use client';

import { Plus, Pencil, Phone, Mail, Search } from 'lucide-react';
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

type VenueOption = { id: string; name: string; city: string };

export function ContactsContent({
  initialContacts,
  initialVenues,
  allowEdit,
}: {
  initialContacts: VenueContact[];
  initialVenues: VenueOption[];
  allowEdit: boolean;
}) {
  const [contacts, setContacts] = useState<VenueContact[]>(initialContacts);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [venueId, setVenueId] = useState<string>('');

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const filtered = contacts.filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  function resetForm() {
    setName('');
    setRole('');
    setPhone('');
    setEmail('');
    setNotes('');
    setVenueId('');
    setError('');
    setAdding(false);
    setEditing(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.venueContacts.create({
        name: name.trim(),
        role: role.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        venueId: venueId.trim() || null,
      });
      const list = await api.venueContacts.list();
      setContacts(list);
      resetForm();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setLoading(true);
    try {
      await api.venueContacts.update(editing, {
        name: name.trim(),
        role: role.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        venueId: venueId.trim() || null,
      });
      const list = await api.venueContacts.list();
      setContacts(list);
      resetForm();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  function startEdit(c: VenueContact) {
    setEditing(c.id);
    setName(c.name);
    setRole(c.role || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setVenueId(c.venueId || '');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        {allowEdit && !adding && !editing && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        )}
      </div>

      {(adding || editing) && (
        <form
          onSubmit={editing ? handleUpdate : handleAdd}
          className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4 space-y-3"
        >
          <h3 className="text-sm font-medium text-white">
            {editing ? 'Edit venue contact' : 'New venue contact'}
          </h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Name"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g. venue, promoter)"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
          <label className="block">
            <span className="text-xs text-stage-muted block mb-1">Linked venue (optional)</span>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            >
              <option value="">— None —</option>
              {initialVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}, {v.city}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
            >
              {loading ? 'Saving…' : editing ? 'Save' : 'Add'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-stage-muted text-sm">
            {contacts.length === 0 ? 'No venue contacts yet' : 'No matches'}
          </div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {filtered.map((c) => (
              <li key={c.id} className="p-4 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {c.name}
                    {c.role && (
                      <span className="ml-1.5 text-sm font-normal text-stage-muted">({c.role})</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" /> {c.email}
                      </a>
                    )}
                  </div>
                  {c.venue && (
                    <p className="text-xs text-stage-muted mt-1">
                      Venue: {c.venue.name}, {c.venue.city}
                    </p>
                  )}
                  {c.notes && <p className="text-sm text-zinc-400 mt-1">{c.notes}</p>}
                </div>
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-surface shrink-0"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
