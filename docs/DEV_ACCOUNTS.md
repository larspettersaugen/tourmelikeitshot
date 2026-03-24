# Local dev accounts (Supabase Auth)

Logins use **Supabase Auth** (email + password). The app also has matching rows in the Prisma `User` table for roles (`admin`, `editor`, `viewer`).

These accounts are for **local / staging only**. Do not reuse these passwords in production.

## Admin (simple password)

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@tour.local` |
| Password | `tour1234`         |

Use `/login` on `http://localhost:3000` (or your deployed URL).

If login fails (e.g. user was created earlier with another password), reset from the repo root:

```bash
npm run db:set-password -- admin@tour.local tour1234
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in `.env` or `.env.local`.

## Other seed users (`npm run db:seed`)

`prisma/seed.ts` creates Supabase users + Prisma users when you run `npm run db:seed`. If the Auth user **already exists**, the seed does **not** change the password—use `db:set-password` instead.

| Email              | Password (on fresh seed) | Role   |
|--------------------|--------------------------|--------|
| `admin@tour.local` | `tour1234`               | admin  |
| `editor@tour.local`| `editor123edit`          | editor |
| `viewer@tour.local`| `viewer123view`          | viewer |

## Set any user’s password (service role)

```bash
npm run db:set-password -- <email> <new-password>
```

Implementation: [`scripts/set-supabase-user-password.mjs`](../scripts/set-supabase-user-password.mjs).

## Forgot password in production

Production users use **Supabase** “Forgot password” (not this doc). Configure **Authentication → URL Configuration** in the Supabase dashboard so reset links use your real domain, not `localhost`.
