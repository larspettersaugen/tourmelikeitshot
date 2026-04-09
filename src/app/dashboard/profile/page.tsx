import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/cached-session';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileContent } from '@/components/ProfileContent';

export default async function ProfilePage() {
  const session = await getCachedSession();
  if (!session?.user) redirect('/login');
  const userId = (session.user as { id?: string }).id;
  const profile = userId
    ? await prisma.person.findFirst({
        where: { userId },
        select: { id: true, name: true, type: true, phone: true, email: true, notes: true },
      })
    : null;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 lg:p-8 pb-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-stage-muted hover:text-stage-neonCyan transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">My profile</h1>
      <ProfileContent
        initialProfile={profile}
        user={{ name: session.user.name ?? undefined, email: session.user.email ?? undefined }}
      />
    </div>
  );
}
