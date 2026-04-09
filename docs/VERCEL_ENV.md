# Vercel environment variables (Supabase)

Use this checklist when creating a new Vercel project or after rotating keys. Copy values from **Supabase** → **Project Settings** (Database + API). Do not commit real secrets to git.

## Required (Production and Preview if you build previews)

| Variable | Where to get it | Notes |
|----------|-----------------|--------|
| `DATABASE_URL` | Supabase → Database → Connection string → **Transaction** pooler (port **6543**) | Include `?pgbouncer=true&sslmode=require` as in Supabase’s Prisma snippet. Needed at **runtime** and during **build** (Prisma). |
| `DIRECT_URL` | Same screen → **Session** pooler (port **5432**) | Used by `prisma migrate deploy` on Vercel. Without it, deploys can fail with P1001. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon **public** key (JWT) | Safe to expose to the browser; still set in Vercel for server build. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → **service_role** key (JWT) | **Server-only.** Never prefix with `NEXT_PUBLIC_`. Used for admin user creation (register, join, invite accept). |

## Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Set to `1` to show Google on the login page after enabling Google in Supabase Auth. |
| `NEXT_PUBLIC_APP_NAME` | Overrides default app title in UI. |
| `PUBLIC_APP_URL` | Base URL for invite links when the app needs a fixed public URL (e.g. local dev but links should point at production). |
| `BETA_JOIN_SECRET` | Enables `/join/{secret}` beta signup. |
| `AVIATIONSTACK_ACCESS_KEY` | Flight lookup API. |

## Remove (legacy — not used with Supabase Auth)

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Any Neon `DATABASE_URL` / `DIRECT_URL` pointing at `*.neon.tech`

## Supabase Auth URLs (password reset and OAuth)

In **Supabase → Authentication → URL Configuration**:

1. **Site URL** — your production origin, e.g. `https://your-domain.com`.
2. **Redirect URLs** — add at least:
   - `https://your-domain.com/**`
   - `http://localhost:3000/**` (for local testing)

Password reset emails use `redirectTo` from the app; Supabase only allows redirects that match this list.

For Google OAuth later, add your app’s callback URL as documented in Supabase (e.g. `/api/auth/callback` on your domain).

## After changing env vars

Redeploy the project (Deployments → … → Redeploy) so the new values apply to the next build and runtime.

## Row Level Security (Security Advisor)

Prisma tables live in `schema public`. Supabase’s **Data API** (`anon` / `authenticated`) must not expose them directly—this app uses **Prisma** and **server routes** for all tour/people data.

Migration **`20260409190000_supabase_rls_lock_public_tables`** enables **RLS** on every `public` base table (except `_prisma_migrations`) and **revokes** `anon` / `authenticated` table privileges where those roles exist. The database user used by **`DATABASE_URL`** (Postgres / pooler) **bypasses RLS**, so the app keeps working; Supabase advisor warnings for publicly readable tables and sensitive columns via the API should clear after `prisma migrate deploy`.

## See also

- [`.env.example`](../.env.example) — local template
- [`DEPLOY.md`](../DEPLOY.md) — broader deploy notes (some sections may still mention Neon; prefer this file for Supabase env names)
- [`NETWORK_AND_IT.md`](./NETWORK_AND_IT.md) — firewall / HTTPS inspection / allowlisting for organisations
