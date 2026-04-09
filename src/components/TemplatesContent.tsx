'use client';

import { Trash2, FileStack, Plus, Calendar, Pencil, Copy } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CreateDaySheetTemplateForm } from './CreateDaySheetTemplateForm';

type Template = {
  id: string;
  name: string;
  items: { time: string; endTime?: string | null; durationMinutes?: number | null; label: string; notes: string | null; sortOrder: number; dayAfter?: boolean }[];
};

export function TemplatesContent({
  templates: initialTemplates,
  allowEdit,
}: {
  templates: Template[];
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleDuplicate(templateId: string) {
    setError('');
    setDuplicatingId(templateId);
    try {
      await api.scheduleTemplates.duplicate(templateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(templateId: string) {
    setError('');
    setDeletingId(templateId);
    try {
      await api.scheduleTemplates.delete(templateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Day sheets category */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-stage-neonCyan flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" /> Day sheets
        </h2>
        <p className="text-stage-muted text-sm mb-4">
          Schedule templates for concert days. Create here or save from any date&apos;s Schedule section.
        </p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {allowEdit && (
          <div className="mb-6">
            {showCreateForm && !editingId ? (
              <CreateDaySheetTemplateForm onCancel={() => setShowCreateForm(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-neonCyan hover:border-stage-neonCyan/40 transition"
              >
                <Plus className="h-4 w-4" /> Create day-sheet template
              </button>
            )}
          </div>
        )}

        {initialTemplates.length > 0 ? (
          <ul className="divide-y divide-stage-border rounded-2xl bg-stage-card/95 border border-stage-border/90 overflow-hidden ring-1 ring-white/[0.04]">
            {initialTemplates.map((tpl) => (
              <li key={tpl.id} className="p-4 flex items-center justify-between gap-4">
                {editingId === tpl.id ? (
                  <div className="flex-1">
                    <CreateDaySheetTemplateForm
                      template={tpl}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{tpl.name}</p>
                    </div>
                    {allowEdit && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(tpl.id)}
                          disabled={duplicatingId === tpl.id}
                          className="p-1.5 rounded-lg text-stage-muted hover:text-stage-neonCyan hover:bg-stage-accent/10 disabled:opacity-50"
                          title="Duplicate template"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(tpl.id)}
                          className="p-1.5 rounded-lg text-stage-muted hover:text-stage-neonCyan hover:bg-stage-accent/10"
                          title="Edit template"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id)}
                          disabled={deletingId === tpl.id}
                          className="p-1.5 rounded-lg text-stage-muted hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : !showCreateForm ? (
          <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-8 text-center text-stage-muted">
            <FileStack className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-white mb-1">No day-sheet templates yet</p>
            <p className="text-sm">
              {allowEdit
                ? 'Create one above, or go to a date and click &quot;Save to Day sheets&quot; in the Schedule section.'
                : 'Templates will appear here once created.'}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
