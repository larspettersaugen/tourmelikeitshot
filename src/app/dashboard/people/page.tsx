import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import { PeoplePageTabs } from '@/components/PeoplePageTabs';
import { canEdit } from '@/lib/session';
import { checkboxesFromUserRole } from '@/lib/person-linked-role';
import { getBetaJoinSecret, isBetaJoinEnabled } from '@/lib/beta-join';
import { getPublicAppBaseUrl } from '@/lib/public-app-url';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  if ((session.user as { role?: string }).role === 'viewer') redirect('/dashboard');

  const { tab } = await searchParams;
  const initialTab = tab === 'groups' ? 'groups' : 'people';

  const peopleRaw = await prisma.person.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      name: true,
      type: true,
      birthdate: true,
      phone: true,
      email: true,
      streetName: true,
      zipCode: true,
      county: true,
      timezone: true,
      notes: true,
      userId: true,
      user: { select: { role: true } },
      invites: {
        where: { usedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  const people = peopleRaw.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
    name: p.name,
    type: p.type,
    birthdate: p.birthdate?.toISOString() ?? null,
    phone: p.phone,
    email: p.email,
    streetName: p.streetName,
    zipCode: p.zipCode,
    county: p.county,
    timezone: p.timezone,
    notes: p.notes,
    userId: p.userId,
    ...(() => {
      const f = checkboxesFromUserRole(p.user?.role);
      return {
        isBookingAdmin: f.isBookingAdmin,
        isPowerUser: f.isPowerUser,
        linkedRoleLocked: f.linkedRoleLocked,
      };
    })(),
    hasPendingInvite: p.invites.length > 0,
  }));

  const allowEdit = canEdit((session.user as { role?: string }).role);

  let betaJoinUrl: string | null = null;
  if (allowEdit && isBetaJoinEnabled()) {
    const h = await headers();
    const base = getPublicAppBaseUrl((name) => h.get(name));
    const secret = getBetaJoinSecret()!;
    betaJoinUrl = `${base}/join/${encodeURIComponent(secret)}`;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 lg:p-8 pb-8">
      <h1 className="text-xl font-bold text-white mb-6">People</h1>
      <PeoplePageTabs
        initialPeople={people}
        allowEdit={allowEdit}
        initialTab={initialTab}
        betaJoinUrl={betaJoinUrl}
      />
    </div>
  );
}
