'use client';

import { Wrench, UtensilsCrossed, Truck, Package, Upload, FileText, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
  const [files, setFiles] = useState<AdvanceFile[]>(initialFiles);
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
    setFiles(initialFiles);
  }, [initial, initialFiles]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();
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
      router.refresh();
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
    try {
      await api.dates.advance.update(tourId, dateId, updates);
      if (section === 'technical') {
        setTechnicalDone(updates.technicalDone ?? technicalDone);
        setTechnicalCompromises(updates.technicalCompromises ?? technicalCompromises);
      } else if (section === 'rider') {
        setRiderDone(updates.riderDone ?? riderDone);
        setRiderCompromises(updates.riderCompromises ?? riderCompromises);
      } else if (section === 'logistics') {
        setLogisticsDone(updates.logisticsDone ?? logisticsDone);
        setLogisticsCompromises(updates.logisticsCompromises ?? logisticsCompromises);
      } else {
        setEquipmentTransportDone(updates.equipmentTransportDone ?? equipmentTransportDone);
        setEquipmentTransportCompromises(updates.equipmentTransportCompromises ?? equipmentTransportCompromises);
      }
      router.refresh();
    } catch {
      setError('Failed to update');
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
      router.refresh();
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
                <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </h3>
                <p className="text-xs text-stage-muted mt-0.5">{description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={done}
                    onClick={() => allowChecklistToggle && handleCheckboxChange(sectionId, 'done', !done)}
                    onKeyDown={(e) => {
                      if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleCheckboxChange(sectionId, 'done', !done);
                      }
                    }}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      done ? 'bg-emerald-500/30 border-emerald-500/50' : 'border-stage-border bg-stage-dark'
                    } ${allowChecklistToggle ? 'cursor-pointer hover:border-stage-muted' : 'cursor-default'}`}
                  >
                    {done && <Check className="h-3 w-3 text-emerald-400" />}
                  </span>
                  <span className="text-xs text-stage-muted">Done</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={compromises}
                    onClick={() => allowChecklistToggle && handleCheckboxChange(sectionId, 'compromises', !compromises)}
                    onKeyDown={(e) => {
                      if (allowChecklistToggle && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleCheckboxChange(sectionId, 'compromises', !compromises);
                      }
                    }}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      compromises ? 'bg-amber-500/30 border-amber-500/50' : 'border-stage-border bg-stage-dark'
                    } ${allowChecklistToggle ? 'cursor-pointer hover:border-stage-muted' : 'cursor-default'}`}
                  >
                    {compromises && <Check className="h-3 w-3 text-amber-400" />}
                  </span>
                  <span className="text-xs text-stage-muted">Compromises</span>
                </label>
              </div>
            </div>
            <div className="rounded-lg bg-stage-dark/50 border border-stage-border/50 overflow-hidden">
              {allowEdit ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`Add ${label.toLowerCase()} info...`}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-stage-dark border-0 text-white placeholder-zinc-500 text-sm resize-y min-h-[100px] focus:ring-1 focus:ring-stage-accent"
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
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-stage-dark border border-stage-border text-sm text-stage-accent hover:underline"
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
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-stage-border text-stage-muted hover:text-white text-sm disabled:opacity-50"
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-stage-accent text-stage-dark font-medium disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
