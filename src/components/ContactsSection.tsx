'use client';

import { Users, Plus, Phone, Mail, UserPlus, Trash2, PenLine } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { VenueContactPicker } from './VenueContactPicker';

type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tourDateId: string | null;
};

export function ContactsSection({
  tourId,
  dateId,
  items,
  allowEdit,
  compact,
  embedded,
}: {
  tourId: string;
  dateId: string;
  items: Contact[];
  allowEdit: boolean;
  compact?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  /** picker = venue list first (default); manual = type new contact */
  const [addPhase, setAddPhase] = useState<'picker' | 'manual'>('picker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [personId, setPersonId] = useState<string | undefined>();
  const [venueContactId, setVenueContactId] = useState<string | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(contactId: string) {
    setError('');
    setDeletingId(contactId);
    try {
      await api.contacts.delete(tourId, contactId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setDeletingId(null);
    }
  }

  function resetAddForm() {
    setName('');
    setRole('');
    setPhone('');
    setEmail('');
    setNotes('');
    setPersonId(undefined);
    setVenueContactId(undefined);
  }

  function openAddFlow() {
    setError('');
    resetAddForm();
    setAddPhase('picker');
    setAdding(true);
  }

  function closeAddFlow() {
    setAdding(false);
    setError('');
    setAddPhase('picker');
    resetAddForm();
  }

  async function handlePickerSelect(p: {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }) {
    setError('');
    setLoading(true);
    try {
      await api.contacts.create(tourId, {
        name: p.name,
        role: p.role?.trim() || 'Contact',
        phone: p.phone || undefined,
        email: p.email || undefined,
        notes: p.notes || undefined,
        tourDateId: dateId,
        venueContactId: p.id,
      });
      closeAddFlow();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.contacts.create(tourId, {
        name,
        role: role.trim() || 'Contact',
        phone: phone || undefined,
        email: email || undefined,
        notes: notes || undefined,
        tourDateId: dateId,
        personId,
        venueContactId,
      });
      resetAddForm();
      closeAddFlow();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className={embedded ? '' : 'mt-3 pt-3 border-t border-stage-border/50'}>
        <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Contacts
        </p>
        <div className="rounded-lg bg-stage-card/50 border border-stage-border/50 overflow-hidden">
          {error && !adding && (
            <p className="px-3 py-2 text-xs text-red-400 border-b border-stage-border/50">{error}</p>
          )}
          {items.length === 0 && !adding ? (
            <div className="px-3 py-2 text-center text-stage-muted text-xs">No contacts</div>
          ) : (
            <ul className="divide-y divide-stage-border/50">
              {items.map((c) => (
                <li key={c.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {c.name}
                      {c.role && (
                        <span className="ml-1.5 text-xs font-normal text-stage-muted capitalize">({c.role})</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="flex items-center gap-1 text-xs text-stage-accent hover:underline"
                        >
                          <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-1 text-xs text-stage-accent hover:underline truncate"
                        >
                          <Mail className="h-3 w-3 shrink-0" /> {c.email}
                        </a>
                      )}
                    </div>
                  </div>
                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10 shrink-0 disabled:opacity-50"
                      title="Remove from this date"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {adding && addPhase === 'picker' && (
            <div>
              {error && <p className="px-3 py-2 text-xs text-red-400 border-t border-stage-border/50">{error}</p>}
              <VenueContactPicker
                onSelect={handlePickerSelect}
                onCancel={closeAddFlow}
              />
              <div className="px-3 pb-3 pt-1 border-t border-stage-border/50">
                <button
                  type="button"
                  onClick={() => { setError(''); setAddPhase('manual'); resetAddForm(); }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-muted disabled:opacity-50"
                >
                  <PenLine className="h-3 w-3" /> Enter new contact manually
                </button>
              </div>
            </div>
          )}
          {adding && addPhase === 'manual' && (
            <form onSubmit={handleAdd} className="p-3 border-t border-stage-border/50 space-y-2">
              <button
                type="button"
                onClick={() => { setError(''); setAddPhase('picker'); }}
                className="text-xs text-stage-accent hover:underline flex items-center gap-1"
              >
                <UserPlus className="h-3 w-3" /> Choose from venue contacts instead
              </button>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Name"
                className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
                className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="submit"
                  disabled={loading || deletingId != null}
                  className="px-3 py-1.5 text-sm rounded bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
                >
                  Add contact
                </button>
                <button
                  type="button"
                  onClick={closeAddFlow}
                  className="px-3 py-1.5 text-sm rounded border border-stage-border text-stage-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {allowEdit && !adding && (
            <button
              type="button"
              onClick={openAddFlow}
              className="w-full px-3 py-2 flex items-center justify-center gap-1.5 text-stage-muted hover:text-stage-accent border-t border-stage-border/50 text-xs"
            >
              <Plus className="h-3 w-3" /> Add contact
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" /> Contacts
      </h2>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {error && !adding && (
          <p className="px-4 py-2 text-sm text-red-400 border-b border-stage-border">{error}</p>
        )}
        {items.length === 0 && !adding ? (
          <div className="p-6 text-center text-stage-muted text-sm">No contacts</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {items.map((c) => (
              <li key={c.id} className="p-4 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{c.name}</p>
                  <span className="text-xs text-stage-muted capitalize">{c.role}</span>
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
                  {c.notes && <p className="text-sm text-zinc-400 mt-1">{c.notes}</p>}
                </div>
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10 shrink-0 disabled:opacity-50"
                    title="Remove from this date"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {adding && addPhase === 'picker' && (
          <div>
            {error && <p className="px-4 py-2 text-sm text-red-400 border-t border-stage-border">{error}</p>}
            <VenueContactPicker onSelect={handlePickerSelect} onCancel={closeAddFlow} />
            <div className="px-4 pb-4 pt-2 border-t border-stage-border">
              <button
                type="button"
                onClick={() => { setError(''); setAddPhase('manual'); resetAddForm(); }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-muted disabled:opacity-50"
              >
                <PenLine className="h-4 w-4" /> Enter new contact manually
              </button>
            </div>
          </div>
        )}
        {adding && addPhase === 'manual' && (
          <form onSubmit={handleAdd} className="p-4 border-t border-stage-border space-y-3">
            <button
              type="button"
              onClick={() => { setError(''); setAddPhase('picker'); }}
              className="text-sm text-stage-accent hover:underline flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" /> Choose from venue contacts instead
            </button>
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
              placeholder="Role"
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
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
              >
                Add contact
              </button>
              <button
                type="button"
                onClick={closeAddFlow}
                className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {allowEdit && !adding && (
          <button
            type="button"
            onClick={openAddFlow}
            className="w-full p-3 flex items-center justify-center gap-2 text-stage-muted hover:text-stage-accent border-t border-stage-border"
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        )}
      </div>
    </section>
  );
}
