'use client';

import { User, Phone, Mail, Pencil, Unlink, Plus, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type Profile = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

const PERSON_TYPES = [
  { value: 'musician', label: 'Musician' },
  { value: 'superstar', label: 'Superstar' },
  { value: 'crew', label: 'Crew' },
  { value: 'tour_manager', label: 'Tour manager' },
  { value: 'productionmanager', label: 'Production manager' },
  { value: 'driver', label: 'Driver' },
] as const;

function typeLabel(t: string) {
  return PERSON_TYPES.find((pt) => pt.value === t)?.label ?? t.replace('_', ' ');
}

export function ProfileContent({
  initialProfile,
  user,
}: {
  initialProfile: Profile | null;
  user: { name?: string | null; email?: string | null };
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [mode, setMode] = useState<'view' | 'create' | 'edit' | 'link'>(
    initialProfile ? 'view' : 'create'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(user.name ?? '');
  const [type, setType] = useState('crew');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user.email ?? '');
  const [notes, setNotes] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<{ id: string; name: string; type: string; userId: string | null }[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  async function fetchProfile() {
    const p = await api.me.profile.get();
    setProfile(p);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.me.profile.create({ name, type, phone: phone || undefined, email: email || undefined, notes: notes || undefined });
      await fetchProfile();
      setMode('view');
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.me.profile.update({ name, type, phone: phone || undefined, email: email || undefined, notes: notes || undefined });
      await fetchProfile();
      setMode('view');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleLink(personId: string) {
    setError('');
    setLoading(true);
    try {
      await api.me.profile.link(personId);
      await fetchProfile();
      setMode('view');
      setLinkSearch('');
      setLinkResults([]);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleUnlink() {
    if (!confirm('Unlink your profile? Your person record will remain in the database but will no longer be connected to your account.')) return;
    setLoading(true);
    try {
      await api.me.profile.unlink();
      setProfile(null);
      setMode('create');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!linkSearch.trim()) {
      setLinkResults([]);
      return;
    }
    setLinkLoading(true);
    api.people.list({ q: linkSearch }).then((list) => {
      setLinkResults(list.filter((p) => !p.userId));
      setLinkLoading(false);
    });
  }, [linkSearch]);

  if (profile && mode === 'view') {
    return (
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{profile.name}</h2>
              <span className="text-sm text-stage-muted">{typeLabel(profile.type)}</span>
              <div className="flex flex-wrap gap-4 mt-3">
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-stage-accent hover:underline">
                    <Phone className="h-4 w-4" /> {profile.phone}
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-stage-accent hover:underline">
                    <Mail className="h-4 w-4" /> {profile.email}
                  </a>
                )}
              </div>
              {profile.notes && <p className="text-sm text-zinc-400 mt-2">{profile.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('edit');
                  setName(profile.name);
                  setType(profile.type);
                  setPhone(profile.phone || '');
                  setEmail(profile.email || '');
                  setNotes(profile.notes || '');
                }}
                className="p-2 rounded-lg text-stage-muted hover:text-stage-accent hover:bg-stage-surface"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={loading}
                className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                aria-label="Unlink"
              >
                <Unlink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile && mode === 'edit') {
    return (
      <form onSubmit={handleUpdate} className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6 space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Name"
          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
        />
        <div>
          <label className="block text-xs text-stage-muted mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
          >
            {PERSON_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50">Save</button>
          <button type="button" onClick={() => setMode('view')} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">Cancel</button>
        </div>
      </form>
    );
  }

  if (mode === 'link') {
    return (
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6 space-y-4">
        <p className="text-sm text-stage-muted">Find your profile in the people database and link it to your account.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
          <input
            type="text"
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-stage-border divide-y divide-stage-border">
          {linkLoading ? (
            <div className="p-4 text-center text-stage-muted text-sm">Searching...</div>
          ) : linkResults.length === 0 ? (
            <div className="p-4 text-center text-stage-muted text-sm">
              {linkSearch ? 'No unlinked profiles found' : 'Type to search'}
            </div>
          ) : (
            linkResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleLink(p.id)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-stage-surface disabled:opacity-50"
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="button" onClick={() => setMode('create')} className="text-sm text-stage-muted hover:text-stage-fg">
          Cancel · Create new instead
        </button>
      </div>
    );
  }

  // Create new
  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'create' ? 'bg-stage-accent text-stage-accentFg' : 'border border-stage-border text-stage-muted hover:text-stage-fg'}`}
        >
          Create new profile
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-stage-border text-stage-muted hover:text-stage-fg"
        >
          Link existing profile
        </button>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-6 space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Name"
          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
        />
        <div>
          <label className="block text-xs text-stage-muted mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
          >
            {PERSON_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </select>
        </div>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50">
          Create & link profile
        </button>
      </form>
    </div>
  );
}
