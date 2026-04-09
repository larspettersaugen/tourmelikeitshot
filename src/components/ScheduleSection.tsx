'use client';

import { Clock, Pencil, Plus, Trash2, ChevronDown, ChevronUp, FileStack, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Plane, Car } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { shortPassengerLabels } from '@/lib/short-passenger-labels';

/** Parse duration: "1:30" -> 90, "30" -> 30, "0:45" -> 45 */
function parseDurationInput(str: string): number | null {
  const s = str.trim();
  if (!s) return null;
  const colon = s.indexOf(':');
  if (colon >= 0) {
    const h = parseInt(s.slice(0, colon), 10);
    const m = parseInt(s.slice(colon + 1), 10);
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m >= 60) return null;
    return h * 60 + m;
  }
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? null : n;
}

/** Format minutes for time input: 90 -> "01:30", 45 -> "00:45" (HH:mm) */
function formatDurationForInput(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutes between two "HH:mm" or "HH:mm:ss" times */
function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh - sh) * 60 + (em - sm);
}

/** Add minutes to "HH:mm" time, return "HH:mm" */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

type Item = {
  id: string;
  time: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  label: string;
  notes: string | null;
  sortOrder: number;
  dayAfter?: boolean;
};
type FlightPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  bookingRef: string | null;
  personId?: string | null;
};
type Flight = {
  id: string;
  tourDateId: string | null;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber: string | null;
  notes: string | null;
  passengers: FlightPassenger[];
};
type TransportPassenger = {
  id: string;
  travelGroupMemberId: string;
  name: string;
  role: string;
  personId?: string | null;
};
type TransportItem = {
  id: string;
  type: string;
  time: string;
  dayAfter?: boolean;
  driver: string | null;
  driverPhone: string | null;
  driverEmail: string | null;
  company: string | null;
  notes: string | null;
  passengers: TransportPassenger[];
};

export function ScheduleSection({
  tourId,
  dateId,
  items,
  flights = [],
  transport = [],
  viewerPersonId = null,
  date,
  allowEdit,
}: {
  tourId: string;
  dateId: string;
  items: Item[];
  flights?: Flight[];
  transport?: TransportItem[];
  viewerPersonId?: string | null;
  date?: string;
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [dayAfter, setDayAfter] = useState(false);
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expandedPassengerIds, setExpandedPassengerIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<{ id: string; name: string; items: { time: string; label: string; endTime?: string | null; durationMinutes?: number | null; notes: string | null; sortOrder: number; dayAfter?: boolean }[] }[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaveLoading, setTemplateSaveLoading] = useState(false);

  useEffect(() => {
    if (allowEdit) {
      setTemplatesLoading(true);
      api.scheduleTemplates
        .list()
        .then(setTemplates)
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [allowEdit]);

  const PASSENGER_COLLAPSE_THRESHOLD = 3;
  function togglePassengerExpand(id: string) {
    setExpandedPassengerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApplyTemplate(templateId: string) {
    setError('');
    setApplyingTemplateId(templateId);
    try {
      await api.schedule.applyTemplate(tourId, dateId, templateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplyingTemplateId(null);
    }
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) return;
    setError('');
    setTemplateSaveLoading(true);
    try {
      const body = {
        name: templateName.trim(),
        items: items.map((i, idx) => ({
          time: i.time,
          label: i.label,
          endTime: i.endTime || undefined,
          durationMinutes: i.durationMinutes ?? undefined,
          notes: i.notes || undefined,
          sortOrder: i.sortOrder ?? idx,
          dayAfter: i.dayAfter ?? false,
        })),
      };
      await api.scheduleTemplates.create(body);
      setSavingAsTemplate(false);
      setTemplateName('');
      const list = await api.scheduleTemplates.list();
      setTemplates(list);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setTemplateSaveLoading(false);
    }
  }

  async function handleDelete(itemId: string) {
    setError('');
    setDeletingId(itemId);
    try {
      await api.schedule.delete(tourId, dateId, itemId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeletingId(null);
    }
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setTime(item.time);
    setEndTime(item.endTime || '');
    setDurationMinutes(item.durationMinutes != null ? formatDurationForInput(item.durationMinutes) : '');
    setDayAfter(item.dayAfter ?? false);
    setLabel(item.label);
    setNotes(item.notes || '');
    setError('');
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setTime('');
    setEndTime('');
    setDurationMinutes('');
    setDayAfter(false);
    setLabel('');
    setNotes('');
    setError('');
  }

  function getFormBody() {
    const body: { time: string; label: string; notes?: string; dayAfter: boolean; endTime?: string; durationMinutes?: number } = {
      time,
      label,
      notes: notes || undefined,
      dayAfter,
    };
    if (endTime) body.endTime = endTime;
    const dur = durationMinutes ? parseDurationInput(durationMinutes) : undefined;
    if (dur != null && dur > 0) body.durationMinutes = dur;
    return body;
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (newTime) {
      const dur = parseDurationInput(durationMinutes);
      if (dur != null && dur > 0) setEndTime(addMinutesToTime(newTime, dur));
      else if (endTime) {
        const mins = minutesBetween(newTime, endTime);
        if (mins >= 0) setDurationMinutes(formatDurationForInput(mins));
      }
    }
  }

  function handleEndTimeChange(newEndTime: string) {
    setEndTime(newEndTime);
    if (!newEndTime) setDurationMinutes('');
    else if (time) {
      const mins = minutesBetween(time, newEndTime);
      if (mins >= 0) setDurationMinutes(formatDurationForInput(mins));
    }
  }

  function handleDurationChange(newDuration: string) {
    setDurationMinutes(newDuration);
    const dur = parseDurationInput(newDuration);
    if (time && dur != null && dur > 0) setEndTime(addMinutesToTime(time, dur));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.schedule.create(tourId, dateId, getFormBody());
      cancelForm();
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setLoading(true);
    try {
      const body = getFormBody();
      await api.schedule.update(tourId, dateId, editingId, {
        time: body.time,
        label: body.label,
        notes: body.notes,
        dayAfter: body.dayAfter,
        endTime: body.endTime || null,
        durationMinutes: body.durationMinutes ?? null,
      });
      cancelForm();
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setLoading(false);
    }
  }

  type ScheduleEntry =
    | { type: 'item'; item: Item }
    | { type: 'flight'; flight: Flight }
    | { type: 'transport'; transport: TransportItem };
  const entries: ScheduleEntry[] = [
    ...items.map((item) => ({ type: 'item' as const, item })),
    ...flights.map((flight) => ({ type: 'flight' as const, flight })),
    ...transport.map((t) => ({ type: 'transport' as const, transport: t })),
  ];
  const sortedEntries = [...entries].sort((a, b) => {
    const getSortKey = (e: ScheduleEntry): string => {
      if (e.type === 'item') {
        if (!date) return `0-${e.item.sortOrder}`;
        const d = e.item.dayAfter ? addDays(new Date(date), 1).toISOString().slice(0, 10) : date;
        return `${d}T${e.item.time}`;
      }
      if (e.type === 'flight') return e.flight.departureTime;
      if (!date) return `1-${e.transport.time}`;
      const d = e.transport.dayAfter ? addDays(new Date(date), 1).toISOString().slice(0, 10) : date;
      return `${d}T${e.transport.time}`;
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  });

  const isEmpty = items.length === 0 && flights.length === 0 && transport.length === 0 && !adding && !editingId;

  function renderScheduleForm(_itemId?: string, isEdit = false) {
    return (
      <form onSubmit={isEdit ? handleUpdate : handleAdd} className="space-y-3">
        <div>
          <label className="block text-xs text-stage-muted mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="e.g. Soundcheck, Doors, Show"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-stage-muted mb-1">Start time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              required
              className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
            />
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">End time <span className="text-stage-muted/70">(optional)</span></label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
            />
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">Duration <span className="text-stage-muted/70">(optional)</span></label>
            <input
              type="time"
              value={durationMinutes}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
              title="Hours:minutes (e.g. 01:30 for 1h 30m)"
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-stage-muted whitespace-nowrap cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={dayAfter}
              onChange={(e) => setDayAfter(e.target.checked)}
              className="rounded border-stage-border bg-stage-surface text-stage-accent"
            />
            Day after
          </label>
        </div>
        <div>
          <label className="block text-xs text-stage-muted mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
          >
            {isEdit ? 'Save' : 'Add'}
          </button>
          <button
            type="button"
            onClick={cancelForm}
            className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 opacity-90" /> Schedule
      </h2>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden shadow-card-inset ring-1 ring-white/[0.04]">
        {allowEdit && (templates.length > 0 || items.length > 0) && (
          <div className="p-3 border-b border-stage-border flex flex-wrap items-center gap-2">
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <FileStack className="h-4 w-4 text-stage-muted" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) handleApplyTemplate(id);
                    e.target.value = '';
                  }}
                  disabled={templatesLoading || !!applyingTemplateId}
                  className="px-2 py-1.5 rounded-lg bg-stage-surface border border-stage-border text-white text-sm min-w-[160px]"
                >
                  <option value="">Import from Day sheets…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.items.length} items)
                    </option>
                  ))}
                </select>
                {applyingTemplateId && <span className="text-stage-muted text-xs">Applying…</span>}
              </div>
            )}
            {items.length > 0 && !savingAsTemplate && (
              <button
                type="button"
                onClick={() => setSavingAsTemplate(true)}
                className="flex items-center gap-1.5 text-sm text-stage-muted hover:text-stage-accent"
              >
                <Save className="h-4 w-4" /> Save to Day sheets
              </button>
            )}
            {savingAsTemplate && (
              <form onSubmit={handleSaveAsTemplate} className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="px-2 py-1.5 rounded-lg bg-stage-surface border border-stage-border text-white text-sm w-40 placeholder-zinc-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!templateName.trim() || templateSaveLoading}
                  className="px-2 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setSavingAsTemplate(false); setTemplateName(''); }}
                  className="px-2 py-1.5 rounded-lg border border-stage-border text-stage-muted text-sm"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
        {error && !adding && <p className="p-4 text-red-400 text-sm">{error}</p>}
        {isEmpty ? (
          <div className="p-6 min-h-[120px] flex flex-col justify-center items-center text-center text-stage-muted text-sm">No schedule items</div>
        ) : (
          <ul className="divide-y divide-stage-border">
            {sortedEntries.map((entry) =>
              entry.type === 'item' ? (
                editingId === entry.item.id ? (
                  <li key={entry.item.id} className="p-4 border-t border-stage-border first:border-t-0">
                    {renderScheduleForm(entry.item.id, true)}
                  </li>
                ) : (
                  <li key={entry.item.id} className="p-4 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <div className="flex flex-col shrink-0 font-mono text-sm tabular-nums">
                        <span className="text-stage-neonCyan font-medium">{entry.item.time}</span>
                        {entry.item.endTime && (
                          <span className="text-stage-muted">{entry.item.endTime}</span>
                        )}
                        {entry.item.durationMinutes != null && (
                          <span className="text-stage-muted text-xs leading-tight mt-0.5">
                            (
                            {entry.item.durationMinutes >= 60
                              ? `${Math.floor(entry.item.durationMinutes / 60)}h${entry.item.durationMinutes % 60 ? ` ${entry.item.durationMinutes % 60}m` : ''}`
                              : `${entry.item.durationMinutes}m`}
                            )
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-white">{entry.item.label}</span>
                        {entry.item.notes && (
                          <p className="text-stage-muted text-sm mt-1">{entry.item.notes}</p>
                        )}
                      </div>
                    </div>
                    {allowEdit && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(entry.item)}
                          className="p-1.5 rounded-lg text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.item.id)}
                          disabled={deletingId === entry.item.id}
                          className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                )
              ) : entry.type === 'flight' ? (
                <li key={entry.flight.id} className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-stage-neonCyan text-sm font-medium">
                      {format(new Date(entry.flight.departureTime), 'HH:mm')}
                    </span>
                    <span className="ml-3 font-medium text-white inline-flex items-center gap-2 flex-wrap">
                      <Plane className="h-4 w-4 text-stage-muted" />
                      {entry.flight.departureAirport} → {entry.flight.arrivalAirport}
                      {entry.flight.flightNumber && (
                        <span className="text-stage-muted font-normal">{entry.flight.flightNumber}</span>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          viewerPersonId && entry.flight.passengers.some((p) => p.personId === viewerPersonId)
                            ? 'bg-stage-accent/20 text-stage-accent'
                            : 'bg-stage-surface text-stage-muted'
                        }`}
                      >
                        {viewerPersonId && entry.flight.passengers.some((p) => p.personId === viewerPersonId)
                          ? 'Your flight'
                          : 'Visible to you'}
                      </span>
                    </span>
                    <p className="text-stage-muted text-sm mt-1">
                      {format(new Date(entry.flight.departureTime), 'MMM d, HH:mm')} –{' '}
                      {format(new Date(entry.flight.arrivalTime), 'HH:mm')}
                    </p>
                    {entry.flight.notes && (
                      <p className="text-stage-muted text-sm mt-1">{entry.flight.notes}</p>
                    )}
                    {entry.flight.passengers.length > 0 && (() => {
                      const names = entry.flight.passengers.map((p) => p.name);
                      const many = names.length > PASSENGER_COLLAPSE_THRESHOLD;
                      const expanded = expandedPassengerIds.has(entry.flight.id);
                      const shortLabels = shortPassengerLabels(names);
                      const visible = many && !expanded
                        ? shortLabels.slice(0, PASSENGER_COLLAPSE_THRESHOLD)
                        : shortLabels;
                      return (
                        <div className="text-stage-muted text-sm mt-1">
                          <span>{visible.join(', ')}{many && !expanded ? '…' : ''}</span>
                          {many && (
                            <button
                              type="button"
                              onClick={() => togglePassengerExpand(entry.flight.id)}
                              className="ml-1.5 text-stage-accent hover:underline text-xs inline-flex items-center gap-0.5"
                            >
                              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all ({names.length})</>}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </li>
              ) : (
                <li key={entry.transport.id} className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-stage-neonCyan text-sm font-medium">{entry.transport.time}</span>
                    <span className="ml-3 font-medium text-white inline-flex items-center gap-2 flex-wrap capitalize">
                      <Car className="h-4 w-4 text-stage-muted" />
                      {entry.transport.type}
                      {(entry.transport.driver || entry.transport.company) && (
                        <span className="text-stage-muted font-normal">
                          · {[entry.transport.driver, entry.transport.company].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          viewerPersonId && entry.transport.passengers.some((p) => p.personId === viewerPersonId)
                            ? 'bg-stage-accent/20 text-stage-accent'
                            : 'bg-stage-surface text-stage-muted'
                        }`}
                      >
                        {viewerPersonId && entry.transport.passengers.some((p) => p.personId === viewerPersonId)
                          ? 'Your transport'
                          : 'Visible to you'}
                      </span>
                    </span>
                    {entry.transport.passengers.length > 0 && (() => {
                      const names = entry.transport.passengers.map((p) => p.name);
                      const many = names.length > PASSENGER_COLLAPSE_THRESHOLD;
                      const expanded = expandedPassengerIds.has(entry.transport.id);
                      const shortLabels = shortPassengerLabels(names);
                      const visible = many && !expanded
                        ? shortLabels.slice(0, PASSENGER_COLLAPSE_THRESHOLD)
                        : shortLabels;
                      return (
                        <div className="text-stage-muted text-sm mt-1">
                          <span>{visible.join(', ')}{many && !expanded ? '…' : ''}</span>
                          {many && (
                            <button
                              type="button"
                              onClick={() => togglePassengerExpand(entry.transport.id)}
                              className="ml-1.5 text-stage-accent hover:underline text-xs inline-flex items-center gap-0.5"
                            >
                              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all ({names.length})</>}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </li>
              )
            )}
          </ul>
        )}
        {adding && (
          <div className="p-4 border-t border-stage-border">
            {renderScheduleForm(undefined, false)}
          </div>
        )}
        {allowEdit && !adding && !editingId && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full p-3 flex items-center justify-center gap-2 text-stage-muted hover:text-stage-accent border-t border-stage-border"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        )}
      </div>
    </section>
  );
}
