import { cache } from 'react';
import { getSession } from './session';

/**
 * React-cached session for RSC (layout + page share one Supabase auth round-trip per request).
 * API routes must keep using `getSession()` directly — they run outside the RSC tree.
 */
export const getCachedSession = cache(getSession);
