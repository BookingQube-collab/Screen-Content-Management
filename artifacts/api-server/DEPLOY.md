# Deploying `@workspace/api-server` on Vercel

Full stack (API + frontend, env vars, test URLs): see **[DEPLOY.md](../../DEPLOY.md)** at the repo root.

## Project settings (dashboard)

| Setting | Value |
| --- | --- |
| **Root Directory** | `.` (repo root, **recommended**) — uses [vercel.json](../../vercel.json) |
| **Include source files outside Root Directory** | **Enabled** (Settings → Build and Deployment → Root Directory) |
| **Framework Preset** | Express (or Other with entry below) |
| **Install Command** | `pnpm install --frozen-lockfile` — **no** `cd ../..` (monorepo install runs from repo root) |
| **Build Command** | `pnpm run build:libs && pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run build` |
| **Output Directory** | `artifacts/api-server` when Root Directory is `.`; empty/`null` when Root Directory is `artifacts/api-server` (see [vercel.json](vercel.json)) |
| **Entry / main** | `index.cjs` at project root only (`package.json#main`; wraps `dist/internal.cjs`) |
| **Skip TypeScript checking** | **Enabled** (recommended) |

`artifacts/api-server/tsconfig.json` intentionally has `"files": []` so Vercel’s automatic post-build `tsc` is a no-op. Real checking runs in the build command via `pnpm --filter @workspace/api-server run typecheck` (`tsconfig.app.json`).

## Why “Emit skipped” happened

Vercel runs `tsc` when `tsconfig.json` exists at the project root. With `include: ["src"]`, `rootDir: "src"`, and imports from `@workspace/db` / `@workspace/api-zod` (sources under `lib/`), TypeScript cannot emit those dependency files into `src/` and reports `src/routes/health.ts: Emit skipped` (often alongside TS6305 when composite `dist` was missing).

esbuild owns production output; TypeScript is typecheck-only.

## Environment variables (required in Vercel)

Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed). Copy **Name** exactly; paste the same values you use in the repo root `.env` (documented in [.env.example](../../.env.example)). Never commit `.env`.

### Copy-paste table (API project)

| Name | Required for API | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | PostgreSQL URI. Prefer Supabase **pooler** on Vercel. Lazy pool; health works without it but auth/data need it. |
| `JWT_SECRET` | **Yes** | Admin JWT signing; match local `.env` (≥48 chars). Dev fallback exists in code — do not rely on it in production. |
| `SUPABASE_URL` | No | Optional metadata; API uses Drizzle + `pg` only today. |
| `SUPABASE_PROJECT_REF` | No | Optional; e.g. `fiozifqhhawsvvtjamfo`. |
| `SUPABASE_PUBLISHABLE_KEY` | No | Optional; future Supabase JS client. |
| `SUPABASE_SECRET_KEY` | No | Optional; future server-side Supabase client. |
| `SUPABASE_ANON_KEY` | No | Optional; future client Supabase auth. |
| `PORT` | No on Vercel | Local `node index.cjs` / `pnpm dev` only (default **8080** in `.env.example`). Vercel injects routing. |

**Minimum for a working API:** `DATABASE_URL` + `JWT_SECRET`.

### Optional (feature-specific)

| Variable | When needed |
| --- | --- |
| `LOG_LEVEL` | Override pino level (default `info`) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Image/video uploads (`/api/uploads/*`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Yes on Vercel** — full GCP service-account JSON (same key as Drive sync is fine) |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit/GCS public object search |
| `PRIVATE_OBJECT_DIR` | Replit object entity paths |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local dev only — path to JSON key file |

Replit-only object storage sidecar vars are not used on Vercel. On Vercel, set `GOOGLE_SERVICE_ACCOUNT_JSON` (not a file path). Push from repo root: `node scripts/push-gcs-vercel-env.cjs` (requires `DEFAULT_OBJECT_STORAGE_BUCKET_ID` in `.env`).

## Health endpoints (no database required)

After deploy, these should return **200** even if `DATABASE_URL` is missing:

- `GET /` — root health JSON
- `GET /api/health` — health JSON
- `GET /api/healthz` — alias

Response includes `status: "ok"` and `database: "configured" | "not_configured"`.

## Local checks (match CI)

```bash
cd ../..   # repo root from this folder
pnpm install
pnpm run build:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
npx tsc -p tsconfig.json   # should exit 0 (empty project)
```

### Smoke test after build

```bash
cd artifacts/api-server
node -e "const app=require('./index.cjs'); console.log('loaded', typeof app.listen)"
test ! -f dist/index.js && test ! -f dist/index.cjs && echo "dist has no index.* entry"
# Optional: PORT=8080 node index.cjs  # local API port; production uses Vercel routing
```

Root `index.cjs` is CommonJS (`.cjs`) even if `package.json` had `"type": "module"`. The build does **not** emit `dist/index.js` or `dist/index.cjs` so Vercel cannot select a `.js` bundle under `dist/` when Output Directory was previously set to `dist`.

## Runtime crash fixes (serverless)

- **`ReferenceError: module is not defined`** — caused by `dist/index.js` running as ESM (`"type": "module"`) while containing CommonJS. Fix: no `"type": "module"` in `package.json`, no `dist/index.*` build outputs, empty/`null` Output Directory, and root `index.cjs` that `require('express')` so Vercel picks it before `src/app.ts`.
- **DATABASE_URL** — lazy `pg` pool in `@workspace/db`; no throw at import.
- **Object Storage** — GCS client created on first use; Replit sidecar only when `REPL_ID` / `REPLIT_OBJECT_STORAGE=1`.
- **PORT** — not required on Vercel; only `src/index.ts` (local server), not bundled entry `src/app.ts`.
