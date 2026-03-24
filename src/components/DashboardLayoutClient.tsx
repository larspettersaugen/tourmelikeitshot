'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, LogOut, Menu, Users, UserCircle, LayoutDashboard, FolderOpen, Contact, PanelLeftClose, PanelLeftOpen, FileStack, MapPin, Building2 } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTourDatesSidebar } from '@/contexts/TourDatesSidebarContext';

interface User { id?: string; email?: string | null; name?: string | null; image?: string | null; role?: string }
import { ThemeToggle } from '@/components/ThemeToggle';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Artists', icon: FolderOpen },
  { href: '/dashboard/tours', label: 'Tours', icon: MapPin },
  { href: '/dashboard/venues', label: 'Venues', icon: Building2 },
  { href: '/dashboard/people', label: 'People', icon: Users },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Contact },
  { href: '/dashboard/templates', label: 'Templates', icon: FileStack },
];

export function DashboardLayoutClient({ user, children }: { user: User; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  const role = (user as { role?: string }).role;
  const navItems = role === 'viewer'
    ? allNavItems.filter((n) =>
        n.href === '/dashboard' || n.href === '/dashboard/projects' || n.href === '/dashboard/tours'
      )
    : allNavItems;
  const isTourPage = /^\/dashboard\/tours\/[^/]+(\/|$)/.test(pathname);
  const tourDatesSidebar = useTourDatesSidebar();
  const rightSidebarCollapsed = tourDatesSidebar?.rightSidebarCollapsed ?? false;

  const sidebarContent = (
    <>
      <div className={`shrink-0 border-b border-stage-border flex items-center ${sidebarCollapsed ? 'p-3 justify-center' : 'p-4'}`}>
        <Link href="/dashboard" className={`flex items-center text-white font-semibold ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
          <Calendar className="h-6 w-6 shrink-0 text-stage-accent" />
          {!sidebarCollapsed && <span className="truncate">{"Tour Me Like It's Hot"}</span>}
        </Link>
      </div>
      <nav className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 ${sidebarCollapsed ? 'p-2 items-center' : 'p-3'}`}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={`flex items-center rounded-lg text-sm transition shrink-0 ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'gap-3 px-3 py-2.5'
              } ${
                isActive ? 'bg-stage-surface text-white' : 'text-stage-muted hover:text-stage-fg hover:bg-stage-surface/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={`shrink-0 border-t border-stage-border flex flex-col bg-stage-card ${sidebarCollapsed ? 'p-2 items-center gap-1' : 'p-3 space-y-1'}`}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center pb-1' : 'px-3 pb-2'}`}>
          <ThemeToggle />
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="px-3 py-2 text-xs text-stage-muted truncate">{user.email}</div>
            <div className="px-3 py-1 text-xs text-stage-muted capitalize">{role}</div>
          </>
        )}
        <Link
          href="/dashboard/profile"
          title={sidebarCollapsed ? 'My profile' : undefined}
          className={`flex items-center rounded-lg text-sm text-stage-muted hover:text-stage-fg hover:bg-stage-surface/50 ${
            sidebarCollapsed ? 'p-2 justify-center' : 'gap-3 px-3 py-2'
          }`}
        >
          <UserCircle className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>My profile</span>}
        </Link>
        <button
          onClick={handleSignOut}
          title={sidebarCollapsed ? 'Sign out' : undefined}
          className={`flex items-center rounded-lg text-sm text-red-400 hover:bg-red-400/10 ${sidebarCollapsed ? 'p-2 justify-center' : 'gap-3 w-full px-3 py-2 text-left'}`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full min-w-0 overflow-x-hidden isolate">
      {/* Sidebar - desktop only (lg+), fixed to viewport. Hidden below lg. */}
      <div
        className={`hidden lg:flex lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:z-30 lg:flex-col transition-[width] duration-200 shrink-0 ${
          sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'
        }`}
      >
        <aside className="flex flex-col h-full min-h-0 overflow-hidden border-r border-stage-border bg-stage-card w-full" aria-label="Main navigation">
          {sidebarContent}
        </aside>
        <button
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="absolute -right-4 bottom-8 z-10 h-10 w-10 flex items-center justify-center rounded-full border-2 border-stage-border bg-stage-card text-stage-muted hover:text-stage-accent hover:border-stage-accent hover:bg-stage-surface shadow-lg"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Main area - full width on mobile, offset by sidebar on desktop */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full transition-[margin] duration-200 ${
          sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'
        }`}
      >
        {/* Mobile header - visible below lg only. Never show with sidebar. */}
        <header className="flex lg:hidden shrink-0 flex-row items-center justify-between h-14 px-4 border-b border-stage-border bg-stage-surface min-h-[3.5rem]">
          <Link href="/dashboard" className="flex items-center gap-2 text-white font-semibold min-w-0">
            <Calendar className="h-6 w-6 shrink-0 text-stage-accent" />
            <span className="truncate">{"Tour Me Like It's Hot"}</span>
          </Link>
          <div className="relative flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-stage-card text-white"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1 py-2 w-48 rounded-lg bg-stage-card border border-stage-border shadow-xl z-50 text-white">
                  <div className="px-3 py-2 text-sm text-stage-muted border-b border-stage-border truncate">{user.email}</div>
                  {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-stage-surface"
                    >
                      <Icon className="h-4 w-4 shrink-0" /> {label}
                    </Link>
                  ))}
                  <div className="border-t border-stage-border my-1" />
                  <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-stage-surface">
                    <UserCircle className="h-4 w-4 shrink-0" /> My profile
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-stage-surface">
                    <LogOut className="h-4 w-4 shrink-0" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main
          className={`flex-1 min-h-0 overflow-auto bg-stage-surface text-white transition-[margin] duration-200 ${
            isTourPage ? (rightSidebarCollapsed ? 'lg:mr-[4.5rem]' : 'lg:mr-64') : ''
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
