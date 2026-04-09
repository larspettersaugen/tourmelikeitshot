import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { FileStack } from 'lucide-react';
import { canEdit } from '@/lib/session';
import { TemplatesContent } from '@/components/TemplatesContent';

export default async function TemplatesPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: string }).role;
  if (role === 'viewer') redirect('/dashboard');

  const templates = await prisma.daySheetTemplate.findMany({
    include: { items: { orderBy: [{ dayAfter: 'asc' }, { time: 'asc' }] } },
    orderBy: { name: 'asc' },
  });

  const allowEdit = canEdit(role);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <FileStack className="h-6 w-6" /> Templates
      </h1>
      <p className="text-stage-muted text-sm mb-8">
        Create and manage templates for reuse across dates. More template categories coming later.
      </p>
      <TemplatesContent
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          items: t.items.map((i) => ({
            time: i.time,
            endTime: i.endTime,
            durationMinutes: i.durationMinutes,
            label: i.label,
            notes: i.notes,
            sortOrder: i.sortOrder,
            dayAfter: i.dayAfter,
          })),
        }))}
        allowEdit={allowEdit}
      />
    </div>
  );
}
