'use client';

import { UserCheck, Plus, X, Phone, Mail } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

type TourMember = {
  id: string;
  name: string;
  role: string;
  subgroup: string | null;
  phone: string | null;
  email: string | null;
};

function telHref(phone: string): string {
  const compact = phone.replace(/\s/g, '');
  return compact ? `tel:${compact}` : '#';
}

function subgroupSortKey(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

/** Same grouping as Traveling / Flights / Hotels (subgroup headers). */
function groupMembersBySubgroup(members: TourMember[]): { key: string | null; label: string; members: TourMember[] }[] {
  const map = new Map<string | null, TourMember[]>();
  for (const m of members) {
    const k = m.subgroup?.trim() || null;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  }
  const keys = Array.from(map.keys()).sort(subgroupSortKey);
  return keys.map((key) => ({
    key,
    label: key ?? 'No subgroup',
    members: (map.get(key) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

function AddPeoplePanel({
  notOnThisDate,
  saving,
  onAdd,
  onAddAll,
}: {
  notOnThisDate: TourMember[];
  saving: boolean;
  onAdd: (id: string) => void;
  onAddAll: () => void;
}) {
  const hasMore = notOnThisDate.length > 0;
  const grouped = groupMembersBySubgroup(notOnThisDate);
  return (
    <div className="rounded-lg border border-stage-border bg-stage-surface/40 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-zinc-400">Add people to this date</p>
        {hasMore && (
          <button
            type="button"
            onClick={onAddAll}
            disabled={saving}
            className="px-3 py-2 rounded-lg text-sm font-medium text-stage-accent hover:bg-stage-accent/10 disabled:opacity-50"
          >
            Add all
          </button>
        )}
      </div>
      {hasMore ? (
        <div className="max-h-48 overflow-y-auto space-y-3">
          {grouped.map(({ key, label, members }) => (
            <div key={key ?? '__none__'}>
              <p className="text-xs font-semibold text-zinc-500 sticky top-0 bg-stage-surface/95 py-1">{label}</p>
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm">{m.name}</p>
                      <p className="text-xs text-stage-muted">{m.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdd(m.id)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-sm text-stage-accent hover:bg-stage-accent/10 disabled:opacity-50 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stage-muted py-1">No more people to add</p>
      )}
    </div>
  );
}

export function DateMembersSection({
  tourId,
  dateId,
  travelingGroup: travelingGroupRaw,
  allowEdit,
  hideAllTourMessage,
  embedded,
}: {
  tourId: string;
  dateId: string;
  travelingGroup: {
    id: string;
    name: string;
    role: string;
    subgroup: string | null;
    phone?: string | null;
    email?: string | null;
  }[];
  allowEdit: boolean;
  hideAllTourMessage?: boolean;
  /** When true, no outer card — sits inside DateInfo */
  embedded?: boolean;
}) {
  const travelingGroup: TourMember[] = travelingGroupRaw.map((m) => ({
    ...m,
    phone: m.phone ?? null,
    email: m.email ?? null,
  }));

  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.dates.dateMembers
      .list(tourId, dateId)
      .then((res) => setAssignedIds(new Set(res.memberIds)))
      .catch(() => setAssignedIds(new Set()))
      .finally(() => setLoading(false));
  }, [tourId, dateId]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  /** Always persist against server truth so stale UI can’t wipe assignments. */
  async function applyMemberIds(nextIds: string[]) {
    if (!allowEdit || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.dates.dateMembers.set(tourId, dateId, nextIds);
      setSaveError('');
      setAssignedIds(new Set(nextIds));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
      const res = await api.dates.dateMembers.list(tourId, dateId).catch(() => ({ memberIds: [] as string[] }));
      setAssignedIds(new Set(res.memberIds));
    } finally {
      setSaving(false);
    }
  }

  async function addMember(memberId: string) {
    if (!allowEdit || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const { memberIds } = await api.dates.dateMembers.list(tourId, dateId);
      const next = Array.from(new Set([...memberIds, memberId]));
      await api.dates.dateMembers.set(tourId, dateId, next);
      setSaveError('');
      setAssignedIds(new Set(next));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to add');
      const res = await api.dates.dateMembers.list(tourId, dateId).catch(() => ({ memberIds: [] as string[] }));
      setAssignedIds(new Set(res.memberIds));
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!allowEdit || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const { memberIds } = await api.dates.dateMembers.list(tourId, dateId);
      const next = memberIds.filter((id) => id !== memberId);
      await api.dates.dateMembers.set(tourId, dateId, next);
      setSaveError('');
      setAssignedIds(new Set(next));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to remove');
      const res = await api.dates.dateMembers.list(tourId, dateId).catch(() => ({ memberIds: [] as string[] }));
      setAssignedIds(new Set(res.memberIds));
    } finally {
      setSaving(false);
    }
  }

  function addAll() {
    void applyMemberIds(travelingGroup.map((m) => m.id));
  }

  const onThisDate = travelingGroup.filter((m) => assignedIds.has(m.id));
  const notOnThisDate = travelingGroup.filter((m) => !assignedIds.has(m.id));

  const countLabel =
    loading ? '…' : `${onThisDate.length} ${onThisDate.length === 1 ? 'person' : 'people'}`;

  if (travelingGroup.length === 0) {
    const empty = (
      <p className="text-sm text-stage-muted">
        No people on this tour yet. Add them on the project page first.
      </p>
    );
    if (embedded) {
      return <div className="text-left">{empty}</div>;
    }
    return (
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-4">
        {empty}
      </div>
    );
  }

  const compact = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <UserCheck className="h-4 w-4 shrink-0 text-zinc-400" />
      <span className="text-sm font-semibold text-white shrink-0">People on this date</span>
      <span className="text-sm text-stage-muted shrink-0">· {countLabel}</span>
      <button
        type="button"
        onClick={() => {
          setSaveError('');
          setModalOpen(true);
        }}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-muted"
      >
        View
      </button>
    </div>
  );

  const modal = modalOpen && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      role="presentation"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-members-modal-title"
        className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-stage-border">
          <div>
            <h3 id="date-members-modal-title" className="text-sm font-semibold text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> People on this date
            </h3>
            <p className="text-xs text-stage-muted mt-0.5">
              {allowEdit
                ? 'Phone numbers and emails below. Add or remove people from the tour for this date at the bottom.'
                : 'Phone numbers and emails for everyone assigned to this date.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 rounded-lg text-stage-muted hover:text-stage-fg hover:bg-stage-surface shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-stage-border">
          {saveError ? (
            <div className="p-3 border-b border-stage-border">
              <p className="text-red-400 text-sm" role="alert">
                {saveError}
              </p>
            </div>
          ) : null}
          {loading ? (
            <div className="p-4 text-stage-muted text-sm">Loading…</div>
          ) : (
            <>
              {onThisDate.length > 0 && (
                <div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-stage-border">
                    {groupMembersBySubgroup(onThisDate).map(({ key, label, members }) => (
                      <div key={key ?? '__none__'} className="py-1">
                        <p className="text-xs font-semibold text-zinc-500 px-3 pt-2 pb-1">{label}</p>
                        <ul className="divide-y divide-stage-border/80">
                          {members.map((m) => (
                            <li key={m.id} className="flex items-start justify-between gap-3 p-3">
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div>
                                  <p className="font-medium text-white">{m.name}</p>
                                  <p className="text-xs text-stage-muted">{m.role}</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  {m.phone?.trim() ? (
                                    <a
                                      href={telHref(m.phone)}
                                      className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-stage-accent"
                                    >
                                      <Phone className="h-4 w-4 shrink-0 text-stage-accent" aria-hidden />
                                      <span className="tabular-nums">{m.phone.trim()}</span>
                                    </a>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 text-sm text-stage-muted">
                                      <Phone className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                                      <span>—</span>
                                    </span>
                                  )}
                                  {m.email?.trim() ? (
                                    <a
                                      href={`mailto:${m.email.trim()}`}
                                      className="inline-flex items-center gap-2 text-xs text-stage-muted hover:text-stage-accent truncate max-w-full"
                                    >
                                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                      <span className="truncate">{m.email.trim()}</span>
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                              {allowEdit && (
                                <button
                                  type="button"
                                  onClick={() => void removeMember(m.id)}
                                  disabled={saving}
                                  className="shrink-0 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50 self-start"
                                >
                                  Remove
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onThisDate.length === 0 && (
                <div className="p-4 text-center text-sm text-stage-muted">No one assigned to this date yet.</div>
              )}

              {allowEdit && (
                <div className="p-3">
                  <AddPeoplePanel
                    notOnThisDate={notOnThisDate}
                    saving={saving}
                    onAdd={(id) => void addMember(id)}
                    onAddAll={addAll}
                  />
                </div>
              )}

              {!allowEdit && notOnThisDate.length === 0 && onThisDate.length > 0 && !hideAllTourMessage && (
                <div className="p-3 text-center">
                  <p className="text-sm text-stage-muted">All tour people are on this date.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {compact}
        {modal}
      </>
    );
  }

  return (
    <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
      <div className="p-3 border-b border-stage-border">{compact}</div>
      {modal}
    </div>
  );
}
