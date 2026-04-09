'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Project error:', error);
  }, [error]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8">
      <Link
        href="/dashboard/projects"
        className="inline-flex gap-2 text-stage-muted hover:text-stage-fg mb-4"
      >
        ← Projects
      </Link>
      <div className="rounded-2xl bg-stage-card/95 border border-stage-border/90 ring-1 ring-white/[0.04] p-8 text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Could not load project</h2>
        <p className="text-stage-muted text-sm mb-6 max-w-md mx-auto">
          {error.message || 'Something went wrong. Try again or go back to Projects.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-stage-accent text-stage-accentFg font-medium hover:bg-stage-accentHover"
          >
            Try again
          </button>
          <Link
            href="/dashboard/projects"
            className="px-4 py-2 rounded-lg border border-stage-border text-stage-muted hover:text-stage-fg"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
