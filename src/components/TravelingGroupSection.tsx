'use client';

import { Plus, Phone, Mail, Users, Pencil, X } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PersonPicker } from './PersonPicker';
import { GroupPicker } from './GroupPicker';

const COLLAPSED_LIMIT = 5;

type Member = {
  id: string;
  name: string;
  role: string;
  subgroup: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  personId?: string;
};

function travelingRoleFromPersonType(type: string): string {
  if (type === 'musician' || type === 'superstar') return 'band';
  if (type === 'tour_manager') return 'tour manager';
  if (type === 'productionmanager') return 'production manager';
  if (type === 'driver') return 'driver';
  return 'crew';
}

export function TravelingGroupSection({
  tourId,
  members,
  allowEdit,
}: {
  tourId: string;
  members: Member[];
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [addToSubgroup, setAddToSubgroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [isEditingCrew, setIsEditingCrew] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  const exceedsLimit = members.length > COLLAPSED_LIMIT;

  const closePeopleModal = useCallback(() => {
    setIsPeopleModalOpen(false);
    setIsEditingCrew(false);
  }, []);

  useEffect(() => {
    if (!isPeopleModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePeopleModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPeopleModalOpen, closePeopleModal]);

  useEffect(() => {
    if (!isPeopleModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPeopleModalOpen]);

  useEffect(() => {
    if (!exceedsLimit) setIsPeopleModalOpen(false);
  }, [exceedsLimit]);

  const existingPersonIds = useMemo(
    () => members.map((m) => m.personId).filter(Boolean) as string[],
    [members]
  );

  async function handleSelect(person: { id: string; name: string; type: string; phone: string | null; email: string | null; notes: string | null } & { role: string }) {
    setError('');
    setLoading(true);
    try {
      await api.travelingGroup.create(tourId, {
        name: person.name,
        role: person.role,
        subgroup: addToSubgroup.trim() || undefined,
        phone: person.phone || undefined,
        email: person.email || undefined,
        notes: person.notes || undefined,
        personId: person.id,
      });
      setShowPicker(false);
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function handleSelectMultiple(people: { id: string; name: string; type: string; phone: string | null; email: string | null; notes: string | null; role: string }[]) {
    setError('');
    setLoading(true);
    try {
      for (const person of people) {
        await api.travelingGroup.create(tourId, {
          name: person.name,
          role: person.role,
          subgroup: addToSubgroup.trim() || undefined,
          phone: person.phone || undefined,
          email: person.email || undefined,
          notes: person.notes || undefined,
          personId: person.id,
        });
      }
      setShowPicker(false);
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  function toggleMemberSelection(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllMembers() {
    setSelectedMemberIds(new Set(members.map((m) => m.id)));
  }

  function clearMemberSelection() {
    setSelectedMemberIds(new Set());
  }

  const [subgroupForSelected, setSubgroupForSelected] = useState('');

  async function handleRemoveSelected() {
    const ids = Array.from(selectedMemberIds);
    if (ids.length === 0) return;
    setError('');
    setLoading(true);
    try {
      for (const id of ids) {
        await api.travelingGroup.delete(tourId, id);
      }
      setSelectedMemberIds(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetSubgroupForSelected() {
    const ids = Array.from(selectedMemberIds);
    if (ids.length === 0) return;
    setLoading(true);
    try {
      for (const id of ids) {
        await api.travelingGroup.update(tourId, id, { subgroup: subgroupForSelected.trim() || null });
      }
      setSelectedMemberIds(new Set());
      setSubgroupForSelected('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGroup(groupId: string, subgroupFilter?: string | null) {
    setError('');
    setLoading(true);
    try {
      const group = await api.groups.get(groupId);
      const exclude = new Set(existingPersonIds);
      let toAdd = group.members.filter((m) => !exclude.has(m.personId));
      if (subgroupFilter != null && subgroupFilter !== '') {
        toAdd = toAdd.filter((m) => (m.subgroup?.trim() || null) === subgroupFilter);
      }
      for (const m of toAdd) {
        const subgroupVal = m.subgroup || addToSubgroup.trim() || undefined;
        await api.travelingGroup.create(tourId, {
          name: m.name,
          role: m.role,
          subgroup: subgroupVal,
          phone: m.phone || undefined,
          email: m.email || undefined,
          personId: m.personId,
        });
      }
      setShowGroupPicker(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function renderGroupedMemberList(scrollClassName: string) {
    const bySubgroup = new Map<string | null, Member[]>();
    for (const m of members) {
      const key = m.subgroup?.trim() || null;
      if (!bySubgroup.has(key)) bySubgroup.set(key, []);
      bySubgroup.get(key)!.push(m);
    }
    const subgroupOrder = Array.from(bySubgroup.keys()).sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
    return (
      <div className={scrollClassName}>
        <ul className="divide-y divide-stage-border">
          {subgroupOrder.map((subgroupKey) => {
            const groupMembers = bySubgroup.get(subgroupKey)!;
            const groupLabel = subgroupKey || null;
            return (
              <li key={groupLabel ?? '__ungrouped__'}>
                {groupLabel && (
                  <div className="px-4 py-2 bg-stage-surface/50 border-b border-stage-border text-sm font-medium text-stage-muted">
                    {groupLabel}
                  </div>
                )}
                {groupMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 flex items-start justify-between gap-2 border-b border-stage-border last:border-b-0"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {allowEdit && isEditingCrew && (
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.has(m.id)}
                          onChange={() => toggleMemberSelection(m.id)}
                          className="rounded border-stage-border w-4 h-4 mt-0.5 shrink-0 accent-stage-accent"
                          aria-label={`Select ${m.name}`}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white">{m.name}</p>
                        <span className="text-xs text-stage-muted capitalize">{m.role}</span>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" /> {m.phone}
                            </a>
                          )}
                          {m.email && (
                            <a
                              href={`mailto:${m.email}`}
                              className="flex items-center gap-1.5 text-sm text-stage-accent hover:underline"
                            >
                              <Mail className="h-3.5 w-3.5" /> {m.email}
                            </a>
                          )}
                        </div>
                        {m.notes && <p className="text-sm text-zinc-400 mt-1">{m.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const editCrewChrome = (
    <>
      {allowEdit && members.length > 0 && !isEditingCrew && (
        <div className="py-2 px-4 border-b border-stage-border shrink-0">
          <button
            type="button"
            onClick={() => setIsEditingCrew(true)}
            className="flex items-center gap-2 text-sm text-stage-muted hover:text-stage-neonCyan"
          >
            <Pencil className="h-4 w-4" /> Edit crew
          </button>
        </div>
      )}
      {allowEdit && members.length > 0 && isEditingCrew && (
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-4 border-b border-stage-border shrink-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsEditingCrew(false)}
              className="text-sm font-medium py-1.5 px-3 rounded-md border border-stage-border text-white hover:border-stage-neonCyan/40 hover:text-stage-neonCyan transition"
            >
              Done
            </button>
            <button
              type="button"
              onClick={selectAllMembers}
              className="text-sm font-medium py-1.5 px-3 rounded-md border border-stage-border text-white hover:border-stage-neonCyan/40 hover:text-stage-neonCyan transition"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearMemberSelection}
              className="text-sm font-medium py-1.5 px-3 rounded-md border border-stage-border text-white hover:border-stage-neonCyan/40 hover:text-stage-neonCyan transition"
            >
              Clear
            </button>
            {selectedMemberIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={subgroupForSelected}
                  onChange={(e) => setSubgroupForSelected(e.target.value)}
                  placeholder="Group name (e.g. Crew, Band)"
                  className="px-2 py-1.5 rounded-md bg-stage-surface border border-stage-border text-white text-sm w-40 placeholder-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleSetSubgroupForSelected}
                  disabled={loading}
                  className="text-sm font-medium py-1.5 px-3 rounded-md border border-stage-border text-white hover:border-stage-neonCyan/40 hover:text-stage-neonCyan disabled:opacity-50"
                >
                  Set group
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={loading}
                  className="text-sm font-medium py-1.5 px-3 rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Remove selected
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const peopleModal =
    exceedsLimit &&
    isPeopleModalOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
        role="presentation"
        onClick={closePeopleModal}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-people-modal-title"
          className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 p-4 border-b border-stage-border shrink-0">
            <div>
              <h3 id="tour-people-modal-title" className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" /> People on this tour
              </h3>
              <p className="text-xs text-stage-muted mt-0.5">
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </p>
            </div>
            <button
              type="button"
              onClick={closePeopleModal}
              className="p-1.5 rounded-lg text-stage-muted hover:text-stage-fg hover:bg-stage-surface shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            {editCrewChrome}
            {renderGroupedMemberList('flex-1 min-h-0 overflow-y-auto overscroll-contain')}
          </div>
        </div>
      </div>
    );

  return (
    <section>
      <div className="rounded-xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {members.length === 0 && !showPicker ? (
          <div className="p-4 text-center text-stage-muted text-xs">
            No members yet.
            {allowEdit && (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg font-medium hover:bg-stage-accentHover disabled:opacity-50 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" /> Pick from people database
                </button>
                <button
                  type="button"
                  onClick={() => setShowGroupPicker(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-neonCyan/40 disabled:opacity-50 text-xs"
                >
                  <Users className="h-3.5 w-3.5 shrink-0" /> Add from group
                </button>
              </div>
            )}
          </div>
        ) : exceedsLimit ? (
          <button
            type="button"
            onClick={() => setIsPeopleModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isPeopleModalOpen}
            className="w-full py-2.5 px-3 flex items-center justify-center gap-1.5 text-center hover:bg-white/5 transition"
          >
            <span className="text-sm font-medium text-white">
              {members.length} {members.length === 1 ? 'person' : 'people'} on this tour
            </span>
          </button>
        ) : (
          <>
            {editCrewChrome}
            {renderGroupedMemberList('max-h-80 min-h-0 overflow-y-auto overscroll-contain')}
          </>
        )}
        {(showPicker || showGroupPicker) && (
          <div className="p-3 border-t border-stage-border">
            <label className="block text-xs text-stage-muted mb-1.5">Add to group (optional)</label>
            <input
              type="text"
              value={addToSubgroup}
              onChange={(e) => setAddToSubgroup(e.target.value)}
              placeholder="e.g. Crew, Band"
              className="w-full px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
            />
          </div>
        )}
        {showPicker && (
          <PersonPicker
            roleMap={travelingRoleFromPersonType}
            excludePersonIds={existingPersonIds}
            onSelect={handleSelect}
            onSelectMultiple={handleSelectMultiple}
            onCancel={() => { setShowPicker(false); setError(''); }}
          />
        )}
        {showGroupPicker && (
          <GroupPicker
            onSelect={handleAddGroup}
            onCancel={() => { setShowGroupPicker(false); setError(''); }}
          />
        )}
        {error && <p className="p-3 text-red-400 text-sm border-t border-stage-border">{error}</p>}
        {allowEdit && !showPicker && !showGroupPicker && members.length > 0 && (
          <div className="flex border-t border-stage-border">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              disabled={loading}
              className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 text-xs text-stage-muted hover:text-stage-neonCyan disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /> Pick from people database
            </button>
            <button
              type="button"
              onClick={() => setShowGroupPicker(true)}
              disabled={loading}
              className="flex-1 py-2 px-2 flex items-center justify-center gap-1.5 text-xs text-stage-muted hover:text-stage-neonCyan border-l border-stage-border disabled:opacity-50"
            >
              <Users className="h-3.5 w-3.5 shrink-0" /> Add from group
            </button>
          </div>
        )}
      </div>
      {peopleModal}
    </section>
  );
}
