import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

/** getServerSession uses headers(); must not be statically prerendered. */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) redirect('/dashboard');
  redirect('/login');
}
