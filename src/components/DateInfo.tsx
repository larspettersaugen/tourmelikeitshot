'use client';

import { MapPin, Pencil, Calendar, User, Phone, Mail, Plus, UserPlus, PenLine, ChevronRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ContactsSection } from './ContactsSection';
import { DateMembersSection } from './DateMembersSection';
import { VenueContactPicker } from './VenueContactPicker';
import { ShowStatusBadge } from './ShowStatusBadge';
import { DateAdvanceCompleteInline } from './DateAdvanceCompleteInline';
import { SHOW_STATUSES } from '@/lib/show-status';
import { DATE_KINDS, getDateKindLabel } from '@/lib/date-kind';
import { tourDateDisplayName } from '@/lib/tour-date-display';
import { tryShowDatePicker } from '@/lib/date-input-show-picker';

function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tourDateId: string | null;
};

export function DateInfo({
  tourId,
  dateId,
  venueName,
  city,
  date,
  endDate,
  kind,
  status,
  address,
  promoterName,
  promoterPhone,
  promoterEmail,
  allowEdit,
  extraActions,
  contacts,
  travelingGroup,
  hideAllTourMessage,
  advanceComplete,
  advanceReady,
  allowAdvanceComplete,
  linkedVenueId,
  dateName,
}: {
  tourId: string;
  dateId: string;
  /** Optional label for this day (tour date name). UI falls back to venue + city when null. */
  dateName?: string | null;
  /** Saved venue profile linked to this show date */
  linkedVenueId?: string | null;
  venueName: string;
  city: string;
  date: string;
  endDate?: string | null;
  kind?: string | null;
  status?: string | null;
  address: string | null;
  promoterName?: string | null;
  promoterPhone?: string | null;
  promoterEmail?: string | null;
  allowEdit: boolean;
  extraActions?: React.ReactNode;
  advanceComplete?: boolean;
  advanceReady?: boolean;
  allowAdvanceComplete?: boolean;
  contacts?: Contact[];
  travelingGroup: { id: string; name: string; role: string; subgroup: string | null; phone?: string | null; email?: string | null }[];
  hideAllTourMessage?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingPromoter, setAddingPromoter] = useState(false);
  /** picker first (same pattern as Contacts); manual = type promoter */
  const [promoterAddPhase, setPromoterAddPhase] = useState<'picker' | 'manual'>('picker');
  const [promoterLoading, setPromoterLoading] = useState(false);
  const [promoterError, setPromoterError] = useState('');
  const [newPromoterName, setNewPromoterName] = useState('');
  const [newPromoterPhone, setNewPromoterPhone] = useState('');
  const [newPromoterEmail, setNewPromoterEmail] = useState('');
  const [vName, setVName] = useState(venueName);
  const [vCity, setVCity] = useState(city);
  const [vDate, setVDate] = useState(format(new Date(date), "yyyy-MM-dd"));
  const [vEndDate, setVEndDate] = useState(endDate ? format(new Date(endDate), "yyyy-MM-dd") : '');
  const [vKind, setVKind] = useState(kind ?? 'concert');
  const [vStatus, setVStatus] = useState(status ?? 'confirmed');
  const [vAddress, setVAddress] = useState(address ?? '');
  const [vPromoterName, setVPromoterName] = useState(promoterName ?? '');
  const [vPromoterPhone, setVPromoterPhone] = useState(promoterPhone ?? '');
  const [vPromoterEmail, setVPromoterEmail] = useState(promoterEmail ?? '');
  const [vDateName, setVDateName] = useState(dateName ?? '');
  /** People, contacts, promoter — collapsed by default */
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const displayName = tourDateDisplayName({ name: dateName, venueName, city });
  const locationQuery = address?.trim() ? address : `${venueName}, ${city}`;
  const mapsUrl = googleMapsSearchUrl(locationQuery);

  useEffect(() => {
    setVDateName(dateName ?? '');
  }, [dateName]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.dates.update(tourId, dateId, {
        name: vDateName.trim() || null,
        venueName: vName.trim(),
        city: vCity.trim(),
        date: new Date(vDate).toISOString(),
        endDate: (vKind === 'preproduction' || vKind === 'rehearsal') && vEndDate ? vEndDate : null,
        kind: vKind,
        status: vStatus,
        address: vAddress.trim() || '',
        promoterName: vPromoterName.trim() || null,
        promoterPhone: vPromoterPhone.trim() || null,
        promoterEmail: vPromoterEmail.trim() || null,
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setLoading(false);
    }
  }

  function handleCancel() {
    setVName(venueName);
    setVCity(city);
    setVDate(format(new Date(date), "yyyy-MM-dd"));
    setVEndDate(endDate ? format(new Date(endDate), "yyyy-MM-dd") : '');
    setVKind(kind ?? 'concert');
    setVStatus(status ?? 'confirmed');
    setVAddress(address ?? '');
    setVPromoterName(promoterName ?? '');
    setVPromoterPhone(promoterPhone ?? '');
    setVPromoterEmail(promoterEmail ?? '');
    setVDateName(dateName ?? '');
    setEditing(false);
    setError('');
  }

  function resetPromoterManualFields() {
    setNewPromoterName('');
    setNewPromoterPhone('');
    setNewPromoterEmail('');
  }

  function openPromoterAdd() {
    setPromoterError('');
    resetPromoterManualFields();
    setPromoterAddPhase('picker');
    setAddingPromoter(true);
  }

  function closePromoterAdd() {
    setAddingPromoter(false);
    setPromoterError('');
    setPromoterAddPhase('picker');
    resetPromoterManualFields();
  }

  async function handlePromoterPickerSelect(contact: {
    id: string;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
  }) {
    setPromoterError('');
    setPromoterLoading(true);
    try {
      await api.dates.update(tourId, dateId, {
        promoterName: contact.name || null,
        promoterPhone: contact.phone || null,
        promoterEmail: contact.email || null,
      });
      await api.contacts.create(tourId, {
        name: contact.name,
        role: contact.role?.trim() || 'Promoter',
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        tourDateId: dateId,
        venueContactId: contact.id,
      });
      closePromoterAdd();
      router.refresh();
    } catch (err) {
      setPromoterError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPromoterLoading(false);
    }
  }

  async function handlePromoterManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPromoterError('');
    const n = newPromoterName.trim();
    if (!n) {
      setPromoterError('Name required');
      return;
    }
    setPromoterLoading(true);
    try {
      await api.dates.update(tourId, dateId, {
        promoterName: n,
        promoterPhone: newPromoterPhone.trim() || null,
        promoterEmail: newPromoterEmail.trim() || null,
      });
      await api.contacts.create(tourId, {
        name: n,
        role: 'Promoter',
        phone: newPromoterPhone.trim() || undefined,
        email: newPromoterEmail.trim() || undefined,
        tourDateId: dateId,
      });
      closePromoterAdd();
      router.refresh();
    } catch (err) {
      setPromoterError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPromoterLoading(false);
    }
  }

  if (editing && allowEdit) {
    return (
      <div className="rounded-2xl bg-stage-card border border-stage-neonCyan/15 shadow-glow-cyan-sm p-4 sm:p-6 mb-6">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-stage-muted mb-1">Name (tour date)</label>
            <input
              type="text"
              value={vDateName}
              onChange={(e) => setVDateName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              placeholder="e.g. Oslo release show"
            />
            <p className="text-xs text-stage-muted mt-1">Leave empty to use venue + city as the title.</p>
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">Venue name</label>
            <input
              type="text"
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              placeholder="e.g. Sentrum Scene"
            />
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">City</label>
            <input
              type="text"
              value={vCity}
              onChange={(e) => setVCity(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              placeholder="e.g. Oslo"
            />
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Date
            </label>
            <input
              type="date"
              value={vDate}
              onChange={(e) => setVDate(e.target.value)}
              onClick={(e) => tryShowDatePicker(e.currentTarget)}
              required
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            />
          </div>
          {(vKind === 'preproduction' || vKind === 'rehearsal') && (
            <div>
              <label className="block text-xs text-stage-muted mb-1">End date</label>
              <input
                type="date"
                value={vEndDate}
                onChange={(e) => setVEndDate(e.target.value)}
                onClick={(e) => tryShowDatePicker(e.currentTarget)}
                min={vDate}
                className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-stage-muted mb-1">Kind</label>
            <select
              value={vKind}
              onChange={(e) => setVKind(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            >
              {DATE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">Status</label>
            <select
              value={vStatus}
              onChange={(e) => setVStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white"
            >
              {SHOW_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location / address
            </label>
            <input
              type="text"
              value={vAddress}
              onChange={(e) => setVAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              placeholder="Full address for Google Maps (e.g. Youngstorget 2, 0181 Oslo)"
            />
            <p className="text-xs text-stage-muted mt-1">
              Used for Google Maps search. Leave empty to use venue + city.
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-stage-muted flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Promoter
            </label>
            <input
              type="text"
              value={vPromoterName}
              onChange={(e) => setVPromoterName(e.target.value)}
              placeholder="Promoter name"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                value={vPromoterPhone}
                onChange={(e) => setVPromoterPhone(e.target.value)}
                placeholder="Phone"
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
              <input
                type="email"
                value={vPromoterEmail}
                onChange={(e) => setVPromoterEmail(e.target.value)}
                placeholder="Email"
                className="px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-stage-card via-stage-card to-stage-surface/90 border border-stage-neonCyan/25 shadow-glow-cyan-sm p-4 sm:p-6 mb-6">
      {/* Title row: actions stay top-right; never wrap below contacts/promoter */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stage-violet mb-2">Tour date</p>
      <div className="flex flex-nowrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {displayName}
          </h1>
          <span className="text-xs text-stage-muted border border-stage-neonCyan/25 bg-stage-neonCyan/5 px-2 py-0.5 rounded-md">
            {getDateKindLabel(kind)}
          </span>
          <ShowStatusBadge status={status} />
        </div>
        <div className="flex shrink-0 items-center gap-2 flex-wrap justify-end">
          {extraActions}
          {allowAdvanceComplete ? (
            <DateAdvanceCompleteInline
              tourId={tourId}
              dateId={dateId}
              advanceComplete={advanceComplete ?? false}
              ready={advanceReady ?? false}
              allowConfirm
            />
          ) : null}
          {allowEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-neonCyan hover:border-stage-neonCyan/40"
              aria-label="Edit date info"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <p className="text-stage-muted text-sm mt-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-stage-neonCyan" aria-hidden />
        {endDate
          ? `${format(new Date(date), 'EEEE, MMMM d, yyyy')} – ${format(new Date(endDate), 'EEEE, MMMM d, yyyy')}`
          : format(new Date(date), 'EEEE, MMMM d, yyyy')}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-stage-neonCyan hover:underline w-fit"
        >
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          View on Google Maps
        </a>
        {linkedVenueId ? (
          <Link
            href={`/dashboard/venues/${linkedVenueId}`}
            className="inline-flex items-center gap-1.5 text-sm text-stage-neonCyan hover:underline w-fit"
          >
            Venue profile
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setDetailsExpanded((o) => !o)}
          className="inline-flex items-center gap-1.5 text-sm text-stage-muted hover:text-zinc-200 rounded-lg py-1 -mx-1 px-1 sm:px-2 sm:-mx-2 text-left transition-colors"
          aria-expanded={detailsExpanded}
          aria-controls="date-day-details"
          id="date-day-details-toggle"
          title={
            detailsExpanded
              ? 'Hide people, contacts, and promoter'
              : 'Show people, contacts, and promoter'
          }
          aria-label={
            detailsExpanded
              ? 'Collapse: people, contacts, and promoter'
              : 'Expand: people, contacts, and promoter'
          }
        >
          {detailsExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{detailsExpanded ? 'Less' : 'More'}</span>
        </button>
      </div>

      {detailsExpanded ? (
        <div
          id="date-day-details"
          className="mt-5 pt-4 border-t border-stage-border"
          role="region"
          aria-labelledby="date-day-details-toggle"
        >
          <div className="rounded-lg border border-stage-border bg-stage-surface/50 px-3 py-2.5 mb-1">
            <DateMembersSection
              tourId={tourId}
              dateId={dateId}
              travelingGroup={travelingGroup}
              allowEdit={allowEdit}
              hideAllTourMessage={hideAllTourMessage}
              embedded
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <ContactsSection
                tourId={tourId}
                dateId={dateId}
                items={contacts ?? []}
                allowEdit={allowEdit}
                compact
                embedded
              />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <User className="h-3 w-3" /> Promoter
              </p>
              <div className="rounded-lg bg-stage-card/50 border border-stage-border/50 overflow-hidden">
                {(promoterName || promoterPhone || promoterEmail) ? (
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{promoterName || '—'}</p>
                    {(promoterPhone || promoterEmail) && (
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {promoterPhone && (
                          <a href={`tel:${promoterPhone}`} className="flex items-center gap-1 text-xs text-stage-accent hover:underline">
                            <Phone className="h-3 w-3 shrink-0" /> {promoterPhone}
                          </a>
                        )}
                        {promoterEmail && (
                          <a href={`mailto:${promoterEmail}`} className="flex items-center gap-1 text-xs text-stage-accent hover:underline truncate">
                            <Mail className="h-3 w-3 shrink-0" /> {promoterEmail}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ) : !addingPromoter ? (
                  <div className="px-3 py-2 text-center text-stage-muted text-xs">No promoter</div>
                ) : null}
                {addingPromoter && promoterAddPhase === 'picker' && (
                  <div>
                    {promoterError && (
                      <p className="px-3 py-2 text-xs text-red-400 border-t border-stage-border/50">{promoterError}</p>
                    )}
                    <VenueContactPicker
                      variant="promoter"
                      onSelect={handlePromoterPickerSelect}
                      onCancel={closePromoterAdd}
                    />
                    <div className="px-3 pb-3 pt-1 border-t border-stage-border/50">
                      <button
                        type="button"
                        onClick={() => {
                          setPromoterError('');
                          setPromoterAddPhase('manual');
                          resetPromoterManualFields();
                        }}
                        disabled={promoterLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-muted disabled:opacity-50"
                      >
                        <PenLine className="h-3 w-3" /> Enter new promoter manually
                      </button>
                    </div>
                  </div>
                )}
                {addingPromoter && promoterAddPhase === 'manual' && (
                  <form onSubmit={handlePromoterManualSubmit} className="p-3 border-t border-stage-border/50 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPromoterError('');
                        setPromoterAddPhase('picker');
                      }}
                      className="text-xs text-stage-accent hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" /> Choose from venue contacts instead
                    </button>
                    <input
                      type="text"
                      value={newPromoterName}
                      onChange={(e) => setNewPromoterName(e.target.value)}
                      required
                      placeholder="Promoter name"
                      className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                    />
                    <input
                      type="tel"
                      value={newPromoterPhone}
                      onChange={(e) => setNewPromoterPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                    />
                    <input
                      type="email"
                      value={newPromoterEmail}
                      onChange={(e) => setNewPromoterEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-2 py-1.5 text-sm rounded bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
                    />
                    {promoterError && <p className="text-red-400 text-xs">{promoterError}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="submit"
                        disabled={promoterLoading}
                        className="px-3 py-1.5 text-sm rounded bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
                      >
                        Save promoter
                      </button>
                      <button
                        type="button"
                        onClick={closePromoterAdd}
                        className="px-3 py-1.5 text-sm rounded border border-stage-border text-stage-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {allowEdit && !addingPromoter && (
                  <button
                    type="button"
                    onClick={openPromoterAdd}
                    className="w-full px-3 py-2 flex items-center justify-center gap-1.5 text-stage-muted hover:text-stage-accent border-t border-stage-border/50 text-xs"
                  >
                    <Plus className="h-3 w-3" /> Add promoter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
