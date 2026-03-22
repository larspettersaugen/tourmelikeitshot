'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Calendar, LogOut, Menu, Users, UserCircle, Contact } from 'lucide-react';
import { useState } from 'react';
import type { User } from 'next-auth';

export function DashboardNav({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const role = (user as { role?: string }).role;

  return (
    <header className="sticky top-0 z-50 shrink-0 w-full border-b border-stage-border bg-stage-dark text-white">
      <div className="flex flex-nowrap items-center justify-between h-14 px-4 max-w-6xl mx-auto w-full">
        <div className="flex flex-shrink-0 items-center gap-3 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-white font-semibold shrink-0">
            <Calendar className="h-6 w-6 shrink-0 text-stage-accent" />
            <span className="hidden sm:inline truncate">Tour It Like Its Hot</span>
          </Link>
          <Link
            href="/dashboard/people"
            className="flex items-center gap-2 text-stage-muted hover:text-stage-accent text-sm shrink-0"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">People</span>
          </Link>
          <Link
            href="/dashboard/contacts"
            className="flex items-center gap-2 text-stage-muted hover:text-stage-accent text-sm shrink-0"
          >
            <Contact className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Contacts</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-stage-muted text-sm hidden sm:inline capitalize">{role}</span>
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-stage-card text-white"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-1 py-2 w-48 rounded-lg bg-stage-card border border-stage-border shadow-xl z-50 text-white">
                  <div className="px-3 py-2 text-sm text-stage-muted border-b border-stage-border">
                    {user.email}
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-white hover:bg-stage-dark"
                  >
                    <UserCircle className="h-4 w-4" />
                    My profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-stage-dark"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
