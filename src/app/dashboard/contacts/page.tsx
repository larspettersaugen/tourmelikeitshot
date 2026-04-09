import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { ContactsContent } from '@/components/ContactsContent';
import { canEdit } from '@/lib/session';

export default async function ContactsPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  if ((session.user as { role?: string }).role === 'viewer') redirect('/dashboard');

  const [contacts, venues] = await Promise.all([
    prisma.venueContact.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        notes: true,
        venueId: true,
        venue: { select: { id: true, name: true, city: true } },
      },
    }),
    prisma.venue.findMany({
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, city: true },
    }),
  ]);

  const allowEdit = canEdit((session.user as { role?: string }).role);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">Venue contacts</h1>
      <ContactsContent initialContacts={contacts} initialVenues={venues} allowEdit={allowEdit} />
    </div>
  );
}
