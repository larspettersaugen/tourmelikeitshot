import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { canEdit } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { NewDateForm } from './NewDateForm';

export default async function NewDatePage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const { tourId } = await params;
  const role = (session.user as { role?: string }).role;
  const allowVenueCreate = canEdit(role);

  const venues = await prisma.venue.findMany({
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, city: true, address: true },
  });

  return (
    <NewDateForm tourId={tourId} initialVenues={venues} allowVenueCreate={allowVenueCreate} />
  );
}
