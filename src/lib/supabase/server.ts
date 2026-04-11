import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { supabaseCookieOptionsFromForwardedHeaders } from '@/lib/supabase/cookie-options';

export async function createClient() {
  const cookieStore = await cookies();
  const h = await headers();
  const cookieOptions = supabaseCookieOptionsFromForwardedHeaders((name) => h.get(name));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll can fail in Server Components (read-only cookies);
            // middleware handles refresh instead.
          }
        },
      },
    },
  );
}

/** Server client with service_role key -- bypasses RLS. Use only in server-side API routes. */
export async function createServiceClient() {
  const cookieStore = await cookies();
  const h = await headers();
  const cookieOptions = supabaseCookieOptionsFromForwardedHeaders((name) => h.get(name));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // ignored in read-only contexts
          }
        },
      },
    },
  );
}
