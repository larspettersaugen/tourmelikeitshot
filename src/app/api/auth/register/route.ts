import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { email, password, name, role = 'viewer' } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      console.error('[register] Supabase auth error:', authError);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    const user = await prisma.user.create({
      data: { email, password: null, name: name || null, role },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
