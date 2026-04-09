'use client';

import {
  Wrench,
  UtensilsCrossed,
  Truck,
  Package,
  Upload,
  FileText,
  Check,
  ClipboardList,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type CustomAdvanceFieldRow = {
  id: string;
  title: string;
  body: string;
  done: boolean;
  compromises: boolean;
  sortOrder: number;
};

type AdvanceData = {
  technicalInfo: string | null;
  rider: string | null;
  logistics: string | null;
  equipmentTransport: string | null;
  technicalDone: boolean;
  technicalCompromises: boolean;
  riderDone: boolean;
  riderCompromises: boolean;
  logisticsDone: boolean;
  logisticsCompromises: boolean;
  equipmentTransportDone: boolean;
  equipmentTransportCompromises: boolean;
  customFields: CustomAdvanceFieldRow[];
};

type AdvanceFile = {
  id: string;
  filename: string;
  advanceSection: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

const SECTION_LABELS: Record<string, string> = {
  technical: 'Technical',
  rider: 'Rider',
  logistics: 'Logistics',
  equipmentTransport: 'Equipment transport',
};

function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdvanceContent({
  tourId,
  dateId,
  initial,
  files: initialFiles,
  allowEdit,
  allowChecklistToggle,
}: {
  tourId: string;
  dateId: string;
  initial: AdvanceData;
  files: AdvanceFile[];
  allowEdit: boolean;
  /** Power users: Done / Compromises only (full text + files still allowEdit). */
  allowChecklistToggle: boolean;
}) {
  const [technicalInfo, setTechnicalInfo] = useState(initial.technicalInfo ?? '');
  const [rider, setRider] = useState(initial.rider ?? '');
  const [logistics, setLogistics] = useState(initial.logistics ?? '');
  const [equipmentTransport, setEquipmentTransport] = useState(initial.equipmentTransport ?? '');
  const [technicalDone, setTechnicalDone] = useState(initial.technicalDone);
  const [technicalCompromises, setTechnicalCompromises] = useState(initial.technicalCompromises);
  const [riderDone, setRiderDone] = useState(initial.riderDone);
  const [riderCompromises, setRiderCompromises] = useState(initial.riderCompromises);
  const [logisticsDone, setLogisticsDone] = useState(initial.logisticsDone);
  const [logisticsCompromises, setLogisticsCompromises] = useState(initial.logisticsCompromises);
  const [equipmentTransportDone, setEquipmentTransportDone] = useState(initial.equipmentTransportDone);
  const [equipmentTransportCompromises, setEquipmentTransportCompromises] = useState(initial.equipmentTransportCompromises);
  const [customFields, setCustomFields] = useState<CustomAdvanceFieldRow[]>(initial.customFields ?? []);
  const [files, setFiles] = useState<AdvanceFile[]>(initialFiles);
  const customFileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const [deletingCustomId, setDeletingCustomId] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function softRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  /** Coalesce rapid Done/Compromises toggles so we don’t run a full RSC refresh on every click. */
  function scheduleSoftRefresh() {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      refreshDebounceRef.current = null;
      softRefresh();
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    setTechnicalInfo(initial.technicalInfo ?? '');
    setRider(initial.rider ?? '');
    setLogistics(initial.logistics ?? '');
    setEquipmentTransport(initial.equipmentTransport ?? '');
    setTechnicalDone(initial.technicalDone);
    setTechnicalCompromises(initial.technicalCompromises);
    setRiderDone(initial.riderDone);
    setRiderCompromises(initial.riderCompromises);
    setLogisticsDone(initial.logisticsDone);
    setLogisticsCompromises(initial.logisticsCompromises);
    setEquipmentTransportDone(initial.equipmentTransportDone);
    setEquipmentTransportCompromises(initial.equipmentTransportCompromises);
    setCustomFields(initial.customFields ?? []);
    setFiles(initialFiles);
  }, [initial, initialFiles]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    technical: useRef<HTMLInputElement>(null),
    rider: useRef<HTMLInputElement>(null),
    logistics: useRef<HTMLInputElement>(null),
    equipmentTransport: useRef<HTMLInputElement>(null),
  };

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      await api.dates.advance.update(tourId, dateId, {
        technicalInfo: technicalInfo.trim() || null,
        rider: rider.trim() || null,
        logistics: logistics.trim() || null,
        equipmentTransport: equipmentTransport.trim() || null,
        technicalDone,
        technicalCompromises,
        riderDone,
        riderCompromises,
        logisticsDone,
        logisticsCompromises,
        equipmentTransportDone,
        equipmentTransportCompromises,
      });
      for (const c of customFields) {
        await api.dates.advance.customFields.patch(tourId, dateId, c.id, {
          title: c.title.trim() || 'Custom',
          body: c.body.trim() || null,
        });
      }
      softRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckboxChange(
    section: 'technical' | 'rider' | 'logistics' | 'equipmentTransport',
    field: 'done' | 'compromises',
    value: boolean
  ) {
    const updates: Record<string, boolean> = {};
    if (section === 'technical') {
      updates.technicalDone = field === 'done' ? value : (value ? false : technicalDone);
      updates.technicalCompromises = field === 'compromises' ? value : (value ? false : technicalCompromises);
    } else if (section === 'rider') {
      updates.riderDone = field === 'done' ? value : (value ? false : riderDone);
      updates.riderCompromises = field === 'compromises' ? value : (value ? false : riderCompromises);
    } else if (section === 'logistics') {
      updates.logisticsDone = field === 'done' ? value : (value ? false : logisticsDone);
      updates.logisticsCompromises = field === 'compromises' ? value : (value ? false : logisticsCompromises);
    } else {
      updates.equipmentTransportDone = field === 'done' ? value : (value ? false : equipmentTransportDone);
      updates.equipmentTransportCompromises = field === 'compromises' ? value : (value ? false : equipmentTransportCompromises);
    }

    let revert: () => void;
    if (section === 'technical') {
      const td = technicalDone;
      const tc = technicalCompromises;
      revert = () => {
        setTechnicalDone(td);
        setTechnicalCompromises(tc);
      };
      setTechnicalDone(updates.technicalDone as boolean);
      setTechnicalCompromises(updates.technicalCompromises as boolean);
    } else if (section === 'rider') {
      const rd = riderDone;
      const rc = riderCompromises;
      revert = () => {
        setRiderDone(rd);
        setRiderCompromises(rc);
      };
      setRiderDone(updates.riderDone as boolean);
      setRiderCompromises(updates.riderCompromises as boolean);
    } else if (section === 'logistics') {
      const ld = logisticsDone;
      const lc = logisticsCompromises;
      revert = () => {
        setLogisticsDone(ld);
        setLogisticsCompromises(lc);
      };
      setLogisticsDone(updates.logisticsDone as boolean);
      setLogisticsCompromises(updates.logisticsCompromises as boolean);
    } else {
      const ed = equipmentTransportDone;
      const ec = equipmentTransportCompromises;
      revert = () => {
        setEquipmentTransportDone(ed);
        setEquipmentTransportCompromises(ec);
      };
      setEquipmentTransportDone(updates.equipmentTransportDone as boolean);
      setEquipmentTransportCompromises(updates.equipmentTransportCompromises as boolean);
    }

    try {
      await api.dates.advance.update(tourId, dateId, updates);
      scheduleSoftRefresh();
    } catch {
      revert();
      setError('Failed to update');
    }
  }

  async function handleCustomCheckboxChange(fieldId: string, field: 'done' | 'compromises', value: boolean) {
    const row = customFields.find((c) => c.id === fieldId);
    if (!row) return;
    let nextDone = row.done;
    let nextComp = row.compromises;
    if (field === 'done') {
      nextDone = value;
      if (value) nextComp = false;
    } else {
      nextComp = value;
      if (value) nextDone = false;
    }
    const snapshot = { done: row.done, compromises: row.compromises };
    setCustomFields((p) => p.map((c) => (c.id === fieldId ? { ...c, done: nextDone, compromises: nextComp } : c)));
    try {
      await api.dates.advance.customFields.patch(tourId, dateId, fieldId, { done: nextDone, compromises: nextComp });
      scheduleSoftRefresh();
    } catch {
      setCustomFields((p) =>
        p.map((c) => (c.id === fieldId ? { ...c, done: snapshot.done, compromises: snapshot.compromises } : c))
      );
      setError('Failed to update');
    }
  }

  async function handleAddCustomField() {
    setError('');
    setAddingCustom(true);
    try {
      const row = await api.dates.advance.customFields.create(tourId, dateId, {});
      setCustomFields((p) => [
        ...p,
        {
          id: row.id,
          title: row.title,
          body: row.body ?? '',
          done: row.done,
          compromises: row.compromises,
          sortOrder: row.sortOrder,
        },
      ]);
      scheduleSoftRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section');
    } finally {
      setAddingCustom(false);
    }
  }

  async function handleRemoveCustomField(fieldId: string) {
    setError('');
    setDeletingCustomId(fieldId);
    try {
      await api.dates.advance.customFields.delete(tourId, dateId, fieldId);
      setCustomFields((p) => p.filter((c) => c.id !== fieldId));
      const list = await api.dates.advance.files.list(tourId, dateId);
      setFiles(list);
      scheduleSoftRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove section');
    } finally {
      setDeletingCustomId(null);
    }
  }

  async function uploadFilesToSection(section: string, fileList: File[]) {
    if (fileList.length === 0) return;
    setUploading(section);
    setError('');
    try {
      for (const file of fileList) {
        await api.dates.advance.files.upload(tourId, dateId, file, section);
      }
      const list = await api.dates.advance.files.list(tourId, dateId);
      setFiles(list);
      softRefresh();
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(null);
    }
  }

  async function handleFileInputChange(section: string, e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const arr = Array.from(fileList);
    e.target.value = '';
    await uploadFilesToSection(section, arr);
  }

  const [draggingSection, setDraggingSection] = useState<string | null>(null);

  function createSectionDropHandlers(sectionId: string) {
    return {
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (allowEdit && !uploading) setDraggingSection(sectionId);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingSection(null);
      },
      onDrop: async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingSection(null);
        if (!allowEdit || uploading) return;
        const dropped = e.dataTransfer.files;
        if (!dropped?.length) return;
        await uploadFilesToSection(sectionId, Array.from(dropped));
      },
    };
  }

  const downloadUrl = (fileId: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/api/tours/${tourId}/dates/${dateId}/advance/files/${fileId}` : '#';

  const sections = [
    { id: 'technical' as const, sectionId: 'technical' as const, label: 'Technical', description: 'Stage specs, power, rigging, backline', value: technicalInfo, setValue: setTechnicalInfo, done: technicalDone, compromises: technicalCompromises, icon: Wrench },
    { id: 'rider' as const, sectionId: 'rider' as const, label: 'Rider', description: 'Catering, hospitality, dressing rooms', value: rider, setValue: setRider, done: riderDone, compromises: riderCompromises, icon: UtensilsCrossed },
    { id: 'logistics' as const, sectionId: 'logistics' as const, label: 'Logistics', description: 'Load-in, load-out, parking, access', value: logistics, setValue: setLogistics, done: logisticsDone, compromises: logisticsCompromises, icon: Truck },
    { id: 'equipment' as const, sectionId: 'equipmentTransport' as const, label: 'Equipment transport', description: 'Freight, trucking, gear movement', value: equipmentTransport, setValue: setEquipmentTransport, done: equipmentTransportDone, compromises: equipmentTransportCompromises, icon: Package },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ id, sectionId, label, description, value, setValue, done, compromises, icon: Icon }) => {
        const sectionFiles = files.filter((f) => f.advanceSection === sectionId);
        const areaColor = compromises ? 'border-amber-500/40 bg-amber-500/5' : done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5';
        return (
          <section
            key={id}
            className={`rounded-xl border p-4 transition-colors ${areaColor}`}
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </h3>
                <p className="text-xs text-stage-muted mt-0.5">{description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div
                  role="checkbox"
                  tabIndex={allowChecklistToggle ? 0 : -1}
                  aria-checked={done}
                  aria-disabled={!allowChecklistToggle}
                  aria-label={`${label}: done`}
                  onClick={() => allowChecklistToggle && handleCheckboxChange(sectionId, 'done', !done)}
                  onKeyDown={(e) => {
                    if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleCheckboxChange(sectionId, 'done', !done);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-md py-0.5 -my-0.5 -mx-0.5 px-0.5 outline-none transition-colors ${
                    allowChecklistToggle
                      ? 'cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-stage-accent/60'
                      : 'cursor-default opacity-70'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 shadow-sm transition-colors ${
                      done
                        ? 'bg-emerald-500/30 border-emerald-500/70'
                        : 'border-stage-fg/35 bg-stage-card ring-1 ring-stage-fg/10'
                    }`}
                    aria-hidden
                  >
                    {done && <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />}
                  </span>
                  <span className="text-xs font-medium text-stage-fg select-none">Done</span>
                </div>
                <div
                  role="checkbox"
                  tabIndex={allowChecklistToggle ? 0 : -1}
                  aria-checked={compromises}
                  aria-disabled={!allowChecklistToggle}
                  aria-label={`${label}: compromises`}
                  onClick={() => allowChecklistToggle && handleCheckboxChange(sectionId, 'compromises', !compromises)}
                  onKeyDown={(e) => {
                    if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleCheckboxChange(sectionId, 'compromises', !compromises);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-md py-0.5 -my-0.5 -mx-0.5 px-0.5 outline-none transition-colors ${
                    allowChecklistToggle
                      ? 'cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-stage-accent/60'
                      : 'cursor-default opacity-70'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 shadow-sm transition-colors ${
                      compromises
                        ? 'bg-amber-500/30 border-amber-500/70'
                        : 'border-stage-fg/35 bg-stage-card ring-1 ring-stage-fg/10'
                    }`}
                    aria-hidden
                  >
                    {compromises && <Check className="h-3.5 w-3.5 text-amber-400" strokeWidth={2.5} />}
                  </span>
                  <span className="text-xs font-medium text-stage-fg select-none">Compromises</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-stage-surface/50 border border-stage-border/50 overflow-hidden">
              {allowEdit ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`Add ${label.toLowerCase()} info...`}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border-0 text-white placeholder-zinc-500 text-sm resize-y min-h-[100px] focus:ring-1 focus:ring-stage-accent"
                />
              ) : (
                <div className="p-4">
                  {value ? (
                    <p className="text-sm text-white whitespace-pre-wrap">{value}</p>
                  ) : (
                    <p className="text-sm text-stage-muted">—</p>
                  )}
                </div>
              )}
            </div>
            <div
              className={`mt-2 p-3 rounded-lg border transition-colors ${
                draggingSection === sectionId
                  ? 'border-stage-accent border-dashed bg-stage-accent/10'
                  : 'border-transparent'
              }`}
              {...(allowEdit ? createSectionDropHandlers(sectionId) : {})}
            >
              {sectionFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-2">
                  {sectionFiles.map((f) => (
                    <li key={f.id}>
                      <a
                        href={downloadUrl(f.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-stage-surface border border-stage-border text-sm text-stage-accent hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> {f.filename}
                        {f.sizeBytes != null && (
                          <span className="text-stage-muted text-xs">{formatSize(f.sizeBytes)}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {allowEdit && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRefs[sectionId]}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileInputChange(sectionId, e)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs[sectionId].current?.click()}
                    disabled={!!uploading}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-stage-border text-stage-muted hover:text-stage-fg text-sm disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading === sectionId ? 'Uploading…' : 'Upload file'}
                  </button>
                  <span className="text-xs text-stage-muted">
                    {draggingSection === sectionId ? '— drop here' : '— or drag and drop'}
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {customFields.map((row) => {
        const sectionId = `custom:${row.id}`;
        const sectionFiles = files.filter((f) => f.advanceSection === sectionId);
        const areaColor = row.compromises
          ? 'border-amber-500/40 bg-amber-500/5'
          : row.done
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-red-500/30 bg-red-500/5';
        const displayTitle = row.title.trim() || 'Custom';
        return (
          <section key={row.id} className={`rounded-xl border p-4 transition-colors ${areaColor}`}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="min-w-0 flex-1">
                {allowEdit ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 shrink-0 text-stage-neonCyan" />
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) =>
                          setCustomFields((p) =>
                            p.map((c) => (c.id === row.id ? { ...c, title: e.target.value } : c))
                          )
                        }
                        placeholder="Section title"
                        className="w-full min-w-0 bg-stage-surface/80 border border-stage-border rounded-md px-2 py-1 text-sm text-white placeholder-zinc-500 focus:ring-1 focus:ring-stage-accent"
                      />
                    </div>
                    <p className="text-xs text-stage-muted mt-0.5 pl-6">Custom advance section</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> {displayTitle}
                    </h3>
                    <p className="text-xs text-stage-muted mt-0.5">Custom advance section</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                <div
                  role="checkbox"
                  tabIndex={allowChecklistToggle ? 0 : -1}
                  aria-checked={row.done}
                  aria-disabled={!allowChecklistToggle}
                  aria-label={`${displayTitle}: done`}
                  onClick={() => allowChecklistToggle && handleCustomCheckboxChange(row.id, 'done', !row.done)}
                  onKeyDown={(e) => {
                    if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleCustomCheckboxChange(row.id, 'done', !row.done);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-md py-0.5 -my-0.5 -mx-0.5 px-0.5 outline-none transition-colors ${
                    allowChecklistToggle
                      ? 'cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-stage-accent/60'
                      : 'cursor-default opacity-70'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 shadow-sm transition-colors ${
                      row.done
                        ? 'bg-emerald-500/30 border-emerald-500/70'
                        : 'border-stage-fg/35 bg-stage-card ring-1 ring-stage-fg/10'
                    }`}
                    aria-hidden
                  >
                    {row.done && <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />}
                  </span>
                  <span className="text-xs font-medium text-stage-fg select-none">Done</span>
                </div>
                <div
                  role="checkbox"
                  tabIndex={allowChecklistToggle ? 0 : -1}
                  aria-checked={row.compromises}
                  aria-disabled={!allowChecklistToggle}
                  aria-label={`${displayTitle}: compromises`}
                  onClick={() =>
                    allowChecklistToggle && handleCustomCheckboxChange(row.id, 'compromises', !row.compromises)
                  }
                  onKeyDown={(e) => {
                    if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleCustomCheckboxChange(row.id, 'compromises', !row.compromises);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-md py-0.5 -my-0.5 -mx-0.5 px-0.5 outline-none transition-colors ${
                    allowChecklistToggle
                      ? 'cursor-pointer hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-stage-accent/60'
                      : 'cursor-default opacity-70'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 shadow-sm transition-colors ${
                      row.compromises
                        ? 'bg-amber-500/30 border-amber-500/70'
                        : 'border-stage-fg/35 bg-stage-card ring-1 ring-stage-fg/10'
                    }`}
                    aria-hidden
                  >
                    {row.compromises && <Check className="h-3.5 w-3.5 text-amber-400" strokeWidth={2.5} />}
                  </span>
                  <span className="text-xs font-medium text-stage-fg select-none">Compromises</span>
                </div>
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomField(row.id)}
                    disabled={deletingCustomId !== null}
                    className="p-1.5 rounded-md text-stage-muted hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                    aria-label={`Remove section ${displayTitle}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-stage-surface/50 border border-stage-border/50 overflow-hidden">
              {allowEdit ? (
                <textarea
                  value={row.body}
                  onChange={(e) =>
                    setCustomFields((p) => p.map((c) => (c.id === row.id ? { ...c, body: e.target.value } : c)))
                  }
                  placeholder="Add notes for this section…"
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-stage-surface border-0 text-white placeholder-zinc-500 text-sm resize-y min-h-[100px] focus:ring-1 focus:ring-stage-accent"
                />
              ) : (
                <div className="p-4">
                  {row.body ? (
                    <p className="text-sm text-white whitespace-pre-wrap">{row.body}</p>
                  ) : (
                    <p className="text-sm text-stage-muted">—</p>
                  )}
                </div>
              )}
            </div>
            <div
              className={`mt-2 p-3 rounded-lg border transition-colors ${
                draggingSection === sectionId
                  ? 'border-stage-accent border-dashed bg-stage-accent/10'
                  : 'border-transparent'
              }`}
              {...(allowEdit ? createSectionDropHandlers(sectionId) : {})}
            >
              {sectionFiles.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-2">
                  {sectionFiles.map((f) => (
                    <li key={f.id}>
                      <a
                        href={downloadUrl(f.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-stage-surface border border-stage-border text-sm text-stage-accent hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> {f.filename}
                        {f.sizeBytes != null && (
                          <span className="text-stage-muted text-xs">{formatSize(f.sizeBytes)}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {allowEdit && (
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => {
                      const m = customFileInputRefs.current;
                      if (el) m.set(row.id, el);
                      else m.delete(row.id);
                    }}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileInputChange(sectionId, e)}
                  />
                  <button
                    type="button"
                    onClick={() => customFileInputRefs.current.get(row.id)?.click()}
                    disabled={!!uploading}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-stage-border text-stage-muted hover:text-stage-fg text-sm disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading === sectionId ? 'Uploading…' : 'Upload file'}
                  </button>
                  <span className="text-xs text-stage-muted">
                    {draggingSection === sectionId ? '— drop here' : '— or drag and drop'}
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {allowEdit && (
        <button
          type="button"
          onClick={handleAddCustomField}
          disabled={addingCustom}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg hover:border-stage-accent/40 text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {addingCustom ? 'Adding…' : 'Add section'}
        </button>
      )}

      {allowEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
