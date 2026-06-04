# Deploying Urban Arena on Vercel

Urban Arena runs as **two Vercel projects** from this monorepo: an Express API and a static React (Vite) frontend. The frontend calls the API with **relative** paths (`/api/...`); the frontend project **rewrites** those requests to the API deployment URL so the browser stays same-origin (no CORS changes in app code).

## Deployable parts

| Path | Package | Deploy? | Role |
| --- | --- | --- | --- |
| `artifacts/api-server` | `@workspace/api-server` | **Yes — Project 1** | Express API (`/api/*`, health at `/` and `/api/health`) |
| `artifacts/urban-arena` | `@workspace/urban-arena` | **Yes — Project 2** | Kiosk display + admin UI (Vite → static `dist/public`) |
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
3. Copy connection string from **Supabase → Project Settings → Database** (project ref `fiozifqhhawsvvtjamfo`).
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
| **Root Directory** | `artifacts/api-server` |
| **Framework** | Express (or Other; entry `index.cjs`) |
| **Install / Build** | From [artifacts/api-server/vercel.json](artifacts/api-server/vercel.json) |

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Supabase pooler URI (see above). Redeploy after adding. |
| `JWT_SECRET` | **Yes** (production) | Long random string for admin JWTs. Do not use the dev default. |
| `SUPABASE_URL` | No | e.g. `https://fiozifqhhawsvvtjamfo.supabase.co` — optional metadata; API uses Postgres only today. |
| `LOG_LEVEL` | No | e.g. `info` |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | If using uploads | GCS bucket for `/api/uploads/*` on Vercel |
| GCP credentials | If using uploads | Application Default Credentials (not Replit sidecar) |

Do **not** commit `.env` or paste secrets into the repo.

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

Create a **second** Vercel project linked to the same Git repo.

| Setting | Value |
| --- | --- |
| **Root Directory** | `artifacts/urban-arena` |
| **Framework Preset** | Vite (or Other) |
| **Output Directory** | `dist/public` (set in [artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json)) |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command** | `cd ../.. && pnpm --filter @workspace/urban-arena run typecheck && pnpm --filter @workspace/urban-arena run build` |

### Build-time environment variables

Required by [artifacts/urban-arena/vite.config.ts](artifacts/urban-arena/vite.config.ts) at build time:

| Variable | Value |
| --- | --- |
| `PORT` | `3000` (any positive number; used only for dev server config, not exposed in static output) |
| `BASE_PATH` | `/` |

No `VITE_*` API URL: the app uses `/api/...` on the same host.

### API proxy (rewrites)

[artifacts/urban-arena/vercel.json](artifacts/urban-arena/vercel.json) rewrites:

- `/api/*` → your **Project 1** deployment URL (default: `screen-content-management-api-serve.vercel.app`)
- everything else → `/index.html` (SPA)

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
2. **API project:** set `DATABASE_URL` + `JWT_SECRET` → redeploy → health shows `database: "configured"`.
3. **Frontend project:** root `artifacts/urban-arena`, set `PORT` + `BASE_PATH`, confirm rewrite target matches API URL → deploy.
4. Open frontend URL → `/display` and `/admin/login`; login uses API through `/api/auth/login`.

---

## One project vs two?

| Approach | Supported? |
| --- | --- |
| **Two Vercel projects (recommended)** | API = Node/Express serverless; Frontend = static + rewrites. Matches this repo. |
| **Single project** | Not configured in-repo. Would require merging API + static into one deployment or custom routing. |

The root [vercel.json](vercel.json) only builds the API; do not use it as the frontend project root.

---

## Optional / not on Vercel by default

- **File uploads** (`/api/uploads/*`): need GCS bucket + env vars (see API DEPLOY.md).
- **Google Drive sync**: needs Drive API credentials in API env (if enabled in your deployment).
- **mockup-sandbox**: local/dev only.
