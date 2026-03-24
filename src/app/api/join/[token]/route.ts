import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServiceClient } from '@/lib/supabase/server';
import {
  betaJoinTokenMatches,
  getBetaJoinSecret,
  BETA_PERSON_TYPES,
  type BetaPersonType,
} from '@/lib/beta-join';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!getBetaJoinSecret()) {
    return NextResponse.json({ error: 'Beta signup is not enabled', code: 'disabled' }, { status: 503 });
  }
  if (!betaJoinTokenMatches(decodeURIComponent(token))) {
    return NextResponse.json({ error: 'Invalid beta link', code: 'invalid' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, personTypes: [...BETA_PERSON_TYPES] });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!getBetaJoinSecret()) {
    return NextResponse.json({ error: 'Beta signup is not enabled' }, { status: 503 });
  }
  const { token } = await params;
  if (!betaJoinTokenMatches(decodeURIComponent(token))) {
    return NextResponse.json({ error: 'Invalid beta link' }, { status: 404 });
  }

  let body: { name?: string; email?: string; password?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  const email = emailRaw.toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';

  if (!name || !emailRaw || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!BETA_PERSON_TYPES.includes(type as BetaPersonType)) {
    return NextResponse.json(
      { error: `Role must be one of: ${BETA_PERSON_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existingUser?.profile) {
    const existingName = existingUser.profile.name;
    return NextResponse.json(
      {
        error: `An account with this email already exists${existingName ? ` (${existingName})` : ''}. Sign in instead.`,
      },
      { status: 400 }
    );
  }
  if (existingUser) {
    return NextResponse.json({ error: 'This email is already registered. Sign in instead.' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    console.error('[POST /api/join] Supabase auth error:', authError);
    return NextResponse.json({ error: 'Could not create account. Try a different email.' }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: null,
          name,
          role: 'viewer',
        },
      });
      await tx.person.create({
        data: {
          name,
          type,
          email,
          userId: user.id,
        },
      });
    });

    return NextResponse.json({ ok: true, email });
  } catch (e) {
    console.error('[POST /api/join]', e);
    return NextResponse.json({ error: 'Could not create account. Try a different email.' }, { status: 500 });
  }
}
