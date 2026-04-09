# Network access and IT allowlisting

This app cannot bypass your organisation’s firewall or HTTPS inspection—those are policy decisions on your network. The checklist below helps **IT or network admins** allow normal use where that is permitted.

## What the product is

- A **web application** over **HTTPS on port 443** (standard TLS).
- Hosted on **Vercel** (when deployed there) with a **public CA** certificate for your custom domain.
- **Authentication** via **Supabase** (hosted `*.supabase.co`).

## Hostnames often involved in the browser

| Purpose | Typical hostnames |
|--------|---------------------|
| Your app | Your production domain (e.g. `your-domain.com`) and Vercel preview URLs if you use them |
| Sign-in, session, auth API | `*.supabase.co` (value of `NEXT_PUBLIC_SUPABASE_URL`) |
| Google sign-in (if enabled) | `accounts.google.com` and related Google OAuth endpoints |
| Map links (opens in new tab / externally) | `www.google.com` |

## Outbound from the browser

- The app itself does **not** call the flight provider from the client; flight lookup uses **server-side** `api.aviationstack.com` when configured.
- No non-standard ports are required for normal use beyond **443** for HTTPS.

## HTTPS inspection (“decrypt and re-sign”)

If users see **certificate errors** (e.g. unknown issuer, corporate root CA):

- Browsers only trust the site if the organisation’s **root CA is installed** on the device, **or**
- IT adds a **decryption bypass / exception** for your app hostname and for `*.supabase.co`, **or**
- Users use a **network without inspection** (e.g. guest Wi‑Fi or mobile data) where policy allows.

That behaviour is **not** something this repository can change.

## Suggested text for an IT ticket

> Please allow HTTPS access to our production hostname **`____________`** and to **`*.supabase.co`** (Supabase Auth). Standard **TLS on 443** only. If SSL inspection is mandatory, please install the organisation root CA on managed devices or add a decryption exception for these hosts so clients receive a chain trusted by the OS/browser store.

## See also

- [`VERCEL_ENV.md`](./VERCEL_ENV.md) — environment and Supabase URL configuration
- [`DEPLOY.md`](../DEPLOY.md) — deployment overview
