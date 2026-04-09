'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';

type TemplateItem = {
  time: string;
  label: string;
  endTime: string;
  durationMinutes: string;
  notes: string;
  dayAfter: boolean;
};

type EditTemplate = {
  id: string;
  name: string;
  items: { time: string; endTime?: string | null; durationMinutes?: number | null; label: string; notes: string | null; sortOrder: number; dayAfter?: boolean }[];
};

function formatDurationForInput(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number | null {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function computeDurationMinutes(start: string, end: string): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s == null || e == null) return null;
  const diff = e >= s ? e - s : 24 * 60 - s + e;
  return diff;
}

function computeEndTimeFromDuration(start: string, durationStr: string): string | null {
  const s = timeToMinutes(start);
  const d = parseDuration(durationStr);
  if (s == null || d <= 0) return null;
  return minutesToTime(s + d);
}

export function CreateDaySheetTemplateForm({
  onCancel,
  template: editTemplate,
}: {
  onCancel: () => void;
  template?: EditTemplate;
}) {
  const router = useRouter();
  const isEdit = !!editTemplate;
  const [name, setName] = useState(editTemplate?.name ?? '');
  const [items, setItems] = useState<TemplateItem[]>(
    editTemplate?.items?.length
      ? editTemplate.items.map((i) => ({
          time: i.time || '00:00',
          label: i.label || '',
          endTime: i.endTime || '',
          durationMinutes: i.durationMinutes != null ? formatDurationForInput(i.durationMinutes) : '',
          notes: i.notes || '',
          dayAfter: i.dayAfter ?? false,
        }))
      : [],
  );

  useEffect(() => {
    if (editTemplate) {
      setName(editTemplate.name);
      setItems(
        editTemplate.items.map((i) => ({
          time: i.time || '00:00',
          label: i.label || '',
          endTime: i.endTime || '',
          durationMinutes: i.durationMinutes != null ? formatDurationForInput(i.durationMinutes) : '',
          notes: i.notes || '',
          dayAfter: i.dayAfter ?? false,
        })),
      );
    }
  }, [editTemplate]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formItem, setFormItem] = useState<TemplateItem>({ time: '', label: '', endTime: '', durationMinutes: '', notes: '', dayAfter: false });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);


  function addItemToList(e?: React.FormEvent) {
    e?.preventDefault();
    if (!formItem.label.trim()) return;
    setItems((prev) => [...prev, { ...formItem }]);
    setFormItem({ time: '', label: '', endTime: '', durationMinutes: '', notes: '', dayAfter: false });
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setFormItem({ ...items[idx] });
  }

  function saveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingIdx == null || !formItem.label.trim()) return;
    setItems((prev) => prev.map((it, i) => (i === editingIdx ? { ...formItem } : it)));
    setEditingIdx(null);
    setFormItem({ time: '', label: '', endTime: '', durationMinutes: '', notes: '', dayAfter: false });
  }

  function cancelEdit() {
    setEditingIdx(null);
    setFormItem({ time: '', label: '', endTime: '', durationMinutes: '', notes: '', dayAfter: false });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) cancelEdit();
    else if (editingIdx != null && idx < editingIdx) setEditingIdx(editingIdx - 1);
  }

  function updateFormItem(field: keyof TemplateItem, value: string | boolean) {
    setFormItem((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'endTime' && typeof value === 'string') {
        const dur = computeDurationMinutes(prev.time, value);
        if (dur != null) next.durationMinutes = formatDurationForInput(dur);
      } else if (field === 'durationMinutes' && typeof value === 'string') {
        const end = computeEndTimeFromDuration(prev.time, value);
        if (end != null) next.endTime = end;
      } else if (field === 'time') {
        if (prev.endTime) {
          const dur = computeDurationMinutes(String(value), prev.endTime);
          if (dur != null) next.durationMinutes = formatDurationForInput(dur);
        } else if (prev.durationMinutes) {
          const end = computeEndTimeFromDuration(String(value), prev.durationMinutes);
          if (end != null) next.endTime = end;
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Template name required');
      return;
    }
    const validItems = items.filter((i) => i.label.trim());
    if (validItems.length === 0) {
      setError('Add at least one item with a label');
      return;
    }
    const sortedItems = [...validItems].sort((a, b) => {
      const da = a.dayAfter ? 1 : 0;
      const db = b.dayAfter ? 1 : 0;
      if (da !== db) return da - db;
      return (a.time || 'zz:zz').localeCompare(b.time || 'zz:zz');
    });
    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        items: sortedItems.map((i, idx) => ({
          time: i.time || '00:00',
          label: i.label.trim(),
          endTime: i.endTime || undefined,
          durationMinutes: i.durationMinutes ? parseDuration(i.durationMinutes) : undefined,
          notes: i.notes || undefined,
          sortOrder: idx,
          dayAfter: i.dayAfter,
        })),
      };
      if (isEdit && editTemplate) {
        await api.scheduleTemplates.update(editTemplate.id, body);
      } else {
        await api.scheduleTemplates.create(body);
      }
      router.refresh();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04]">
      <form
        id="template-form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && editingIdx != null) {
            e.preventDefault();
            saveEdit();
          }
        }}
        className="space-y-4"
      >
      <div>
        <label className="block text-xs text-stage-muted mb-1">Template name</label>
        <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard concert day"
            required
            className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
          />
      </div>
      <div>
        <label className="block text-xs text-stage-muted mb-2">Schedule items</label>
        {items.length > 0 && (
          <ul className="divide-y divide-stage-border rounded-lg bg-stage-surface border border-stage-border overflow-hidden mb-4">
            {(() => {
              const sortedIndices = items.map((_, i) => i).sort((a, b) => {
                const ia = items[a];
                const ib = items[b];
                const da = ia.dayAfter ? 1 : 0;
                const db = ib.dayAfter ? 1 : 0;
                if (da !== db) return da - db;
                return (ia.time || 'zz:zz').localeCompare(ib.time || 'zz:zz');
              });
              return sortedIndices.map((idx) => {
                const item = items[idx];
                if (editingIdx === idx) {
                return (
                  <li key={idx} className="p-4 border-t border-stage-border first:border-t-0">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-stage-muted mb-1">Label</label>
                        <input
                          type="text"
                          value={formItem.label}
                          onChange={(e) => updateFormItem('label', e.target.value)}
                          placeholder="e.g. Soundcheck, Doors, Show"
                          className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Start time</label>
                          <input
                            type="time"
                            value={formItem.time}
                            onChange={(e) => updateFormItem('time', e.target.value)}
                            className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">End time <span className="text-stage-muted/70">(optional)</span></label>
                          <input
                            type="time"
                            value={formItem.endTime}
                            onChange={(e) => updateFormItem('endTime', e.target.value)}
                            className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stage-muted mb-1">Duration <span className="text-stage-muted/70">(optional)</span></label>
                          <input
                            type="time"
                            value={formItem.durationMinutes}
                            onChange={(e) => updateFormItem('durationMinutes', e.target.value)}
                            className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
                            title="Hours:minutes (e.g. 01:30 for 1h 30m)"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-sm text-stage-muted whitespace-nowrap cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            checked={formItem.dayAfter}
                            onChange={(e) => updateFormItem('dayAfter', e.target.checked)}
                            className="rounded border-stage-border bg-stage-surface text-stage-accent"
                          />
                          Day after
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs text-stage-muted mb-1">Notes</label>
                        <input
                          type="text"
                          value={formItem.notes}
                          onChange={(e) => updateFormItem('notes', e.target.value)}
                          placeholder="Optional notes"
                          className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit()}
                          className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium"
                        >
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }
              const dur = item.durationMinutes ? parseDuration(item.durationMinutes) : null;
              return (
                <li key={idx} className="p-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0">
                    <div className="flex flex-col">
                      <span className="font-mono text-stage-accent text-sm">{item.time}</span>
                      {item.endTime && (
                        <span className="font-mono text-stage-muted text-sm">{item.endTime}</span>
                      )}
                    </div>
                    {(item.endTime || dur != null) && (
                      <span className="font-mono text-stage-muted text-sm">
                        {dur != null && (
                          <span className="text-xs">
                            ({dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur}m`})
                          </span>
                        )}
                      </span>
                    )}
                    <span className="ml-3 font-medium text-white">{item.label}</span>
                    {item.notes && <p className="text-stage-muted text-sm mt-1 w-full">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(idx)}
                      className="p-1.5 rounded-lg text-stage-muted hover:text-stage-accent hover:bg-stage-accent/10"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
              });
            })()}
          </ul>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>
      {editingIdx == null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItemToList();
          }}
          className="space-y-3 p-4 rounded-lg bg-stage-surface border border-stage-border"
        >
          <div>
            <label className="block text-xs text-stage-muted mb-1">Label</label>
            <input
              type="text"
              value={formItem.label}
              onChange={(e) => updateFormItem('label', e.target.value)}
              placeholder="e.g. Soundcheck, Doors, Show"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-stage-muted mb-1">Start time</label>
              <input
                type="time"
                value={formItem.time}
                onChange={(e) => updateFormItem('time', e.target.value)}
                className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
              />
            </div>
            <div>
              <label className="block text-xs text-stage-muted mb-1">End time <span className="text-stage-muted/70">(optional)</span></label>
              <input
                type="time"
                value={formItem.endTime}
                onChange={(e) => updateFormItem('endTime', e.target.value)}
                className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
              />
            </div>
            <div>
              <label className="block text-xs text-stage-muted mb-1">Duration <span className="text-stage-muted/70">(optional)</span></label>
              <input
                type="time"
                value={formItem.durationMinutes}
                onChange={(e) => updateFormItem('durationMinutes', e.target.value)}
                className="min-w-[110px] px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-stage-border"
                title="Hours:minutes (e.g. 01:30 for 1h 30m)"
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-stage-muted whitespace-nowrap cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={formItem.dayAfter}
                onChange={(e) => updateFormItem('dayAfter', e.target.checked)}
                className="rounded border-stage-border bg-stage-surface text-stage-accent"
              />
              Day after
            </label>
          </div>
          <div>
            <label className="block text-xs text-stage-muted mb-1">Notes</label>
            <input
              type="text"
              value={formItem.notes}
              onChange={(e) => updateFormItem('notes', e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={!formItem.label.trim()}
            className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          form="template-form"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function parseDuration(str: string): number {
  const s = str.trim();
  const colon = s.indexOf(':');
  if (colon >= 0) {
    const h = parseInt(s.slice(0, colon), 10) || 0;
    const m = parseInt(s.slice(colon + 1), 10) || 0;
    return h * 60 + m;
  }
  return parseInt(s, 10) || 0;
}
