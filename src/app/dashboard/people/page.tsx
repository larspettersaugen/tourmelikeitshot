import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { PeoplePageTabs } from '@/components/PeoplePageTabs';
import { canEdit } from '@/lib/session';
import { getBetaJoinSecret, isBetaJoinEnabled } from '@/lib/beta-join';
import { getPublicAppBaseUrl } from '@/lib/public-app-url';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  if ((session.user as { role?: string }).role === 'viewer') redirect('/dashboard');

  const { tab } = await searchParams;
  const initialTab = tab === 'groups' ? 'groups' : 'people';

  const peopleRaw = await prisma.person.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
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
    isPowerUser: p.user
      ? p.user.role === 'power_user' || p.user.role === 'editor' || p.user.role === 'admin'
      : false,
    hasPendingInvite: p.invites.length > 0,
  }));

  const allowEdit = canEdit((session.user as { role?: string }).role);

  let betaJoinUrl: string | null = null;
  if (allowEdit && isBetaJoinEnabled()) {
    const h = headers();
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
