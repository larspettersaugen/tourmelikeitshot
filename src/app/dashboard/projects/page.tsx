import Link from 'next/link';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { ChevronRight, Plus } from 'lucide-react';
import { canEdit } from '@/lib/session';
import { hasFullTourCatalogAccess, getViewerAssignedTourIds } from '@/lib/viewer-access';

export default async function ProjectsPage() {
  const session = await getCachedSession();
  const role = (session?.user as { role?: string })?.role;
  const allowEdit = canEdit(role);
  const fullCatalog = hasFullTourCatalogAccess(role);
  const viewerTourIds = fullCatalog ? null : session?.user?.id
    ? await getViewerAssignedTourIds(session.user.id)
    : [];

  const allProjects = await prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tours: true } },
      tours: { select: { id: true } },
      owner: { select: { id: true, name: true } },
    },
  });
  const projects = fullCatalog
    ? allProjects
    : allProjects.filter((p) => p.tours.some((t) => (viewerTourIds ?? []).includes(t.id)));

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">Projects</h1>
      <p className="text-stage-muted text-sm mb-6">
        Each project can have multiple tours.
      </p>
      {projects.length === 0 ? (
        <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-8 text-center text-stage-muted">
          <p>No projects yet.</p>
          {allowEdit && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 mt-4 text-stage-accent hover:underline"
            >
              <Plus className="h-4 w-4" /> Add your first project
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between p-5 rounded-lg bg-stage-card border border-stage-border hover:border-stage-neonCyan/40 transition"
                >
                  <div>
                    <p className="font-medium text-white">{project.name}</p>
                    <p className="text-sm text-stage-muted">
                      {project._count.tours > 0
                        ? `${project._count.tours} tour${project._count.tours === 1 ? '' : 's'}`
                        : 'No tours yet'}
                      {project.owner && ` · ${project.owner.name}`}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stage-muted" />
                </Link>
              </li>
            ))}
          </ul>
          {allowEdit && (
            <Link
              href="/dashboard/projects/new"
              className="flex items-center justify-center gap-2 mt-6 py-3 rounded-xl border border-dashed border-stage-border text-stage-muted hover:border-stage-neonCyan/40 hover:text-stage-neonCyan"
            >
              <Plus className="h-4 w-4" /> New project
            </Link>
          )}
        </>
      )}
    </div>
  );
}
