'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { googleMapsSearchUrl } from '@/lib/google-maps-url';
import { VenueContactPicker } from './VenueContactPicker';
import { VENUE_CATEGORY_LABELS, type VenueCategorySlug } from '@/lib/venue-category';

export type VenueProfileVenue = {
  id: string;
  category: VenueCategorySlug;
  name: string;
  city: string;
  address: string | null;
  capacity: number | null;
  notes: string | null;
  loadInNotes: string | null;
  cateringNotes: string | null;
  accessNotes: string | null;
};

export type VenueProfileContact = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export function VenueProfileContent({
  venue: initialVenue,
  initialContacts,
  allowEdit,
  isViewer,
}: {
  venue: VenueProfileVenue;
  initialContacts: VenueProfileContact[];
  allowEdit: boolean;
  isViewer?: boolean;
}) {
  const router = useRouter();
  const [venue, setVenue] = useState(initialVenue);
  const [contacts, setContacts] = useState(initialContacts);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialVenue.name);
  const [city, setCity] = useState(initialVenue.city);
  const [category, setCategory] = useState<VenueCategorySlug>(initialVenue.category);
  const [address, setAddress] = useState(initialVenue.address ?? '');
  const [capacityStr, setCapacityStr] = useState(
    initialVenue.capacity != null ? String(initialVenue.capacity) : ''
  );
  const [notes, setNotes] = useState(initialVenue.notes ?? '');
  const [loadInNotes, setLoadInNotes] = useState(initialVenue.loadInNotes ?? '');
  const [cateringNotes, setCateringNotes] = useState(initialVenue.cateringNotes ?? '');
  const [accessNotes, setAccessNotes] = useState(initialVenue.accessNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [ccName, setCcName] = useState('');
  const [ccRole, setCcRole] = useState('');
  const [ccPhone, setCcPhone] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [ccNotes, setCcNotes] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setVenue(initialVenue);
    setContacts(initialContacts);
    setName(initialVenue.name);
    setCity(initialVenue.city);
    setCategory(initialVenue.category);
    setAddress(initialVenue.address ?? '');
    setCapacityStr(initialVenue.capacity != null ? String(initialVenue.capacity) : '');
    setNotes(initialVenue.notes ?? '');
    setLoadInNotes(initialVenue.loadInNotes ?? '');
    setCateringNotes(initialVenue.cateringNotes ?? '');
    setAccessNotes(initialVenue.accessNotes ?? '');
  }, [initialVenue, initialContacts]);

  function cancelEdit() {
    setName(venue.name);
    setCity(venue.city);
    setCategory(venue.category);
    setAddress(venue.address ?? '');
    setCapacityStr(venue.capacity != null ? String(venue.capacity) : '');
    setNotes(venue.notes ?? '');
    setLoadInNotes(venue.loadInNotes ?? '');
    setCateringNotes(venue.cateringNotes ?? '');
    setAccessNotes(venue.accessNotes ?? '');
    setError('');
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const capTrim = capacityStr.trim();
    let capacityPayload: number | null = null;
    if (capTrim) {
      if (!/^\d+$/.test(capTrim)) {
        setError('Capacity must be a non-negative whole number');
        return;
      }
      const n = parseInt(capTrim, 10);
      if (n < 0 || n > 2_147_483_647) {
        setError('Capacity must be a non-negative whole number');
        return;
      }
      capacityPayload = n;
    }
    setSaving(true);
    try {
      const updated = await api.venues.update(venue.id, {
        category,
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || null,
        capacity: capacityPayload,
        notes: notes.trim() || null,
        loadInNotes: loadInNotes.trim() || null,
        cateringNotes: cateringNotes.trim() || null,
        accessNotes: accessNotes.trim() || null,
      });
      setVenue((v) => ({ ...v, ...updated }));
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function refreshContacts() {
    const list = await api.venueContacts.list({ venueId: venue.id });
    setContacts(
      list.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
      }))
    );
  }

  async function handleLinkPick(c: { id: string }) {
    setError('');
    try {
      await api.venueContacts.update(c.id, { venueId: venue.id });
      setLinking(false);
      await refreshContacts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link contact');
    }
  }

  function openContactEdit(c: VenueProfileContact) {
    setLinking(false);
    setEditingContactId(c.id);
    setCcName(c.name);
    setCcRole(c.role ?? '');
    setCcPhone(c.phone ?? '');
    setCcEmail(c.email ?? '');
    setCcNotes(c.notes ?? '');
    setError('');
  }

  function cancelContactEdit() {
    setEditingContactId(null);
    setError('');
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContactId) return;
    setError('');
    setSavingContact(true);
    try {
      await api.venueContacts.update(editingContactId, {
        name: ccName.trim(),
        role: ccRole.trim() || 'Contact',
        phone: ccPhone.trim() ? ccPhone.trim() : null,
        email: ccEmail.trim() ? ccEmail.trim() : null,
        notes: ccNotes.trim() ? ccNotes.trim() : null,
      });
      setEditingContactId(null);
      await refreshContacts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleUnlink(contactId: string) {
    setError('');
    setUnlinkingId(contactId);
    try {
      await api.venueContacts.update(contactId, { venueId: null });
      await refreshContacts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink');
    } finally {
      setUnlinkingId(null);
    }
  }

  const mapsHref =
    venue.address || venue.city ? googleMapsSearchUrl(venue.address, venue.city) : null;

  return (
    <div className="space-y-6">
      {!isViewer && (
        <Link
          href="/dashboard/venues"
          className="inline-flex items-center gap-2 text-sm text-stage-muted hover:text-stage-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Venues
        </Link>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-stage-card border border-stage-border text-stage-accent shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{venue.name}</h1>
            <p className="text-sm text-stage-muted mt-1">{VENUE_CATEGORY_LABELS[venue.category]}</p>
            <p className="flex items-center gap-1.5 text-sm text-stage-muted mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {venue.city}
            </p>
            {venue.capacity != null && (
              <p className="text-sm text-stage-muted mt-1">
                Capacity · {venue.capacity.toLocaleString()}
              </p>
            )}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 mt-1 inline-block hover:text-stage-accent hover:underline"
              >
                {venue.address || `Open ${venue.city} in maps`}
              </a>
            )}
          </div>
        </div>
        {allowEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-stage-border text-stage-muted hover:text-stage-accent hover:border-stage-accent shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan">Basics</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Venue name"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder="City"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <label className="block space-y-1">
              <span className="text-xs text-stage-muted">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VenueCategorySlug)}
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
              >
                <option value="venue">{VENUE_CATEGORY_LABELS.venue}</option>
                <option value="festival">{VENUE_CATEGORY_LABELS.festival}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-stage-muted">Capacity (optional)</span>
              <input
                type="text"
                inputMode="numeric"
                value={capacityStr}
                onChange={(e) => setCapacityStr(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
            </label>
          </div>

          <NoteCard icon={Truck} title="Load-in & logistics">
            <textarea
              value={loadInNotes}
              onChange={(e) => setLoadInNotes(e.target.value)}
              placeholder="Docks, parking, ramp, timing…"
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 resize-y min-h-[100px]"
            />
          </NoteCard>

          <NoteCard icon={Utensils} title="Catering & hospitality">
            <textarea
              value={cateringNotes}
              onChange={(e) => setCateringNotes(e.target.value)}
              placeholder="Catering hours, dressing rooms, guest list…"
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 resize-y min-h-[100px]"
            />
          </NoteCard>

          <NoteCard icon={KeyRound} title="Access & security">
            <textarea
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="Doors, crew entrance, accreditation, curfew…"
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 resize-y min-h-[100px]"
            />
          </NoteCard>

          <NoteCard title="General notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recurring quirks, anything else…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 resize-y min-h-[80px]"
            />
          </NoteCard>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <ReadOnlyNote icon={Truck} title="Load-in & logistics" text={venue.loadInNotes} />
          <ReadOnlyNote icon={Utensils} title="Catering & hospitality" text={venue.cateringNotes} />
          <ReadOnlyNote icon={KeyRound} title="Access & security" text={venue.accessNotes} />
          <ReadOnlyNote title="General notes" text={venue.notes} />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* Contacts section */}
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        <div className="p-4 border-b border-stage-border flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Contacts at this venue
          </h2>
          {allowEdit && !linking && !editingContactId && (
            <button
              type="button"
              onClick={() => {
                setEditingContactId(null);
                setLinking(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-stage-border text-stage-muted hover:text-stage-accent"
            >
              <Plus className="h-3.5 w-3.5" /> Link contact
            </button>
          )}
        </div>
        {linking && allowEdit && (
          <VenueContactPicker
            onSelect={(c) => {
              void handleLinkPick(c);
            }}
            onCancel={() => setLinking(false)}
          />
        )}
        {contacts.length === 0 && !linking ? (
          <div className="p-6 text-center text-stage-muted text-sm">No linked contacts yet</div>
        ) : (
          !linking && (
            <ul className="divide-y divide-stage-border">
              {contacts.map((c) => (
                <li key={c.id} className="p-4">
                  {editingContactId === c.id && allowEdit ? (
                    <form onSubmit={handleSaveContact} className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={ccName}
                          onChange={(e) => setCcName(e.target.value)}
                          required
                          placeholder="Name"
                          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                        />
                        <input
                          type="text"
                          value={ccRole}
                          onChange={(e) => setCcRole(e.target.value)}
                          placeholder="Role"
                          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="tel"
                          value={ccPhone}
                          onChange={(e) => setCcPhone(e.target.value)}
                          placeholder="Phone"
                          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                        />
                        <input
                          type="email"
                          value={ccEmail}
                          onChange={(e) => setCcEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        value={ccNotes}
                        onChange={(e) => setCcNotes(e.target.value)}
                        placeholder="Notes"
                        className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                      />
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingContact}
                          className="px-3 py-1.5 text-sm rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
                        >
                          {savingContact ? 'Saving…' : 'Save contact'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelContactEdit}
                          className="px-3 py-1.5 text-sm rounded-lg border border-stage-border text-stage-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
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
                              className="flex items-center gap-1 text-sm text-stage-accent hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" /> {c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="flex items-center gap-1 text-sm text-stage-accent hover:underline truncate"
                            >
                              <Mail className="h-3.5 w-3.5" /> {c.email}
                            </a>
                          )}
                        </div>
                        {c.notes && <p className="text-sm text-zinc-400 mt-1">{c.notes}</p>}
                      </div>
                      {allowEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openContactEdit(c)}
                            disabled={editingContactId != null && editingContactId !== c.id}
                            className="p-1.5 rounded-lg text-stage-muted hover:text-stage-accent hover:bg-stage-surface disabled:opacity-40"
                            title="Edit contact"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnlink(c.id)}
                            disabled={unlinkingId === c.id || editingContactId != null}
                            className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                            title="Unlink from this venue"
                            aria-label={`Unlink ${c.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
        {!isViewer && (
          <div className="px-4 py-3 border-t border-stage-border">
            <Link
              href="/dashboard/contacts"
              className="text-xs text-stage-accent hover:underline"
            >
              Manage all venue contacts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </h2>
      {children}
    </div>
  );
}

function ReadOnlyNote({
  icon: Icon,
  title,
  text,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4 space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </h2>
      <p className="text-sm text-stage-fg whitespace-pre-wrap">{text}</p>
    </div>
  );
}
