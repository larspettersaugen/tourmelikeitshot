'use client';

import { Plus, Pencil, Phone, Mail, MapPin, Search, Filter, Send, Copy, Check, Cake, UserPlus, Ban, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { tryShowDatePicker } from '@/lib/date-input-show-picker';

type Person = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
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
  isBookingAdmin?: boolean;
  isPowerUser?: boolean;
  linkedRoleLocked?: boolean;
  hasPendingInvite?: boolean;
};

const NORWEGIAN_COUNTIES = [
  'Agder', 'Akershus', 'Buskerud', 'Finnmark', 'Innlandet', 'Møre og Romsdal',
  'Nordland', 'Oslo', 'Rogaland', 'Telemark', 'Troms', 'Trøndelag', 'Vestfold',
  'Vestland', 'Østfold',
] as const;

/** Display as dd.mm.yyyy when editing an ISO date from the API. */
function formatIsoDateAsDisplay(iso: string): string {
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Accepts yyyy-mm-dd or dd.mm.yyyy / dd/mm/yyyy (day-first). */
function parseBirthdateToIso(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : t;
  }
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeBirthdateForApi(text: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const t = text.trim();
  if (!t) return { ok: true, value: null };
  const iso = parseBirthdateToIso(t);
  if (!iso) return { ok: false, message: 'Invalid birthdate (use dd.mm.yyyy or yyyy-mm-dd)' };
  return { ok: true, value: iso };
}

/** While typing: keep dd.mm.yyyy separators from up to 8 digits (ddmmyyyy). */
function formatDigitsAsDottedBirthdate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length === 0) return '';
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** Normalize pasted or typed input to dotted day-first display. */
function normalizeBirthdateFieldInput(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const isoPaste = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoPaste) {
    return formatIsoDateAsDisplay(`${isoPaste[1]}-${isoPaste[2]}-${isoPaste[3]}`);
  }
  const dmyPaste = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmyPaste) {
    const day = parseInt(dmyPaste[1], 10);
    const month = parseInt(dmyPaste[2], 10);
    const year = parseInt(dmyPaste[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dt = new Date(`${isoStr}T12:00:00`);
      if (!Number.isNaN(dt.getTime())) return formatIsoDateAsDisplay(isoStr);
    }
  }
  return formatDigitsAsDottedBirthdate(raw);
}

function BirthdateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const iso = parseBirthdateToIso(value);
  function openPicker() {
    const el = pickerRef.current;
    if (el) tryShowDatePicker(el);
  }
  return (
    <div className="flex gap-2 items-stretch">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="dd.mm.yyyy"
        value={value}
        onChange={(e) => onChange(normalizeBirthdateFieldInput(e.target.value))}
        onKeyDown={(e) => {
          if (e.altKey && e.key === 'ArrowDown') {
            e.preventDefault();
            openPicker();
          }
        }}
        title="Type dd.mm.yyyy. Use the calendar control or Alt+↓ to open the date picker."
        className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
      />
      {/*
        Native showPicker() anchors to the input’s box. A screen-reader-only date input ends up
        at the viewport origin in many browsers, so the calendar covered the text field. Keep the
        type="date" input stacked on the calendar control so the popup opens beside the icon.
      */}
      <div className="group relative shrink-0">
        <div className="pointer-events-none flex h-full items-center rounded-lg border border-stage-border bg-stage-surface px-3 py-2 text-stage-muted group-hover:text-white">
          <Calendar className="h-4 w-4" aria-hidden />
        </div>
        <input
          ref={pickerRef}
          type="date"
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Open calendar"
          value={iso ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onChange(formatIsoDateAsDisplay(v));
          }}
        />
      </div>
    </div>
  );
}

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
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [type, setType] = useState('crew');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [streetName, setStreetName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [county, setCounty] = useState('');
  const [notes, setNotes] = useState('');
  const [isBookingAdmin, setIsBookingAdmin] = useState(false);
  const [isPowerUser, setIsPowerUser] = useState(false);
  const [linkedRoleLocked, setLinkedRoleLocked] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; personId?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [betaLinkCopied, setBetaLinkCopied] = useState(false);

  useEffect(() => {
    setPeople(initialPeople);
  }, [initialPeople]);

  const filtered = people.filter((p) => {
    if (filterType && p.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const blob = [p.name, p.firstName, p.lastName, p.middleName].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  function resetForm() {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setType('crew');
    setBirthdate('');
    setPhone('');
    setEmail('');
    setStreetName('');
    setZipCode('');
    setCounty('');
    setNotes('');
    setIsBookingAdmin(false);
    setIsPowerUser(false);
    setLinkedRoleLocked(false);
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
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    const bdNorm = normalizeBirthdateForApi(birthdate);
    if (!bdNorm.ok) {
      setError(bdNorm.message);
      return;
    }
    setLoading(true);
    try {
      const result = await api.people.create({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        type,
        email: email.trim(),
        birthdate: bdNorm.value ?? undefined,
        phone: phone || undefined,
        streetName: streetName || undefined,
        zipCode: zipCode || undefined,
        county: county || undefined,
        notes: notes || undefined,
        isBookingAdmin,
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
    const bdNorm = normalizeBirthdateForApi(birthdate);
    if (!bdNorm.ok) {
      setError(bdNorm.message);
      return;
    }
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    setLoading(true);
    try {
      await api.people.update(editing, {
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        type,
        birthdate: bdNorm.value,
        phone: phone.trim() || null,
        email: email.trim() || null,
        streetName: streetName.trim() || null,
        zipCode: zipCode.trim() || null,
        county: county.trim() || null,
        notes: notes.trim() || null,
        isBookingAdmin,
        isPowerUser,
      });
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
      const result = await api.people.invite(p.id, {
        isBookingAdmin: p.isBookingAdmin ?? false,
        isPowerUser: p.isPowerUser ?? false,
      });
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
    setFirstName(p.firstName);
    setMiddleName(p.middleName ?? '');
    setLastName(p.lastName);
    setType(p.type);
    setBirthdate(p.birthdate ? formatIsoDateAsDisplay(p.birthdate.slice(0, 10)) : '');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setStreetName(p.streetName || '');
    setZipCode(p.zipCode || '');
    setCounty(p.county || '');
    setNotes(p.notes || '');
    setIsBookingAdmin(p.isBookingAdmin ?? false);
    setIsPowerUser(p.isPowerUser ?? false);
    setLinkedRoleLocked(p.linkedRoleLocked ?? false);
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
            className="flex items-center justify-center gap-2 shrink-0 px-4 py-2 rounded-lg border border-stage-border text-sm text-white hover:bg-stage-surface"
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
              setFirstName('');
              setMiddleName('');
              setLastName('');
              setType('crew');
              setBirthdate('');
              setPhone('');
              setEmail('');
              setStreetName('');
              setZipCode('');
              setCounty('');
              setNotes('');
              setIsBookingAdmin(false);
              setIsPowerUser(false);
              setLinkedRoleLocked(false);
              setError('');
              setInviteResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium hover:bg-stage-accentHover"
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

      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {adding && (
          <form onSubmit={handleAdd} className="p-4 border-b border-stage-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="First name"
                autoComplete="given-name"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
              />
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle (optional)"
                autoComplete="additional-name"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
              />
            </div>
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
            <div>
              <label className="block text-xs text-stage-muted mb-1">Birthdate</label>
              <BirthdateInput value={birthdate} onChange={setBirthdate} />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email (required for profile)"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            />
            <input
              type="text"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="Gateadresse"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Postnummer"
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                maxLength={4}
              />
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
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
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            />
            <div className="rounded-lg border border-stage-border bg-stage-surface/30 p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBookingAdmin}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setIsBookingAdmin(v);
                      if (v) setIsPowerUser(false);
                    }}
                    className="rounded border-stage-border text-stage-accent focus:ring-stage-accent"
                  />
                  <span className="text-sm font-medium text-white">Admin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPowerUser}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setIsPowerUser(v);
                      if (v) setIsBookingAdmin(false);
                    }}
                    className="rounded border-stage-border text-stage-accent focus:ring-stage-accent"
                  />
                  <span className="text-sm font-medium text-white">Power user</span>
                </label>
              </div>
              <p className="text-xs text-stage-muted">
                Neither: <span className="font-medium text-white/90">viewer</span>
              </p>
            </div>
            {inviteResult && !inviteResult.personId && (
              <div className="p-3 rounded-lg bg-stage-surface border border-stage-border space-y-2">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Send className="h-4 w-4" /> Invite created – copy and share the link
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inviteResult.inviteUrl)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-stage-fg text-sm"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  {phone && (
                    <a
                      href={`sms:${phone}?body=${encodeURIComponent(`You're invited to ${process.env.NEXT_PUBLIC_APP_NAME || "Tour Me Like It's Hot"}. Set up your account: ${inviteResult.inviteUrl}`)}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-stage-fg text-sm"
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
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50">
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
                onClick={() => {
                  setAdding(true);
                  setFirstName('');
                  setMiddleName('');
                  setLastName('');
                }}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="First name"
                        autoComplete="given-name"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                      />
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="Middle (optional)"
                        autoComplete="additional-name"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        autoComplete="family-name"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                      />
                    </div>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                    >
                      {PERSON_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>
                    <div>
                      <label className="block text-xs text-stage-muted mb-1">Birthdate</label>
                      <BirthdateInput value={birthdate} onChange={setBirthdate} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                    />
                    <input
                      type="text"
                      value={streetName}
                      onChange={(e) => setStreetName(e.target.value)}
                      placeholder="Gateadresse"
                      className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Postnummer"
                        className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                        maxLength={4}
                      />
                      <select
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
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
                      className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
                    />
                    <div className="rounded-lg border border-stage-border bg-stage-surface/30 p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
                        <label
                          className={`flex items-center gap-2 ${linkedRoleLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isBookingAdmin}
                            disabled={linkedRoleLocked}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setIsBookingAdmin(v);
                              if (v) setIsPowerUser(false);
                            }}
                            className="rounded border-stage-border text-stage-accent focus:ring-stage-accent disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-white">Admin</span>
                        </label>
                        <label
                          className={`flex items-center gap-2 ${linkedRoleLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isPowerUser}
                            disabled={linkedRoleLocked}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setIsPowerUser(v);
                              if (v) setIsBookingAdmin(false);
                            }}
                            className="rounded border-stage-border text-stage-accent focus:ring-stage-accent disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-white">Power user</span>
                        </label>
                      </div>
                      <p className="text-xs text-stage-muted">
                        Neither: <span className="font-medium text-white/90">viewer</span>
                      </p>
                      {linkedRoleLocked ? (
                        <p className="text-xs text-amber-400/90">Platform admin — access level is fixed here.</p>
                      ) : null}
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50">
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
                      <div className="flex flex-wrap gap-1 mt-1 items-center">
                        {p.isBookingAdmin && (
                          <span className="inline-block text-xs text-stage-accent bg-stage-surface px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                        {p.isPowerUser && !p.isBookingAdmin && (
                          <span className="inline-block text-xs text-stage-accent bg-stage-surface px-2 py-0.5 rounded">
                            Power user
                          </span>
                        )}
                        {!p.isBookingAdmin && !p.isPowerUser && (
                          <span className="inline-block text-xs text-stage-accent bg-stage-surface px-2 py-0.5 rounded">
                            Viewer
                          </span>
                        )}
                        {p.userId && (
                          <span className="inline-block text-xs text-stage-muted bg-stage-surface px-2 py-0.5 rounded">
                            Active profile
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
                            className="p-1.5 rounded text-stage-muted hover:text-amber-400 hover:bg-stage-surface disabled:opacity-50"
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
                            className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-surface disabled:opacity-50"
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
                          className="p-1.5 rounded text-stage-muted hover:text-stage-accent hover:bg-stage-surface disabled:opacity-50"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {inviteResult?.personId === p.id && (
                    <div className="mt-3 p-3 rounded-lg bg-stage-surface border border-stage-border space-y-2">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Send className="h-4 w-4" /> Invite link – copy and share
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(inviteResult.inviteUrl)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-stage-fg text-sm"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied ? 'Copied' : 'Copy link'}
                        </button>
                        {p.phone && (
                          <a
                            href={`sms:${p.phone}?body=${encodeURIComponent(`You're invited to ${process.env.NEXT_PUBLIC_APP_NAME || "Tour Me Like It's Hot"}. Set up your account: ${inviteResult.inviteUrl}`)}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stage-card border border-stage-border text-stage-muted hover:text-stage-fg text-sm"
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
