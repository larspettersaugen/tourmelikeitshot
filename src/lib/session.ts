import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}

export interface AppSession {
  user: SessionUser;
}

/**
 * Read the current session in RSC / route handlers.
 * Gets the Supabase auth user from the cookie, then looks up the Prisma User for role/name.
 * Returns the same shape the app expects so API routes need no changes.
 */
export async function getSession(): Promise<AppSession | null> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) return null;

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true, email: true, name: true, image: true, role: true },
    });
    if (!dbUser) return null;

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
      },
    };
  } catch (err) {
    console.error('[getSession] Failed to read session:', err);
    return null;
  }
}

export function canEdit(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor';
}

/** Edit Advance text, checklists, and files (not tour-wide editor features). */
export function canEditAdvance(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor' || role === 'power_user';
}

/** Power user or above: can see Advance, more flights, etc. (power_user, editor, admin) */
export function canAccessAdvance(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor' || role === 'power_user';
}

export function canAdmin(role: string | undefined): boolean {
  return role === 'admin';
}
