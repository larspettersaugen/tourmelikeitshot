import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient';
import { MobileDayNav } from '@/components/MobileDayNav';
import { TourDatesSidebarProvider } from '@/contexts/TourDatesSidebarContext';

/** getServerSession uses headers(); static prerender fails on Vercel (dynamic-server-error). */
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  return (
    <div className="min-h-screen flex flex-col bg-stage-surface w-full overflow-hidden">
      <div className="flex flex-1 min-h-0 w-full min-w-0 overflow-hidden">
        <TourDatesSidebarProvider>
          <DashboardLayoutClient user={session.user}>
            {children}
          </DashboardLayoutClient>
        </TourDatesSidebarProvider>
      </div>
      <MobileDayNav />
    </div>
  );
}
