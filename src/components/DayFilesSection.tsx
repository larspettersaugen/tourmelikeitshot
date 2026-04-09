'use client';

import { FileText, Upload, FolderOpen, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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

export function DayFilesSection({
  tourId,
  dateId,
  files: initialFiles,
  allowEdit,
  /** Extra labels for `advanceSection` keys (e.g. custom advance fields: `custom:&lt;id&gt;` → title). */
  sectionLabelExtra = {},
}: {
  tourId: string;
  dateId: string;
  files: AdvanceFile[];
  allowEdit: boolean;
  sectionLabelExtra?: Record<string, string>;
}) {
  const [files, setFiles] = useState<AdvanceFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  async function uploadFiles(fileList: File[]) {
    if (fileList.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of fileList) {
        await api.dates.advance.files.upload(tourId, dateId, file, undefined);
      }
      const list = await api.dates.advance.files.list(tourId, dateId);
      setFiles(list);
      router.refresh();
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const arr = Array.from(fileList);
    e.target.value = '';
    await uploadFiles(arr);
  }

  const [isDragging, setIsDragging] = useState(false);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (allowEdit && !uploading) setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    setError('');
    try {
      await api.dates.advance.files.delete(tourId, dateId, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      router.refresh();
    } catch {
      setError('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!allowEdit || uploading) return;
    const dropped = e.dataTransfer.files;
    if (!dropped?.length) return;
    await uploadFiles(Array.from(dropped));
  }

  const downloadUrl = (fileId: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/api/tours/${tourId}/dates/${dateId}/advance/files/${fileId}` : '#';

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-2">
        <FolderOpen className="h-4 w-4" /> Files
      </h3>
      <p className="text-xs text-stage-muted mb-2">All files for this date. Upload here or in the Advance tab.</p>
      <div
        className={`rounded-xl border p-4 transition-colors ${
          isDragging
            ? 'border-stage-accent bg-stage-accent/10 border-dashed'
            : 'bg-stage-card border-stage-border'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <p className="text-sm text-stage-muted">No files yet</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <a
                  href={downloadUrl(f.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-stage-accent hover:underline truncate min-w-0"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.filename}</span>
                  {f.sizeBytes != null && (
                    <span className="text-stage-muted text-xs shrink-0">{formatSize(f.sizeBytes)}</span>
                  )}
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  {f.advanceSection && (
                    <span className="text-xs text-stage-muted bg-stage-surface px-1.5 py-0.5 rounded">
                      {SECTION_LABELS[f.advanceSection] ??
                        sectionLabelExtra[f.advanceSection] ??
                        f.advanceSection}
                    </span>
                  )}
                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId !== null}
                      className="p-1 rounded text-stage-muted hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                      aria-label={`Delete ${f.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {allowEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-stage-border text-stage-muted hover:text-stage-fg text-sm disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            <span className="text-xs text-stage-muted">— or drag and drop</span>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
