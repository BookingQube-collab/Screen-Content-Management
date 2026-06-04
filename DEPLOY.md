# Deploying Urban Arena on Vercel

Urban Arena runs as **two Vercel projects** from this monorepo: an Express API and a static React (Vite) frontend. The frontend calls the API with **relative** paths (`/api/...`); the frontend project **rewrites** those requests to the API deployment URL so the browser stays same-origin (no CORS changes in app code).

## Why you see JSON on the API URL (not the UI)

If you open **`https://screen-content-management-api-serve.vercel.app`** (or its production alias **`https://screen-content-management-api-serve-gold.vercel.app`**) in a browser, you will only see:

```json
{"status":"ok","database":"configured"}
```

That is **correct**. That hostname is **Project 1 — the Express API**. It does not serve `index.html`, `/display`, or `/admin/login`. The root [vercel.json](vercel.json) builds `artifacts/api-server` only; there is no React bundle on that deployment.

| URL | What it is | What you should see |
| --- | --- | --- |
| `https://screen-content-management-api-serve.vercel.app` | API (Project 1) | Health JSON at `/` |
| `https://screen-content-management-api-serve-gold.vercel.app` | API production alias (same app) | Same health JSON |
| `https://YOUR-FRONTEND-PROJECT.vercel.app` | **UI (Project 2 — you must create this)** | React app at `/`, `/display`, `/admin/login` |

**Use the frontend URL for the kiosk and admin UI.** Keep the API URL for health checks, `curl`, and monitoring. `/api/*` on the frontend host is proxied to the API via [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json).

You cannot serve the full UI from the API Vercel project without merging API + static into one custom deployment (not configured in this repo).

---

## Deployable parts

| Path | Package | Deploy? | Role |
| --- | --- | --- | --- |
| `artifacts/api-server` | `@workspace/api-server` | **Yes â€” Project 1** | Express API (`/api/*`, health at `/` and `/api/health`) |
| `artifacts/urban-arena` | `@workspace/urban-arena` | **Yes â€” Project 2** | Kiosk display + admin UI (Vite â†’ static `dist/public`) |
| `lib/*` | workspace libraries | No (built as deps) | DB, OpenAPI/Zod, React Query client |
| `scripts/` | `@workspace/scripts` | No | Migrations/seed (run locally or CI) |
| `artifacts/mockup-sandbox` | dev mockups | No | Not part of production |

## Why health shows `database: "not_configured"`

The API is up, but **Vercel has no `DATABASE_URL`** (or it is empty). `isDatabaseConfigured()` in `@workspace/db` only checks that `process.env.DATABASE_URL` is set and non-empty; it does not connect at startup. Health endpoints always return `status: "ok"`; `database` flips to `"configured"` once the variable is set and redeployed.

```12:14:lib/db/src/index.ts
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
```

Auth and data routes will fail at runtime until `DATABASE_URL` and (for production) `JWT_SECRET` are set.

---

## Prerequisites (once per Supabase project)

1. Apply schema: [scripts/APPLY-SUPABASE.md](scripts/APPLY-SUPABASE.md), [supabase/migrations/](supabase/migrations/), or `pnpm db:push` with root `.env` (never commit `.env`). See [docs/SUPABASE.md](docs/SUPABASE.md).
2. Optional seed: `pnpm --filter @workspace/scripts run seed` (local, with `DATABASE_URL` in `.env`).
3. Copy connection string from **Supabase â†’ Project Settings â†’ Database** (project ref `fiozifqhhawsvvtjamfo`).
4. Optional CLI: `pnpm supabase:link` after `supabase login` (requires [Supabase CLI](https://supabase.com/docs/guides/cli)).

**`DATABASE_URL` for Vercel (serverless):** prefer the **connection pooler** (session mode, port **5432**), not the direct `db.*.supabase.co` host, to avoid exhausting connections. Example shape (replace password and region):

```text
postgresql://postgres.[PROJECT_REF]:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

See [.env.example](.env.example) for direct vs pooler comments.

---

## Project 1: API (existing deployment)

**Example URL:** `https://screen-content-management-api-serve.vercel.app`

| Setting | Value |
| --- | --- |
| **Root Directory** | `.` (repo root, **recommended**) — see [vercel.json](vercel.json) |
| **Include source files outside Root Directory** | **Enabled** (default on newer projects; required for `lib/*` workspace deps) |
| **Framework** | Express (or Other; entry `artifacts/api-server/index.cjs`) |
| **Install Command** | `pnpm install --frozen-lockfile` (from root `vercel.json`; **no** `cd ../..`) |
| **Build Command** | `pnpm -w run build:libs && pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run build` |
| **Output Directory** | `artifacts/api-server` (from root `vercel.json`) |

**Do not** set Root Directory to `.` while leaving install/build as `cd ../..` — that escapes to `/` and fails with `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`.

**Alternative (subdir root):** Root Directory `artifacts/api-server`, same install/build commands (no `cd`) from [artifacts/api-server/vercel.json](artifacts/api-server/vercel.json), Output Directory empty/`null`, **Include source files outside Root Directory** enabled.


### Screenshot-level: fix `database: not_configured`

1. **Vercel** → [vercel.com/dashboard](https://vercel.com/dashboard) → open the **API** project (example: `screen-content-management-api-serve`).
2. Top nav **Settings** (not Deployments).
3. Left sidebar **Environment Variables**.
4. Button **Add New** (or **Add**):
   - **Key:** `DATABASE_URL`
   - **Value:** Supabase **pooler** URI (session, port **5432**). Shape:
     `postgresql://postgres.fiozifqhhawsvvtjamfo:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`
   - **Environment:** check **Production** (and **Preview** if you test preview URLs).
   - **Save**.
5. **Add New** again:
   - **Key:** `JWT_SECRET`
   - **Value:** same secret as local root `.env` (long random, ≥48 characters).
   - **Production** → **Save**.
6. Top nav **Deployments** → latest **Production** row → **⋯** menu → **Redeploy**.
7. Wait until **Ready** → browser: `https://<your-api-host>/` → JSON should show `"database":"configured"`.

Local root `.env` often uses the **direct** host (`db.*.supabase.co`); Vercel should use the **pooler** host above with the **same password**. See [scripts/vercel-env-checklist.md](scripts/vercel-env-checklist.md).

CLI alternative: `cd artifacts/api-server`, `npx vercel link`, then `npx vercel env add DATABASE_URL production` (requires the Vercel account that owns the API project).
### Environment variables (Vercel â†’ Settings â†’ Environment Variables)

Copy the **Name** column exactly into Vercel. Values come from your local `.env` (see [.env.example](.env.example)); never commit `.env` or paste secrets into the repo.

| Name | Required for API | Value source |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Supabase **pooler** URI on Vercel (see above); direct `db.*` OK for local/`db:push` |
| `JWT_SECRET` | **Yes** | Same long random string as local `.env` (â‰¥48 chars); not the dev default in code |
| `SUPABASE_URL` | No | `https://fiozifqhhawsvvtjamfo.supabase.co` â€” optional; API uses Postgres only today |
| `SUPABASE_PROJECT_REF` | No | `fiozifqhhawsvvtjamfo` â€” optional metadata |
| `SUPABASE_PUBLISHABLE_KEY` | No | Optional; for future `@supabase/supabase-js` |
| `SUPABASE_SECRET_KEY` | No | Optional; server-side Supabase client only |
| `SUPABASE_ANON_KEY` | No | Optional; for future client Supabase auth |
| `LOG_LEVEL` | No | e.g. `info` |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | If using uploads | GCS bucket for `/api/uploads/*` on Vercel |
| GCP credentials | If using uploads | Application Default Credentials (not Replit sidecar) |

**Minimum for a working API:** `DATABASE_URL` + `JWT_SECRET` only. Redeploy after adding or changing vars.

### Verify API

| URL | Expected |
| --- | --- |
| `GET /` | `{"status":"ok","database":"configured"}` after `DATABASE_URL` is set |
| `GET /api/health` | Same |
| `GET /api/healthz` | Same |
| `POST /api/auth/login` | Works after DB + seed (demo user in `replit.md`) |

More detail: [artifacts/api-server/DEPLOY.md](artifacts/api-server/DEPLOY.md).

---

## Project 2: Frontend (new Vercel project)

Create a **second** Vercel project linked to the **same Git repository** as the API. Until this exists, there is no production UI URL — only the API JSON above.

### Step-by-step: create the frontend Vercel project

1. [vercel.com/new](https://vercel.com/new) → **Import** the same Git repo used for `screen-content-management-api-serve`.
2. **Project name:** e.g. `urban-arena` or `urban-arena-display` (your choice; this becomes `https://<project-name>.vercel.app`).
3. **Root Directory:** click **Edit** → set to **`artifacts/urban-arena`** (not repo root).
4. **Framework Preset:** Vite (or Other — [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json) supplies install/build/output).
5. **Include source files outside the Root Directory:** **Enabled** (required for `lib/*` workspace packages).
6. **Environment Variables** (Production + Preview) → add:

   | Key | Value |
   | --- | --- |
   | `PORT` | `3000` |
   | `BASE_PATH` | `/` |

7. **Deploy**. Vercel runs install/build from [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json).
8. After **Ready**, open:
   - `https://<your-frontend-project>.vercel.app/` — app shell
   - `https://<your-frontend-project>.vercel.app/display` — kiosk UI
   - `https://<your-frontend-project>.vercel.app/admin/login` — admin login
   - `https://<your-frontend-project>.vercel.app/api/health` — should return the same JSON as the API (via rewrite to `screen-content-management-api-serve.vercel.app`)

If the API hostname changes, edit the `destination` in [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json) (currently `https://screen-content-management-api-serve.vercel.app/api/:path*`) and redeploy **only** the frontend project.

### Dashboard settings (reference)

| Setting | Value |
| --- | --- |
| **Root Directory** | `artifacts/urban-arena` |
| **Framework Preset** | Vite (or Other) |
| **Output Directory** | `dist/public` (set in [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json)) |
| **Include source files outside Root Directory** | **Enabled** |
| **Install Command** | `pnpm install --frozen-lockfile` (from [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json); **no** `cd ../..`) |
| **Build Command** | `pnpm --filter @workspace/urban-arena run typecheck && pnpm --filter @workspace/urban-arena run build` |

### Build-time environment variables

Required by [artifacts/urban-arena/vite.config.ts](artifacts/urban-arena/vite.config.ts) at build time:

| Variable | Value |
| --- | --- |
| `PORT` | `3000` (any positive number; **Vercel build only** — satisfies Vite config; not exposed in static output) |
| `BASE_PATH` | `/` |

**Port separation:** Vercel frontend builds use `PORT=3000` (or any positive value) because `VERCEL` is set and `vite.config.ts` reads `PORT` from the environment. **Local / Replit UI dev** uses **24725** by default (`http://localhost:24725`) so it does not clash with other apps on 3000 or with the API on 8080. Optional override: `VITE_DEV_PORT`. See [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md).

No `VITE_*` API URL: the app uses `/api/...` on the same host.

### API proxy (rewrites)

[artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json) rewrites:

- `/api/*` â†’ your **Project 1** deployment URL (default: `screen-content-management-api-serve.vercel.app`)
- everything else â†’ `/index.html` (SPA)

If your API hostname differs, edit the `destination` host in that file and redeploy the frontend.

### Verify frontend (replace `YOUR-FRONTEND` with Vercel URL)

| URL | Expected |
| --- | --- |
| `/` | App shell (redirects to display flow) |
| `/display` | Public kiosk UI |
| `/admin/login` | Admin login |
| `/api/health` (via rewrite) | Same JSON as API project `database: "configured"` |

---

## How the frontend calls the API

- Generated hooks and most `fetch` calls use **relative** URLs: `/api/activities`, `/api/auth/me`, `/api/settings`, etc. ([lib/api-client-react](lib/api-client-react/src/generated/api.ts)).
- Locally on Replit, the web service serves static files and API is separate; on Vercel, **Project 2 rewrites** `/api` to **Project 1** so those paths work without changing React code.
- PWA `workbox` runtime caching in Vite also targets `/api/...` on the same origin.

---

## Checklist: whole solution live

1. **Supabase** schema applied; optional seed run locally.
2. **API project:** set `DATABASE_URL` + `JWT_SECRET` â†’ redeploy â†’ health shows `database: "configured"`.
3. **Frontend project:** root `artifacts/urban-arena`, set `PORT` + `BASE_PATH`, confirm rewrite target matches API URL â†’ deploy.
4. Open frontend URL â†’ `/display` and `/admin/login`; login uses API through `/api/auth/login`.

---

## One project vs two?

| Approach | Supported? |
| --- | --- |
| **Two Vercel projects (recommended)** | API = Node/Express serverless; Frontend = static + rewrites. Matches this repo. |
| **Single project** | Not configured in-repo. Would require merging API + static into one deployment or custom routing. |

The root [vercel.json](vercel.json) is **API-only** (`outputDirectory`: `artifacts/api-server`). When Vercel **Root Directory** is `.`, that file deploys Express — not the React UI. Do not point the frontend project at repo root or you will get the wrong app (or a failed build). The frontend project must use root **`artifacts/urban-arena`** and [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json).

---

## Optional / not on Vercel by default

- **File uploads** (`/api/uploads/*`): need GCS bucket + env vars (see API DEPLOY.md).
- **Google Drive sync**: needs Drive API credentials in API env (if enabled in your deployment).
- **mockup-sandbox**: local/dev only.
