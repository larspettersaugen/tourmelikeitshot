import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getSession() {
  return getServerSession(authOptions);
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
