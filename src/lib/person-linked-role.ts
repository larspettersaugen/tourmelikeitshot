/**
 * User.role values assignable from the People UI (not platform superadmin).
 */
export type PeopleAssignableRole = 'viewer' | 'power_user' | 'admin';

export function peopleRoleFromCheckboxes(isBookingAdmin: boolean, isPowerUser: boolean): PeopleAssignableRole {
  if (isBookingAdmin) return 'admin';
  if (isPowerUser) return 'power_user';
  return 'viewer';
}

export function checkboxesFromUserRole(role: string | undefined): {
  isBookingAdmin: boolean;
  isPowerUser: boolean;
  linkedRoleLocked: boolean;
} {
  if (!role) return { isBookingAdmin: false, isPowerUser: false, linkedRoleLocked: false };
  if (role === 'superadmin') return { isBookingAdmin: true, isPowerUser: false, linkedRoleLocked: true };
  if (role === 'admin' || role === 'editor') return { isBookingAdmin: true, isPowerUser: false, linkedRoleLocked: false };
  if (role === 'power_user') return { isBookingAdmin: false, isPowerUser: true, linkedRoleLocked: false };
  return { isBookingAdmin: false, isPowerUser: false, linkedRoleLocked: false };
}

export function isSuperadminLinkedRole(role: string | undefined): boolean {
  return role === 'superadmin';
}

/** Request body: `isBookingAdmin` + `isPowerUser`, or legacy `{ isPowerUser }` only. */
export function peopleAccessSpecifiedInBody(body: Record<string, unknown>): boolean {
  return 'isBookingAdmin' in body || 'isPowerUser' in body;
}

export function parsePeopleAccessFlags(body: Record<string, unknown>): {
  isBookingAdmin: boolean;
  isPowerUser: boolean;
} {
  const hasNewShape = 'isBookingAdmin' in body || 'isPowerUser' in body;
  if (hasNewShape) {
    let isBookingAdmin = body.isBookingAdmin === true;
    let isPowerUser = body.isPowerUser === true;
    if (isBookingAdmin) isPowerUser = false;
    return { isBookingAdmin, isPowerUser };
  }
  return { isBookingAdmin: false, isPowerUser: body.isPowerUser === true };
}
