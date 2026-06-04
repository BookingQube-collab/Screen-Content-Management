# Deploying `@workspace/api-server` on Vercel

Full stack (API + frontend, env vars, test URLs): see **[DEPLOY.md](../../DEPLOY.md)** at the repo root.

## Project settings (dashboard)

| Setting | Value |
| --- | --- |
| **Root Directory** | `artifacts/api-server` |
| **Framework Preset** | Express (or Other with entry below) |
| **Install Command** | *(from `artifacts/api-server/vercel.json`)* `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command** | *(from `vercel.json`)* `cd ../.. && pnpm run build:libs && pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run build` |
| **Output Directory** | *(empty — `vercel.json` sets `outputDirectory: null` to override any dashboard `dist` value)* |
| **Entry / main** | `index.cjs` at project root only (`package.json#main`; wraps `dist/internal.cjs`) |
| **Skip TypeScript checking** | **Enabled** (recommended) |

`artifacts/api-server/tsconfig.json` intentionally has `"files": []` so Vercel’s automatic post-build `tsc` is a no-op. Real checking runs in the build command via `pnpm --filter @workspace/api-server run typecheck` (`tsconfig.app.json`).

## Why “Emit skipped” happened

Vercel runs `tsc` when `tsconfig.json` exists at the project root. With `include: ["src"]`, `rootDir: "src"`, and imports from `@workspace/db` / `@workspace/api-zod` (sources under `lib/`), TypeScript cannot emit those dependency files into `src/` and reports `src/routes/health.ts: Emit skipped` (often alongside TS6305 when composite `dist` was missing).

esbuild owns production output; TypeScript is typecheck-only.

## Environment variables (required in Vercel)

Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed). Never commit `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** (for auth/data routes) | PostgreSQL connection string. Not read at cold start; DB connects on first query. Health checks work without it. |
| `JWT_SECRET` | **Yes** (production) | Secret for admin JWT signing. Dev fallback exists in code; set a strong value in production. |
| `PORT` | No on Vercel | Only for local `node index.cjs` / `pnpm dev`. Vercel injects routing; local default when `VERCEL` is set is `3000`. |

### Optional (feature-specific)

| Variable | When needed |
| --- | --- |
| `LOG_LEVEL` | Override pino level (default `info`) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Image/video uploads (`/api/uploads/*`) |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit/GCS public object search |
| `PRIVATE_OBJECT_DIR` | Replit object entity paths |
| `GOOGLE_APPLICATION_CREDENTIALS` / GCP ADC | GCS on Vercel (not Replit sidecar) |

Replit-only object storage sidecar vars are not used on Vercel; the Storage client uses Application Default Credentials when not on Replit.

## Health endpoints (no database required)

After deploy, these should return **200** even if `DATABASE_URL` is missing:

- `GET /` — root health JSON
- `GET /api/health` — health JSON
- `GET /api/healthz` — alias

Response includes `status: "ok"` and `database: "configured" | "not_configured"`.

## Local checks (match CI)

```bash
cd artifacts/api-server
cd ../.. && pnpm install
cd ../.. && pnpm run build:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
npx tsc -p tsconfig.json   # should exit 0 (empty project)
```

### Smoke test after build

```bash
cd artifacts/api-server
node -e "const app=require('./index.cjs'); console.log('loaded', typeof app.listen)"
test ! -f dist/index.js && test ! -f dist/index.cjs && echo "dist has no index.* entry"
# Optional: PORT=3000 node index.cjs  # only if you add a listen shim; production uses Vercel routing
```

Root `index.cjs` is CommonJS (`.cjs`) even if `package.json` had `"type": "module"`. The build does **not** emit `dist/index.js` or `dist/index.cjs` so Vercel cannot select a `.js` bundle under `dist/` when Output Directory was previously set to `dist`.

## Runtime crash fixes (serverless)

- **`ReferenceError: module is not defined`** — caused by `dist/index.js` running as ESM (`"type": "module"`) while containing CommonJS. Fix: no `"type": "module"` in `package.json`, no `dist/index.*` build outputs, empty/`null` Output Directory, and root `index.cjs` that `require('express')` so Vercel picks it before `src/app.ts`.
- **DATABASE_URL** — lazy `pg` pool in `@workspace/db`; no throw at import.
- **Object Storage** — GCS client created on first use; Replit sidecar only when `REPL_ID` / `REPLIT_OBJECT_STORAGE=1`.
- **PORT** — not required on Vercel; only `src/index.ts` (local server), not bundled entry `src/app.ts`.
