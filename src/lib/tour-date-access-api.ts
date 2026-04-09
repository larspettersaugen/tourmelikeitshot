import { NextResponse } from 'next/server';
import { userCanOpenTourDateDetail } from '@/lib/tour-date-access';

/** Use in API routes after session check; returns 403 JSON or null if allowed. */
export async function requireTourDateReadAccess(
  userId: string | undefined,
  role: string | undefined,
  tourId: string,
  dateId: string
): Promise<NextResponse | null> {
  const ok = await userCanOpenTourDateDetail(userId, role, tourId, dateId);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
