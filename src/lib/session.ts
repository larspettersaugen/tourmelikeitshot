import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

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
 * Not wrapped in React `cache()` because this module is also used from API routes (must not share across HTTP requests).
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
  return hasFullTourCatalogAccess(role);
}

/** Edit Advance text, checklists, and files (not tour-wide editor features). */
export function canEditAdvance(role: string | undefined): boolean {
  return hasFullTourCatalogAccess(role) || role === 'power_user';
}

/** Can open Advance (tab + read APIs). Viewers see content but do not edit (see canEditAdvance). */
export function canAccessAdvance(role: string | undefined): boolean {
  return (
    hasFullTourCatalogAccess(role) ||
    role === 'power_user' ||
    role === 'viewer'
  );
}

/** Can edit venue profiles and venue contacts: full-catalog staff only (not power_user). */
export function canEditVenue(role: string | undefined): boolean {
  return canEdit(role);
}

/** Platform-level admin (local dev / operators). Prefer for future superadmin-only features. */
export function canAdmin(role: string | undefined): boolean {
  return role === 'superadmin';
}

/** Viewers do not see the Tasks tab or task APIs; power_user and above do. */
export function canViewTasks(role: string | undefined): boolean {
  return role !== 'viewer';
}
