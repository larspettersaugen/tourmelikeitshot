import { redirect, notFound } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { VenueProfileContent } from '@/components/VenueProfileContent';
import { canEditVenue } from '@/lib/session';

export default async function VenueProfilePage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');

  const { venueId } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      venueContacts: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, role: true, phone: true, email: true, notes: true },
      },
    },
  });

  if (!venue) notFound();

  const role = (session.user as { role?: string }).role;
  const allowEdit = canEditVenue(role);
  const isViewer = role === 'viewer';

  const { venueContacts, ...venueFields } = venue;

  return (
    <div className="w-full max-w-3xl mx-auto p-6 lg:p-8 pb-8">
      <VenueProfileContent
        venue={venueFields}
        initialContacts={venueContacts}
        allowEdit={allowEdit}
        isViewer={isViewer}
      />
    </div>
  );
}
