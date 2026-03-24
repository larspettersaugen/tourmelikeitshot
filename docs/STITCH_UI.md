# Using Google Stitch with this app

**Stitch** ([stitch.withgoogle.com](https://stitch.withgoogle.com)) is Google Labs’ AI UI design tool. You describe screens or upload references; it produces layouts and can **export front-end code** (or send work to Figma).

Stitch is **not** an npm dependency. You don’t “install Stitch” into the repo. You use it in the browser, then **bring the output into this codebase** (by hand or with help in Cursor).

## Can we use it?

**Yes.** Typical workflow:

1. **Design in Stitch** — e.g. login, dashboard shell, tour list. Iterate until you like the look.
2. **Export** — use Stitch’s code export (or Figma handoff if your team prefers).
3. **Integrate here** — map the export onto **Next.js App Router** components under `src/app/` and `src/components/`, using **Tailwind** like the rest of the app.

## Fitting this project’s theme

The app uses a shared **stage** palette and **light/dark** via `next-themes` and CSS variables in [`src/app/globals.css`](../src/app/globals.css) (e.g. `--stage-surface`, `--stage-accent`). Tailwind maps these to classes like `bg-stage-surface`, `text-stage-muted`, `border-stage-border`.

When you paste Stitch-generated markup:

- Prefer **`bg-stage-*`, `text-stage-*`, `border-stage-*`** over raw hex colors so **dark mode** and future tweaks stay consistent.
- Keep **layout rules** from [`.cursor/rules/stability.mdc`](../.cursor/rules/stability.mdc) in mind (e.g. [`DashboardLayoutClient`](../src/components/DashboardLayoutClient.tsx) breakpoints and structure).

## Download HTML + preview image from Stitch (project / screen IDs)

Stitch does **not** publish permanent public URLs for assets. The hosted links are **short-lived** and returned only after **authenticated** API calls. Plain `curl` against a fixed URL will not work without first obtaining those URLs with a **Stitch API key**.

1. In Stitch: **Settings → API Keys** → create a key.
2. Add to `.env.local`: `STITCH_API_KEY="..."` (never commit this file).
3. From the repo root, fetch your screen (defaults are set for project `16355217856079053150`, screen `dee37b25120a4f1db8dd8bc5758e817a` — Dashboard “The Hub”):

   ```bash
   npm run stitch:fetch
   ```

   Outputs:

   - `design/stitch/<projectId>/dashboard-the-hub.html`
   - `design/stitch/<projectId>/dashboard-the-hub.png`

4. Override IDs or filename slug if needed:

   ```bash
   STITCH_PROJECT_ID=... STITCH_SCREEN_ID=... STITCH_OUTPUT_SLUG=my-screen npm run stitch:fetch
   ```

The script uses `@google/stitch-sdk` under the hood (same as `curl -L` on the returned URLs, but only after auth).

## Practical next steps

1. Pick **one screen** to start (e.g. `/login` or dashboard chrome).
2. Run `npm run stitch:fetch` (or paste exported code from Stitch manually).
3. In **Agent mode**, ask to “apply `design/stitch/.../dashboard-the-hub.html` to the dashboard” (or attach the file) so changes stay aligned with existing patterns.

## If you meant something else

- **shadcn/ui** — a popular React + Tailwind **component kit** (copy-paste components). Different tool; we can add it later if you want a shared component library instead of Stitch-led layouts.
