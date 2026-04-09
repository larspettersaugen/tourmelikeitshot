import Link from 'next/link';
import { Calendar, ClipboardList, FileText, FolderOpen, ListTodo } from 'lucide-react';

export function DateNavTabs({
  tourId,
  dateId,
  active,
  allowAdvance = true,
  showTasks = true,
}: {
  tourId: string;
  dateId: string;
  active: 'day' | 'advance' | 'files' | 'tasks' | 'guest-list';
  allowAdvance?: boolean;
  /** When false (e.g. viewer), Tasks tab is hidden */
  showTasks?: boolean;
}) {
  const base = `/dashboard/tours/${tourId}/dates/${dateId}`;
  return (
    <nav className="flex flex-wrap gap-1.5 mb-6 print:hidden">
      <Link
        href={base}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          active === 'day'
            ? 'bg-stage-neonCyan/15 text-stage-neonCyan border border-stage-neonCyan/40 shadow-glow-cyan-sm'
            : 'text-stage-muted hover:text-stage-fg hover:bg-stage-card/80 border border-stage-border/90 hover:border-stage-neonCyan/25'
        }`}
      >
        <Calendar className="h-4 w-4" /> Day
      </Link>
      {allowAdvance && (
      <Link
        href={`${base}/advance`}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          active === 'advance'
            ? 'bg-stage-neonCyan/15 text-stage-neonCyan border border-stage-neonCyan/40 shadow-glow-cyan-sm'
            : 'text-stage-muted hover:text-stage-fg hover:bg-stage-card/80 border border-stage-border/90 hover:border-stage-neonCyan/25'
        }`}
      >
        <FileText className="h-4 w-4" /> Advance
      </Link>
      )}
      {showTasks && (
      <Link
        href={`${base}/tasks`}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          active === 'tasks'
            ? 'bg-stage-neonCyan/15 text-stage-neonCyan border border-stage-neonCyan/40 shadow-glow-cyan-sm'
            : 'text-stage-muted hover:text-stage-fg hover:bg-stage-card/80 border border-stage-border/90 hover:border-stage-neonCyan/25'
        }`}
      >
        <ListTodo className="h-4 w-4" /> Tasks
      </Link>
      )}
      <Link
        href={`${base}/files`}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          active === 'files'
            ? 'bg-stage-neonCyan/15 text-stage-neonCyan border border-stage-neonCyan/40 shadow-glow-cyan-sm'
            : 'text-stage-muted hover:text-stage-fg hover:bg-stage-card/80 border border-stage-border/90 hover:border-stage-neonCyan/25'
        }`}
      >
        <FolderOpen className="h-4 w-4" /> Files
      </Link>
      <Link
        href={`${base}/guest-list`}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          active === 'guest-list'
            ? 'bg-stage-neonCyan/15 text-stage-neonCyan border border-stage-neonCyan/40 shadow-glow-cyan-sm'
            : 'text-stage-muted hover:text-stage-fg hover:bg-stage-card/80 border border-stage-border/90 hover:border-stage-neonCyan/25'
        }`}
      >
        <ClipboardList className="h-4 w-4" /> Guest list
      </Link>
    </nav>
  );
}
