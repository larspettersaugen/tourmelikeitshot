'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, ChevronDown, ChevronRight, GripVertical, UserMinus } from 'lucide-react';
import { api } from '@/lib/api';

type Group = {
  id: string;
  name: string;
  memberCount: number;
};

type GroupMember = {
  id: string;
  personId: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  role: string;
  subgroup: string | null;
};

type Person = {
  id: string;
  name: string;
  type: string;
};

export function GroupsContent({ allowEdit }: { allowEdit: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<{
    id: string;
    name: string;
    members: GroupMember[];
  } | null>(null);
  const [addPersonGroupId, setAddPersonGroupId] = useState<string | null>(null);
  const [addToSubgroup, setAddToSubgroup] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [lastClickedMemberIndex, setLastClickedMemberIndex] = useState<number | null>(null);
  const [dragOverSubgroup, setDragOverSubgroup] = useState<string | null>(null);
  const [newSubgroupFor, setNewSubgroupFor] = useState<{ groupId: string; personIds: string[] } | null>(null);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [createSubgroupGroupId, setCreateSubgroupGroupId] = useState<string | null>(null);
  const [createSubgroupName, setCreateSubgroupName] = useState('');
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  function toggleSubgroupCollapsed(groupId: string, subgroupKey: string) {
    const key = `${groupId}:${subgroupKey}`;
    setExpandedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function loadGroups() {
    setLoading(true);
    api.groups
      .list()
      .then(setGroups)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load groups'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (expandedId) {
      setSelectedMemberIds(new Set());
      setLastClickedMemberIndex(null);
      api.groups
        .get(expandedId)
        .then((g) => setExpandedGroup({ id: g.id, name: g.name, members: g.members }))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load group');
          setExpandedId(null);
        });
    } else {
      setExpandedGroup(null);
    }
  }, [expandedId]);

  useEffect(() => {
    if (addPersonGroupId && !addToSubgroup.trim()) {
      api.people
        .list({ q: personSearch || undefined })
        .then(setPeople)
        .catch(() => setError('Failed to load people'));
    }
  }, [addPersonGroupId, personSearch, addToSubgroup]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;
    try {
      await api.groups.create({ name: newName.trim() });
      setNewName('');
      setAdding(false);
      loadGroups();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  function roleFromPersonType(type: string): string {
    if (type === 'musician' || type === 'superstar') return 'band';
    if (type === 'tour_manager') return 'tour manager';
    if (type === 'productionmanager') return 'production manager';
    if (type === 'driver') return 'driver';
    return 'crew';
  }

  async function handleAddMember(groupId: string, person: Person) {
    setError('');
    try {
      await api.groups.addMember(groupId, {
        personId: person.id,
        role: roleFromPersonType(person.type),
        subgroup: addToSubgroup.trim() || undefined,
      });
      setAddPersonGroupId(null);
      setAddToSubgroup('');
      setPersonSearch('');
      setSelectedPersonIds(new Set());
      if (expandedId === groupId) {
        api.groups.get(groupId).then((g) =>
          setExpandedGroup({ id: g.id, name: g.name, members: g.members })
        );
      }
      loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  function togglePersonSelection(personId: string) {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function handleMemberClick(personId: string, e: React.MouseEvent) {
    if (!expandedGroup) return;
    e.preventDefault();
    const order = expandedGroup.members.map((m) => m.personId);
    const idx = order.indexOf(personId);
    if (idx < 0) return;
    if (e.shiftKey && lastClickedMemberIndex !== null) {
      const lo = Math.min(lastClickedMemberIndex, idx);
      const hi = Math.max(lastClickedMemberIndex, idx);
      setSelectedMemberIds(new Set(order.slice(lo, hi + 1)));
    } else {
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        if (next.has(personId)) next.delete(personId);
        else next.add(personId);
        return next;
      });
      setLastClickedMemberIndex(idx);
    }
  }

  function selectAllMembers() {
    if (!expandedGroup) return;
    setSelectedMemberIds(new Set(expandedGroup.members.map((m) => m.personId)));
  }

  function clearMemberSelection() {
    setSelectedMemberIds(new Set());
  }

  function selectAllAvailable() {
    setSelectedPersonIds(new Set(availablePeople.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedPersonIds(new Set());
  }

  async function handleAddSelectedMembers(groupId: string) {
    const toAdd = availablePeople.filter((p) => selectedPersonIds.has(p.id));
    if (toAdd.length === 0) return;
    setError('');
    try {
      const subgroupVal = addToSubgroup.trim() || undefined;
      if (subgroupVal) {
        for (const person of toAdd) {
          await api.groups.updateMember(groupId, person.id, { subgroup: subgroupVal });
        }
      } else {
      for (const person of toAdd) {
        await api.groups.addMember(groupId, {
          personId: person.id,
          role: roleFromPersonType(person.type),
            subgroup: undefined,
        });
        }
      }
      setSelectedPersonIds(new Set());
      setAddToSubgroup('');
      setAddPersonGroupId(null);
      if (expandedId === groupId) {
        api.groups.get(groupId).then((g) =>
          setExpandedGroup({ id: g.id, name: g.name, members: g.members })
        );
      }
      loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  const handleUpdateMemberSubgroup = useCallback(
    async (groupId: string, personId: string, subgroup: string | null) => {
      setError('');
      try {
        await api.groups.updateMember(groupId, personId, { subgroup });
        setDragOverSubgroup(null);
        if (expandedId === groupId && expandedGroup) {
          const updated = expandedGroup.members.map((m) =>
            m.personId === personId ? { ...m, subgroup } : m
          );
          setExpandedGroup({ ...expandedGroup, members: updated });
        }
        loadGroups();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed');
      }
    },
    [expandedId, expandedGroup]
  );

  async function handleAssignMultipleToSubgroup(groupId: string, personIds: string[], subgroup: string | null) {
    setError('');
    try {
      for (const personId of personIds) {
        await api.groups.updateMember(groupId, personId, { subgroup });
      }
      setDragOverSubgroup(null);
      if (expandedId === groupId) {
        const g = await api.groups.get(groupId);
        setExpandedGroup({ id: g.id, name: g.name, members: g.members });
      }
      loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  function handleDragStart(e: React.DragEvent, member: GroupMember) {
    const personIds = selectedMemberIds.has(member.personId) && selectedMemberIds.size > 0
      ? Array.from(selectedMemberIds)
      : [member.personId];
    const data = JSON.stringify({ personIds });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.setData('text/plain', data);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
  }

  function getDragPersonIds(e: React.DragEvent): string[] {
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as { personId?: string; personIds?: string[] };
      if (Array.isArray(parsed.personIds)) return parsed.personIds;
      if (parsed.personId) return [parsed.personId];
      return [];
    } catch {
      return [];
    }
  }

  async function handleDrop(e: React.DragEvent, groupId: string, targetSubgroup: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubgroup(null);
    const personIds = getDragPersonIds(e);
    if (personIds.length === 0) return;
    setSelectedMemberIds(new Set());
    for (const personId of personIds) {
      await handleUpdateMemberSubgroup(groupId, personId, targetSubgroup);
    }
  }

  function handleDragOver(e: React.DragEvent, subgroupKey: string | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSubgroup(subgroupKey);
  }

  function handleDragLeave() {
    setDragOverSubgroup(null);
  }

  function handleDragEnd() {
    setDragOverSubgroup(null);
  }

  const expandedMembers = expandedGroup?.members ?? [];
  const memberPersonIds = new Set(expandedMembers.map((m) => m.personId));
  const targetSubgroup = addToSubgroup.trim() || null;
  const searchLower = personSearch.trim().toLowerCase();
  const availablePeople: { id: string; name: string; type: string }[] =
    addPersonGroupId && targetSubgroup
      ? expandedMembers
          .filter((m) => (m.subgroup?.trim() || null) !== targetSubgroup)
          .filter((m) => !searchLower || m.name.toLowerCase().includes(searchLower))
          .map((m) => ({ id: m.personId, name: m.name, type: m.role }))
      : people.filter((p) => !memberPersonIds.has(p.id)).map((p) => ({ id: p.id, name: p.name, type: p.type }));

  if (loading && groups.length === 0) {
    return (
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-8 text-center text-stage-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-stage-muted mb-3">
        Create groups and add people to them. You can then add whole groups to tours and dates at once.
      </p>
      {error && (
        <div className="rounded-xl bg-red-400/10 border border-red-400/30 p-4 flex items-center justify-between gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => { setError(''); loadGroups(); }}
            className="text-sm text-stage-accent hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
        {groups.length === 0 && !adding && (
          <div className="p-8 text-center text-stage-muted text-sm">
            No groups yet.
            {allowEdit && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="block mt-2 text-stage-accent hover:underline"
              >
                Create your first group
              </button>
            )}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id} className="border-b border-stage-border last:border-b-0">
            <div
              className={`flex items-center justify-between p-4 ${expandedId === g.id ? 'bg-white/5' : ''} hover:bg-white/5 cursor-pointer transition`}
              onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setExpandedId(expandedId === g.id ? null : g.id)}
            >
              <div className="flex items-center gap-3">
                {expandedId === g.id ? (
                  <ChevronDown className="h-4 w-4 text-stage-muted shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stage-muted shrink-0" />
                )}
                <div className="p-2 rounded-lg bg-stage-accent/20">
                  <Users className="h-4 w-4 text-stage-accent" />
                </div>
                <div>
                  <p className="font-medium text-white">{g.name}</p>
                  <p className="text-xs text-stage-muted">
                    {g.memberCount} {g.memberCount === 1 ? 'person' : 'people'}
                  </p>
                </div>
              </div>
            </div>
            {expandedId === g.id && expandedGroup?.id === g.id && (
              <div className="px-4 pb-4 pt-0 border-t border-stage-border">
                {allowEdit && addPersonGroupId === g.id && (
                  <div className="mt-3 mb-3 rounded-lg border border-stage-border bg-stage-surface/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                      {addToSubgroup.trim() ? `Assign to ${addToSubgroup.trim()}` : 'Add person to group'}
                    </p>
                    <input
                      type="text"
                      value={addToSubgroup}
                      onChange={(e) => setAddToSubgroup(e.target.value)}
                      placeholder="Subgroup (e.g. Crew, Band) – optional"
                      className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 text-sm"
                    />
                        <input
                          type="text"
                          value={personSearch}
                          onChange={(e) => setPersonSearch(e.target.value)}
                      placeholder={addToSubgroup.trim() ? 'Search group members...' : 'Search people...'}
                      className="w-full px-3 py-2 rounded-lg bg-stage-card border border-stage-border text-white placeholder-zinc-500 text-sm"
                        />
                    <div className="max-h-64 overflow-y-auto rounded border border-stage-border divide-y divide-stage-border">
                          {availablePeople.length === 0 ? (
                            <div className="p-3 text-center text-stage-muted text-sm">
                          {addToSubgroup.trim() ? 'No group members to assign' : 'No people to add'}
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2 p-2 border-b border-stage-border">
                                <button
                                  type="button"
                                  onClick={selectAllAvailable}
                                  className="text-xs text-stage-muted hover:text-stage-fg"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={clearSelection}
                                  className="text-xs text-stage-muted hover:text-stage-fg"
                                >
                                  Clear
                                </button>
                              </div>
                              {availablePeople.map((p) => (
                                <label
                                  key={p.id}
                                  className="w-full flex items-center gap-2 p-2 cursor-pointer hover:bg-stage-card has-[:checked]:bg-stage-accent/10"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPersonIds.has(p.id)}
                                    onChange={() => togglePersonSelection(p.id)}
                                    className="rounded border-stage-border w-4 h-4 shrink-0 accent-stage-accent"
                                  />
                                  <Users className="h-4 w-4 text-stage-muted shrink-0" />
                                  <span className="font-medium text-white">{p.name}</span>
                                  <span className="text-xs text-stage-muted capitalize">{p.type.replace('_', ' ')}</span>
                                </label>
                              ))}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleAddSelectedMembers(g.id)}
                            disabled={selectedPersonIds.size === 0}
                            className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                        {addToSubgroup.trim() ? 'Assign' : 'Add'}
                        {selectedPersonIds.size > 0 ? ` ${selectedPersonIds.size} ` : ' '}selected
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddPersonGroupId(null);
                          setAddToSubgroup('');
                              setPersonSearch('');
                              setSelectedPersonIds(new Set());
                            }}
                            className="text-sm text-stage-muted hover:text-stage-fg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                )}
                {(() => {
                  const bySubgroup = new Map<string | null, GroupMember[]>();
                  for (const m of expandedGroup.members) {
                    const key = m.subgroup?.trim() || null;
                    if (!bySubgroup.has(key)) bySubgroup.set(key, []);
                    bySubgroup.get(key)!.push(m);
                  }
                  const subgroupOrder = Array.from(bySubgroup.keys()).sort((a, b) => {
                    if (!a) return 1;
                    if (!b) return -1;
                    return a.localeCompare(b);
                  });
                  const hasSubgroups = subgroupOrder.some((k) => k !== null);
                  const SUBGROUP_KEY = '__subgroup_key__';

                  if (!hasSubgroups) {
                    return (
                      <>
                        {/* Subgroups first – even when empty */}
                        <div className="mt-3 rounded-lg border border-stage-border bg-stage-surface/30 overflow-hidden">
                          <div className="px-3 py-2 border-b border-stage-border bg-stage-card/50">
                            <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                              Subgroups
                            </p>
                          </div>
                          <div className="p-3">
                            {allowEdit && (
                              createSubgroupGroupId === g.id ? (
                              <div className="rounded-lg border-2 border-dashed border-stage-border p-3 flex flex-wrap gap-2">
                                <input
                                  type="text"
                                  value={createSubgroupName}
                                  onChange={(e) => setCreateSubgroupName(e.target.value)}
                                  placeholder="Subgroup name (e.g. Band, Crew)"
                                  className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const name = createSubgroupName.trim();
                                      if (name) {
                                        setAddToSubgroup(name);
                                        setAddPersonGroupId(g.id);
                                        setSelectedPersonIds(new Set());
                                      }
                                      setCreateSubgroupGroupId(null);
                                      setCreateSubgroupName('');
                                    }
                                    if (e.key === 'Escape') {
                                      setCreateSubgroupGroupId(null);
                                      setCreateSubgroupName('');
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const name = createSubgroupName.trim();
                                    if (name) {
                                      setAddToSubgroup(name);
                                      setAddPersonGroupId(g.id);
                                      setSelectedPersonIds(new Set());
                                    }
                                    setCreateSubgroupGroupId(null);
                                    setCreateSubgroupName('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium"
                                >
                                  Create
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setCreateSubgroupGroupId(null); setCreateSubgroupName(''); }}
                                  className="text-sm text-stage-muted hover:text-stage-fg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : newSubgroupFor?.groupId === g.id ? (
                              <div className="p-3 rounded-lg border-2 border-dashed border-stage-border flex gap-2">
                                <input
                                  type="text"
                                  value={newSubgroupName}
                                  onChange={(e) => setNewSubgroupName(e.target.value)}
                                  placeholder="Subgroup name (e.g. Band, Crew)"
                                  className="flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                                  autoFocus
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const name = newSubgroupName.trim();
                                      if (name && newSubgroupFor) {
                                        await handleAssignMultipleToSubgroup(g.id, newSubgroupFor.personIds, name);
                                      }
                                      setNewSubgroupFor(null);
                                      setNewSubgroupName('');
                                    }
                                    if (e.key === 'Escape') {
                                      setNewSubgroupFor(null);
                                      setNewSubgroupName('');
                                    }
                                  }}
                                  onBlur={() => {
                                    setNewSubgroupFor(null);
                                    setNewSubgroupName('');
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => { setNewSubgroupFor(null); setNewSubgroupName(''); }}
                                  className="text-sm text-stage-muted hover:text-stage-fg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div
                                className={`rounded-lg border-2 border-dashed p-3 min-h-[50px] flex items-center justify-center gap-3 flex-wrap transition-colors ${
                                  dragOverSubgroup === SUBGROUP_KEY ? 'border-stage-accent bg-stage-accent/10' : 'border-stage-border'
                                }`}
                                onDragOver={allowEdit ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSubgroup(SUBGROUP_KEY); } : undefined}
                                onDragLeave={handleDragLeave}
                                onDrop={allowEdit ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const personIds = getDragPersonIds(e);
                                  if (personIds.length > 0) {
                                    setNewSubgroupFor({ groupId: g.id, personIds });
                                    setNewSubgroupName('');
                                    setSelectedMemberIds(new Set());
                                  }
                                  setDragOverSubgroup(null);
                                } : undefined}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setCreateSubgroupGroupId(g.id); setCreateSubgroupName(''); }}
                                  className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium"
                                >
                                  Create
                                </button>
                                <span className="text-stage-muted">or</span>
                                <p className="text-sm text-stage-muted">Drop here to create subgroup</p>
                              </div>
                            )
                          )}
                          </div>
                        </div>

                        {/* Members below */}
                        <div className="mt-3 rounded-lg border border-stage-border bg-stage-surface/30 overflow-hidden">
                          <div className="px-3 py-2 border-b border-stage-border bg-stage-card/50 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                              Members
                            </p>
                            {allowEdit && expandedGroup.members.length > 0 && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={selectAllMembers}
                                  className="text-xs text-stage-muted hover:text-stage-fg"
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  onClick={clearMemberSelection}
                                  className="text-xs text-stage-muted hover:text-stage-fg"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>
                          <ul className="p-3 space-y-2">
                            {expandedGroup.members.map((m) => (
                              <li
                                key={m.id}
                                draggable={allowEdit}
                                onDragStart={allowEdit ? (e) => handleDragStart(e, m) : undefined}
                                onDragEnd={handleDragEnd}
                                onClick={allowEdit ? (e) => handleMemberClick(m.personId, e) : undefined}
                                className={`py-2 flex items-center gap-2 rounded cursor-grab active:cursor-grabbing ${
                                  allowEdit ? 'hover:bg-stage-surface/50 cursor-pointer' : ''
                                } ${selectedMemberIds.has(m.personId) ? 'bg-stage-accent/10' : ''}`}
                              >
                                {allowEdit && (
                                  <span className="flex items-center shrink-0 pointer-events-none">
                                    <input
                                      type="checkbox"
                                      checked={selectedMemberIds.has(m.personId)}
                                      readOnly
                                      tabIndex={-1}
                                      className="rounded border-stage-border w-4 h-4 accent-stage-accent"
                                    />
                                  </span>
                                )}
                                {allowEdit && (
                                  <GripVertical className="h-4 w-4 text-stage-muted shrink-0" aria-hidden />
                                )}
                                <div>
                                  <p className="font-medium text-white">{m.name}</p>
                                  <p className="text-xs text-stage-muted capitalize">{m.role}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    );
                  }

                  const namedSubgroups = subgroupOrder.filter((k) => k !== null);
                  const unassignedMembers = bySubgroup.get(null) ?? [];

                  return (
                    <>
                      {/* Subgroups first – above Members */}
                      <div className="mt-3 rounded-lg border border-stage-border bg-stage-surface/30 overflow-hidden">
                        <div className="px-3 py-2 border-b border-stage-border bg-stage-card/50 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                            Subgroups
                          </p>
                          {allowEdit && expandedGroup.members.length > 0 && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={selectAllMembers}
                                className="text-xs text-stage-muted hover:text-stage-fg"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={clearMemberSelection}
                                className="text-xs text-stage-muted hover:text-stage-fg"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                        <ul className="divide-y divide-stage-border p-3 space-y-3">
                      {namedSubgroups.map((subgroupKey) => {
                        const groupMembers = bySubgroup.get(subgroupKey)!;
                        const isDropTarget = allowEdit && dragOverSubgroup === subgroupKey;
                        const canAssign = expandedGroup.members.some((m) => (m.subgroup?.trim() || null) !== subgroupKey);
                        const subgroupCollapseKey = `${g.id}:${subgroupKey}`;
                        const isCollapsed = !expandedSubgroups.has(subgroupCollapseKey);
                        return (
                          <li key={subgroupKey}>
                            <div
                              className={`rounded-lg border-2 border-dashed p-3 min-h-[60px] transition-colors ${
                                isDropTarget ? 'border-stage-accent bg-stage-accent/10' : 'border-stage-border'
                              }`}
                              onDragOver={allowEdit ? (e) => handleDragOver(e, subgroupKey) : undefined}
                              onDragLeave={handleDragLeave}
                              onDrop={allowEdit ? (e) => handleDrop(e, g.id, subgroupKey) : undefined}
                            >
                              <div
                                className="flex items-center justify-between gap-2 mb-2 cursor-pointer select-none"
                                onClick={() => toggleSubgroupCollapsed(g.id, subgroupKey)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && toggleSubgroupCollapsed(g.id, subgroupKey)}
                              >
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-stage-muted shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-stage-muted shrink-0" />
                                  )}
                                  <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                                    {subgroupKey}
                                  </p>
                                  <span className="text-xs text-stage-muted">
                                    ({groupMembers.length})
                                  </span>
                                </div>
                                {allowEdit && canAssign && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (selectedMemberIds.size > 0) {
                                        const toAssign = expandedGroup.members.filter((m) => selectedMemberIds.has(m.personId) && (m.subgroup?.trim() || null) !== subgroupKey);
                                        for (const m of toAssign) {
                                          await handleUpdateMemberSubgroup(g.id, m.personId, subgroupKey);
                                        }
                                        setSelectedMemberIds(new Set());
                                      } else {
                                        setAddToSubgroup(subgroupKey);
                                        setAddPersonGroupId(g.id);
                                        setSelectedPersonIds(new Set());
                                      }
                                    }}
                                    className="text-xs text-stage-accent hover:underline"
                                  >
                                    {selectedMemberIds.size > 0 ? `Assign ${selectedMemberIds.size} selected` : 'Assign'}
                                  </button>
                                )}
                              </div>
                              {!isCollapsed && (
                              <ul className="space-y-2">
                                {groupMembers.map((m) => (
                                  <li
                                    key={m.id}
                                    draggable={allowEdit}
                                    onDragStart={allowEdit ? (e) => handleDragStart(e, m) : undefined}
                                    onDragEnd={handleDragEnd}
                                    onClick={allowEdit ? (e) => handleMemberClick(m.personId, e) : undefined}
                                    className={`py-2 flex items-center gap-2 pl-2 border-l-2 border-stage-border rounded cursor-grab active:cursor-grabbing ${
                                      allowEdit ? 'hover:bg-stage-surface/50 cursor-pointer' : ''
                                    } ${selectedMemberIds.has(m.personId) ? 'bg-stage-accent/10' : ''}`}
                                  >
                                    {allowEdit && (
                                      <span className="flex items-center shrink-0 pointer-events-none">
                                        <input
                                          type="checkbox"
                                          checked={selectedMemberIds.has(m.personId)}
                                          readOnly
                                          tabIndex={-1}
                                          className="rounded border-stage-border w-4 h-4 accent-stage-accent"
                                        />
                                      </span>
                                    )}
                                    {allowEdit && (
                                      <GripVertical className="h-4 w-4 text-stage-muted shrink-0" aria-hidden />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-white">{m.name}</p>
                                      <p className="text-xs text-stage-muted capitalize">
                                        {m.role}
                                      </p>
                                    </div>
                                    {allowEdit && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateMemberSubgroup(g.id, m.personId, null); }}
                                        className="p-1.5 rounded text-stage-muted hover:text-stage-fg hover:bg-stage-surface shrink-0"
                                        title="Move to Members"
                                        aria-label={`Move ${m.name} to Members`}
                                      >
                                        <UserMinus className="h-4 w-4" />
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              )}
                            </div>
                          </li>
                        );
                      })}
                      {allowEdit && (
                        <li>
                          {createSubgroupGroupId === g.id ? (
                            <div className="rounded-lg border-2 border-dashed border-stage-border p-3 flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={createSubgroupName}
                                onChange={(e) => setCreateSubgroupName(e.target.value)}
                                placeholder="Subgroup name (e.g. Band, Crew)"
                                className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const name = createSubgroupName.trim();
                                    if (name) {
                                      setAddToSubgroup(name);
                                      setAddPersonGroupId(g.id);
                                      setSelectedPersonIds(new Set());
                                    }
                                    setCreateSubgroupGroupId(null);
                                    setCreateSubgroupName('');
                                  }
                                  if (e.key === 'Escape') {
                                    setCreateSubgroupGroupId(null);
                                    setCreateSubgroupName('');
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const name = createSubgroupName.trim();
                                  if (name) {
                                    setAddToSubgroup(name);
                                    setAddPersonGroupId(g.id);
                                    setSelectedPersonIds(new Set());
                                  }
                                  setCreateSubgroupGroupId(null);
                                  setCreateSubgroupName('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium"
                              >
                                Create
                              </button>
                              <button
                                type="button"
                                onClick={() => { setCreateSubgroupGroupId(null); setCreateSubgroupName(''); }}
                                className="text-sm text-stage-muted hover:text-stage-fg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : newSubgroupFor?.groupId === g.id ? (
                            <div className="p-3 rounded-lg border-2 border-dashed border-stage-border flex gap-2">
                              <input
                                type="text"
                                value={newSubgroupName}
                                onChange={(e) => setNewSubgroupName(e.target.value)}
                                placeholder="Subgroup name (e.g. Band, Crew)"
                                className="flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500 text-sm"
                                autoFocus
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const name = newSubgroupName.trim();
                                    if (name && newSubgroupFor) {
                                      await handleAssignMultipleToSubgroup(g.id, newSubgroupFor.personIds, name);
                                    }
                                    setNewSubgroupFor(null);
                                    setNewSubgroupName('');
                                  }
                                  if (e.key === 'Escape') {
                                    setNewSubgroupFor(null);
                                    setNewSubgroupName('');
                                  }
                                }}
                                onBlur={() => {
                                  setNewSubgroupFor(null);
                                  setNewSubgroupName('');
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => { setNewSubgroupFor(null); setNewSubgroupName(''); }}
                                className="text-sm text-stage-muted hover:text-stage-fg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`rounded-lg border-2 border-dashed p-3 min-h-[50px] flex items-center justify-center gap-3 flex-wrap transition-colors ${
                                dragOverSubgroup === SUBGROUP_KEY ? 'border-stage-accent bg-stage-accent/10' : 'border-stage-border'
                              }`}
                              onDragOver={allowEdit ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSubgroup(SUBGROUP_KEY); } : undefined}
                              onDragLeave={handleDragLeave}
                              onDrop={allowEdit ? (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const personIds = getDragPersonIds(e);
                                if (personIds.length > 0) {
                                  setNewSubgroupFor({ groupId: g.id, personIds });
                                  setNewSubgroupName('');
                                  setSelectedMemberIds(new Set());
                                }
                                setDragOverSubgroup(null);
                              } : undefined}
                            >
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCreateSubgroupGroupId(g.id); setCreateSubgroupName(''); }}
                                className="px-3 py-1.5 rounded-lg bg-stage-accent text-stage-accentFg text-sm font-medium"
                              >
                                Create
                              </button>
                              <span className="text-stage-muted">or</span>
                              <p className="text-sm text-stage-muted">Drop here to create new subgroup</p>
                            </div>
                          )}
                        </li>
                      )}
                      </ul>
                    </div>

                      {/* Members (Unassigned) – below Subgroups */}
                      <div className="mt-3 rounded-lg border border-stage-border bg-stage-surface/30 overflow-hidden">
                        <div className="px-3 py-2 border-b border-stage-border bg-stage-card/50 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-stage-muted uppercase tracking-wide">
                            Members
                          </p>
                          {allowEdit && expandedGroup.members.length > 0 && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={selectAllMembers}
                                className="text-xs text-stage-muted hover:text-stage-fg"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={clearMemberSelection}
                                className="text-xs text-stage-muted hover:text-stage-fg"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                        {unassignedMembers.length === 0 ? (
                          <p className="text-xs text-stage-muted italic">All members are in subgroups</p>
                        ) : (
                        <ul className="space-y-2">
                          {unassignedMembers.map((m) => (
                            <li
                              key={m.id}
                              draggable={allowEdit}
                              onDragStart={allowEdit ? (e) => handleDragStart(e, m) : undefined}
                              onDragEnd={handleDragEnd}
                              onClick={allowEdit ? (e) => handleMemberClick(m.personId, e) : undefined}
                              className={`py-2 flex items-center gap-2 rounded cursor-grab active:cursor-grabbing ${
                                allowEdit ? 'hover:bg-stage-surface/50 cursor-pointer' : ''
                              } ${selectedMemberIds.has(m.personId) ? 'bg-stage-accent/10' : ''}`}
                            >
                              {allowEdit && (
                                <span className="flex items-center shrink-0 pointer-events-none">
                                  <input
                                    type="checkbox"
                                    checked={selectedMemberIds.has(m.personId)}
                                    readOnly
                                    tabIndex={-1}
                                    className="rounded border-stage-border w-4 h-4 accent-stage-accent"
                                  />
                                </span>
                              )}
                              {allowEdit && (
                                <GripVertical className="h-4 w-4 text-stage-muted shrink-0" aria-hidden />
                              )}
                              <div>
                                <p className="font-medium text-white">{m.name}</p>
                                <p className="text-xs text-stage-muted capitalize">{m.role}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        )}
                        </div>
                      </div>
                    </>
                  );
                })()}
                {allowEdit && addPersonGroupId !== g.id && (
                  <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAddPersonGroupId(g.id);
                        setAddToSubgroup('');
                          setSelectedPersonIds(new Set());
                        }}
                        className="flex items-center gap-2 text-sm text-stage-accent hover:underline"
                      >
                        <Plus className="h-4 w-4" /> Add person to group
                      </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {adding && (
          <form onSubmit={handleCreate} className="p-4 border-t border-stage-border flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name, e.g. Astrid S 2025"
              className="flex-1 px-3 py-2 rounded-lg bg-stage-surface border border-stage-border text-white placeholder-zinc-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName('');
                setError('');
              }}
              className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted"
            >
              Cancel
            </button>
          </form>
        )}
        {allowEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full p-3 flex items-center justify-center gap-2 text-stage-muted hover:text-stage-accent border-t border-stage-border"
          >
            <Plus className="h-4 w-4" /> Add group
          </button>
        )}
      </div>
    </div>
  );
}
