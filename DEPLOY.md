# Deploy a public URL (Vercel + Neon)

This app needs a **PostgreSQL** database and a **HTTPS** base URL so invite links and NextAuth work for people outside your laptop.

**Local `.env`:** If you still have `DATABASE_URL="file:./dev.db"` from SQLite, replace it with a PostgreSQL URL (see `.env.example`). Prisma no longer accepts `file:` URLs for this project.

## 1. Create a Postgres database (Neon)

1. Sign up at [https://neon.tech](https://neon.tech) and create a project.
2. Copy the connection string (use the **pooled** / **transaction** URL if Neon offers both; append `?sslmode=require` if not already present).

## 2. Push the project to GitHub

Vercel imports from Git. Commit and push this repository (including `prisma/migrations/`).

## 3. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
2. **Environment variables** (Production, and Preview if you use previews):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | Neon **pooled** connection string (`-pooler` host, `sslmode=require`, `pgbouncer=true`) |
   | `DIRECT_URL` | Neon **direct** connection string (same user/db; **no** `-pooler` in the host). Required so `prisma migrate deploy` on Vercel can connect (avoids P1001 / pooler issues). |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` (replace after first deploy with the real URL, including custom domain if you add one) |
   | Optional | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (invites + **password reset**), `BETA_JOIN_SECRET`, etc. |

3. Deploy. The build runs `npx prisma generate`, `node scripts/prisma-migrate-deploy-retry.mjs` (migrate deploy with retries), then `npx next build --webpack` (see `vercel.json`). Ensure **`DATABASE_URL`** and **`DIRECT_URL`** are set in Vercel for **Production** and **Preview** (build runs Prisma during `next build`). `vercel.json` sets `NODE_OPTIONS` for a larger heap during webpack.

   **Build command override:** In Vercel → Project → **Settings** → **General** → **Build & Development**, leave **Build Command** empty so `vercel.json` is used. If you set a custom command, it must still run migrate with `scripts/prisma-migrate-deploy-retry.mjs` (or equivalent) and include **`DIRECT_URL`** in env.

4. After the first successful deploy, confirm **`NEXTAUTH_URL`** exactly matches the site URL (scheme + host, no trailing slash). Redeploy if you change it.

## 4. Data: restore from SQLite or dev logins

**`prisma db seed`** only ensures `admin@tour.local` / `editor@tour.local` / `viewer@tour.local` exist with the documented passwords. It does **not** add tours or people.

To **replace everything in Neon** with a copy of your old **`prisma/dev.db`** (from before PostgreSQL):

```bash
npm run db:import-sqlite
```

(`DATABASE_URL` is read from `.env.local` or `.env`.) This **wipes** all app tables in PostgreSQL, then imports users, people, projects, tours, dates, flights, etc. Keep a backup of `dev.db` in a safe place.

If you use `.env.local` from `vercel env pull` but run seed manually:

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"') npx prisma db seed
```

## 5. Google sign-in (if you use it)

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client → **Authorized redirect URIs**, add:

`https://YOUR-PROJECT.vercel.app/api/auth/callback/google`

## 6. Invites and beta links

Use the **deployed** site (your `https://…` URL) when you add people and copy invite links. `NEXTAUTH_URL` should match that host so links stay correct.

## Limitation: advance file uploads on Vercel

Files for tour “advance” sections are stored under `./uploads` on disk. Vercel’s serverless filesystem is ephemeral, so those uploads are not suitable for production on Vercel without moving storage to S3, Vercel Blob, or similar.

---

## Local development

**No local Postgres:** link the folder to Vercel and pull only the DB URL into `.env.local` (ignored by Git). Next.js loads `.env.local` over `.env`, so you use Neon while `NEXTAUTH_URL` can stay `http://localhost:3000` in `.env`:

```bash
npx vercel link --project YOUR_VERCEL_PROJECT_NAME --yes
npx vercel env pull .env.local --yes
# Edit .env.local: keep only DATABASE_URL (remove NEXTAUTH_* so .env controls local auth).
```

Use PostgreSQL locally (same schema as production), for example:

```bash
docker run --name touring-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
```

Set `DATABASE_URL` in `.env` (see `.env.example`), then:

```bash
npx prisma migrate dev
npx prisma db seed   # optional
npm run dev
```

If you still have an old SQLite `prisma/dev.db`, stop using it and point `DATABASE_URL` at Postgres instead; run `migrate dev` or `migrate deploy` against the new database.

## Vercel build failed?

Open the deployment → **Building** → expand the log.

| Symptom | What to do |
|--------|------------|
| **`P1001: Can't reach database server`** during build | Add **`DIRECT_URL`** in Vercel (Neon dashboard → **Connection details** → copy **direct** URI, not pooler). Keep **`DATABASE_URL`** as the **pooler** URL for the running app. Optional: add `connect_timeout=60` to both URLs. Open the Neon project in the dashboard once to wake compute, then **Redeploy**. |
| **`prisma migrate deploy` failed** (P3009, “relation already exists”, drift) | Your Neon DB was likely created with `db push` before migrations. See README: use `npm run db:push` once to align, or [Prisma baselining](https://www.prisma.io/docs/guides/migrate/developing-with-create-only). Fix the DB, then **Redeploy**. |
| **`DATABASE_URL` must start with `postgresql://`** | Add `DATABASE_URL` (and **`DIRECT_URL`**) under Vercel → Settings → Environment Variables for **Production** (and Preview if needed). Redeploy. |
| **`next build` / TypeScript errors** | Run `npm run verify` locally on `main` after `git pull`; fix errors, push again. |
| **New tables missing in production** | Ensure **`prisma/migrations/`** is committed and pushed; Vercel only runs migrations that exist in the repo. |

Always **commit and push** `prisma/schema.prisma` and new folders under `prisma/migrations/` when you add features that change the database—otherwise production never applies them.
