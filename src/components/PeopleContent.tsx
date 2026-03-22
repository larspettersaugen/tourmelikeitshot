'use client';

import { Plus, Pencil, Phone, Mail, MapPin, Search, Filter, Send, Copy, Check, Cake, UserPlus, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

type Person = {
  id: string;
  name: string;
  type: string;
  birthdate: string | null;
  phone: string | null;
  email: string | null;
  streetName: string | null;
  zipCode: string | null;
  county: string | null;
  timezone: string | null;
  notes: string | null;
  userId: string | null;
  isPowerUser?: boolean;
  hasPendingInvite?: boolean;
};

const NORWEGIAN_COUNTIES = [
  'Agder', 'Akershus', 'Buskerud', 'Finnmark', 'Innlandet', 'Møre og Romsdal',
  'Nordland', 'Oslo', 'Rogaland', 'Telemark', 'Troms', 'Trøndelag', 'Vestfold',
  'Vestland', 'Østfold',
] as const;

const PERSON_TYPES = [
  { value: 'musician', label: 'Musician' },
  { value: 'superstar', label: 'Superstar' },
  { value: 'crew', label: 'Crew' },
  { value: 'tour_manager', label: 'Tour manager' },
  { value: 'productionmanager', label: 'Production manager' },
  { value: 'driver', label: 'Driver' },
] as const;

export function PeopleContent({
  initialPeople,
  allowEdit,
  betaJoinUrl,
}: {
  initialPeople: Person[];
  allowEdit: boolean;
  /** Full URL for self-service beta signup when BETA_JOIN_SECRET is set (editors only). */
  betaJoinUrl?: string | null;
}) {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('crew');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [streetName, setStreetName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [county, setCounty] = useState('');
  const [notes, setNotes] = useState('');
  const [isPowerUser, setIsPowerUser] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; personId?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [betaLinkCopied, setBetaLinkCopied] = useState(false);

  useEffect(() => {
    setPeople(initialPeople);
  }, [initialPeople]);

  const filtered = people.filter((p) => {
    if (filterType && p.type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function resetForm() {
    setName('');
    setType('crew');
    setBirthdate('');
    setPhone('');
    setEmail('');
    setStreetName('');
    setZipCode('');
    setCounty('');
    setNotes('');
    setIsPowerUser(false);
    setError('');
    setAdding(false);
    setEditing(null);
    setInviteResult(null);
  }

  function copyInviteLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyBetaLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setBetaLinkCopied(true);
      setTimeout(() => setBetaLinkCopied(false), 2000);
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviteResult(null);
    setLoading(true);
    try {
      const result = await api.people.create({
        name,
        type,
        email: email.trim(),
        birthdate: birthdate || undefined,
        phone: phone || undefined,
        streetName: streetName || undefined,
        zipCode: zipCode || undefined,
        county: county || undefined,
        notes: notes || undefined,
        isPowerUser,
      });
      const list = await api.people.list();
      setPeople(list);
      if (result.inviteUrl) {
        setInviteResult({ inviteUrl: result.inviteUrl, personId: result.id });
      }
      if (!result.inviteUrl) {
        resetForm();
        window.location.reload();
      } else {
        setAdding(false);
        setLoading(false);
      }
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
      await api.people.update(editing, { name, type, birthdate: birthdate || null, phone: phone || undefined, email: email || undefined, streetName: streetName || undefined, zipCode: zipCode || undefined, county: county || undefined, notes: notes || undefined, isPowerUser });
      const list = await api.people.list();
      setPeople(list);
      resetForm();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleInvite(p: Person) {
    if (!p.email?.trim()) return;
    setError('');
    setInviteResult(null);
    setLoading(true);
    try {
      const result = await api.people.invite(p.id, { isPowerUser: p.isPowerUser ?? false });
      setInviteResult({ inviteUrl: result.inviteUrl, personId: p.id });
      const list = await api.people.list();
      setPeople(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeInvite(personId: string) {
    if (!confirm('Revoke all outstanding invite links for this person? They will need a new invite.')) return;
    setError('');
    setLoading(true);
    try {
      await api.people.revokeInvite(personId);
      setInviteResult((prev) => (prev?.personId === personId ? null : prev));
      const list = await api.people.list();
      setPeople(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: Person) {
    setInviteResult(null);
    setEditing(p.id);
    setName(p.name);
    setType(p.type);
    setBirthdate(p.birthdate ? p.birthdate.slice(0, 10) : '');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setStreetName(p.streetName || '');
    setZipCode(p.zipCode || '');
    setCounty(p.county || '');
    setNotes(p.notes || '');
    setIsPowerUser(p.isPowerUser ?? false);
    setAdding(false);
  }

  const typeLabel = (t: string) => PERSON_TYPES.find((pt) => pt.value === t)?.label ?? t;

  return (
    <div className="space-y-4">
      {allowEdit && betaJoinUrl ? (
        <div className="rounded-xl border border-stage-border bg-stage-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-stage-muted flex-1 min-w-0">
            <span className="text-white font-medium">Beta signup link.</span> Share with external testers so they can
            create their own account and profile (viewer access). Treat the link like a password—anyone with it can
            sign up.
          </p>
          <button
            type="button"
            onClick={() => copyBetaLink(betaJoinUrl)}
            className="flex items-center justify-center gap-2 shrink-0 px-4 py-2 rounded-lg border border-stage-border text-sm text-white hover:bg-stage-dark"
          >
            {betaLinkCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            {betaLinkCopied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        {allowEdit && !adding && !editing && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setName('');
              setType('crew');
              setBirthdate('');
              setPhone('');
              setEmail('');
              setStreetName('');
              setZipCode('');
              setCounty('');
              setNotes('');
              setIsPowerUser(false);
              setError('');
              setInviteResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-accent text-stage-dark font-medium hover:bg-stage-accentHover"
          >
            <Plus className="h-4 w-4" /> Add person
          </button>
        )}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stage-muted" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg bg-stage-card border border-stage-border text-white appearance-none"
          >
            <option value="">All types</option>
            {PERSON_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-stage-card border border-stage-border overflow-hidden">
        {adding && (
          <form onSubmit={handleAdd} className="p-4 border-b border-stage-border space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Name"
              className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
            />
            <div>
              <label className="block text-xs text-stage-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
              >
                {PERSON_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stage-muted mb-1">Birthdate</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
              />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email (required for profile)"
              className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
            />
            <input
              type="text"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="Gateadresse"
              className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Postnummer"
                className="px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                maxLength={4}
              />
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
              >
                <option value="">Fylke</option>
                {NORWEGIAN_COUNTIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPowerUser}
                onChange={(e) => setIsPowerUser(e.target.checked)}
                className="rounded border-stage-border text-stage-accent focus:ring-stage-accent"
              />
              <span className="text-sm text-white">
                <strong>Power user</strong> – can see more (Advance, all flights). Unchecked = view only.
              </span>
            </label>
            {inviteResult && !inviteResult.personId && (
              <div className="p-3 rounded-lg bg-stage-dark border border-stage-border space-y-2">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Send className="h-4 w-4" /> Invite created – copy and share the link
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inviteResult.inviteUrl)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-white text-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  {phone && (
                    <a
                      href={`sms:${phone}?body=${encodeURIComponent(`You're invited to ${process.env.NEXT_PUBLIC_APP_NAME || 'Tour It Like Its Hot'}. Set up your account: ${inviteResult.inviteUrl}`)}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-white text-sm"
                    >
                      <Send className="h-4 w-4" /> Send via SMS
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  {inviteResult.personId && (
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inviteResult.personId!)}
                      disabled={loading}
                      className="text-sm text-amber-400 hover:underline disabled:opacity-50"
                    >
                      Revoke link
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-stage-accent hover:underline"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!inviteResult && (
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-dark font-medium disabled:opacity-50">
                  Add
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">
                  Cancel
                </button>
              </div>
            )}
          </form>
        )}
        {filtered.length === 0 && !adding && !editing ? (
          <div className="p-8 text-center text-stage-muted text-sm">
            No people yet.
            {allowEdit && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="block mt-2 text-stage-accent hover:underline"
              >
                Add your first person
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {filtered.map((p) => (
              <li key={p.id} className="p-4">
                {editing === p.id ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Name"
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    />
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    >
                      {PERSON_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>
                    <div>
                      <label className="block text-xs text-stage-muted mb-1">Birthdate</label>
                      <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                      />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    />
                    <input
                      type="text"
                      value={streetName}
                      onChange={(e) => setStreetName(e.target.value)}
                      placeholder="Gateadresse"
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Postnummer"
                        className="px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                        maxLength={4}
                      />
                      <select
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                      >
                        <option value="">Fylke</option>
                        {NORWEGIAN_COUNTIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes"
                      className="w-full px-3 py-2 rounded-lg bg-stage-dark border border-stage-border text-white"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPowerUser}
                        onChange={(e) => setIsPowerUser(e.target.checked)}
                        className="rounded border-stage-border text-stage-accent focus:ring-stage-accent"
                      />
                      <span className="text-sm text-white">
                        <strong>Power user</strong> – can see more (Advance, all flights). Unchecked = view only.
                      </span>
                    </label>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-dark font-medium disabled:opacity-50">
                        Save
                      </button>
                      <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <span className="text-xs text-stage-muted">{typeLabel(p.type)}</span>
                      {p.birthdate && (
                        <p className="flex items-center gap-1.5 text-sm text-stage-muted mt-1">
                          <Cake className="h-3.5 w-3.5 shrink-0" />
                          {format(new Date(p.birthdate), 'MMMM d, yyyy')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline">
                            <Phone className="h-3.5 w-3.5" /> {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline">
                            <Mail className="h-3.5 w-3.5" /> {p.email}
                          </a>
                        )}
                        {(p.streetName || p.zipCode || p.county) && (
                          <p className="flex items-center gap-1.5 text-sm text-stage-muted mt-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {[p.streetName, p.zipCode, p.county].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      {p.notes && <p className="text-sm text-zinc-400 mt-1">{p.notes}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.userId && (
                          <span className="inline-block text-xs text-stage-muted bg-stage-dark px-2 py-0.5 rounded">
                            Active profile
                          </span>
                        )}
                        {p.isPowerUser && (
                          <span className="inline-block text-xs text-stage-accent bg-stage-dark px-2 py-0.5 rounded">
                            Power user
                          </span>
                        )}
                      </div>
                    </div>
                    {allowEdit && (
                      <div className="flex items-center gap-1">
                        {p.hasPendingInvite && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(p.id)}
                            disabled={loading}
                            className="p-1.5 rounded text-stage-muted hover:text-amber-400 hover:bg-stage-dark disabled:opacity-50"
                            aria-label="Revoke invite links"
                            title="Revoke outstanding invite links"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {p.email?.trim() && (
                          <button
                            type="button"
                            onClick={() => handleInvite(p)}
                            disabled={loading}
                            className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-dark disabled:opacity-50"
                            aria-label={p.userId ? 'Resend invite' : 'Invite'}
                            title={p.userId ? 'Resend invite link' : 'Create invite link'}
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          disabled={loading}
                          className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-dark disabled:opacity-50"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {inviteResult?.personId === p.id && (
                    <div className="mt-3 p-3 rounded-lg bg-stage-dark border border-stage-border space-y-2">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Send className="h-4 w-4" /> Invite link – copy and share
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(inviteResult.inviteUrl)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-white text-sm"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied' : 'Copy link'}
                        </button>
                        {p.phone && (
                          <a
                            href={`sms:${p.phone}?body=${encodeURIComponent(`You're invited to ${process.env.NEXT_PUBLIC_APP_NAME || 'Tour It Like Its Hot'}. Set up your account: ${inviteResult.inviteUrl}`)}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-white text-sm"
                          >
                            <Send className="h-4 w-4" /> Send via SMS
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <button
                          type="button"
                          onClick={() => inviteResult.personId && handleRevokeInvite(inviteResult.personId)}
                          disabled={loading || !inviteResult.personId}
                          className="text-sm text-amber-400 hover:underline disabled:opacity-50"
                        >
                          Revoke link
                        </button>
                        <button
                          type="button"
                          onClick={() => setInviteResult(null)}
                          className="text-sm text-stage-accent hover:underline"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
