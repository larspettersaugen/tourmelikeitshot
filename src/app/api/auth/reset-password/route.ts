import { NextResponse } from 'next/server';

/**
 * Password reset is now handled by Supabase Auth on the client (updateUser).
 * This route is kept as a compatibility stub.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Password reset is now handled via Supabase Auth. Use the reset link from your email.' },
    { status: 410 },
  );
}
