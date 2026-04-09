import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { VenuesContent } from '@/components/VenuesContent';
import { canEdit } from '@/lib/session';

export default async function VenuesPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  if ((session.user as { role?: string }).role === 'viewer') redirect('/dashboard');

  const venues = await prisma.venue.findMany({
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      category: true,
      name: true,
      city: true,
      address: true,
      capacity: true,
      notes: true,
      loadInNotes: true,
      cateringNotes: true,
      accessNotes: true,
    },
  });

  const allowEdit = canEdit((session.user as { role?: string }).role);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">Venues</h1>
      <VenuesContent initialVenues={venues} allowEdit={allowEdit} />
    </div>
  );
}
