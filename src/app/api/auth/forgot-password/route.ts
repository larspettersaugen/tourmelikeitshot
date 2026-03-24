import { NextResponse } from 'next/server';

const GENERIC = {
  ok: true,
  message: 'If an account exists for that email, we sent password reset instructions.',
};

/**
 * Password reset is now handled directly by Supabase Auth on the client.
 * This route is kept as a fallback / compatibility stub.
 */
export async function POST() {
  return NextResponse.json(GENERIC);
}
