# Deploying `@workspace/api-server` on Vercel

## Project settings (dashboard)

| Setting | Value |
| --- | --- |
| **Root Directory** | `artifacts/api-server` |
| **Framework Preset** | Other |
| **Install Command** | *(from `artifacts/api-server/vercel.json`)* `cd ../.. && pnpm install` |
| **Build Command** | *(from `vercel.json`)* `cd ../.. && pnpm run build:libs && pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run build` |
| **Output Directory** | `dist` |
| **Skip TypeScript checking** | **Enabled** (recommended) |

`artifacts/api-server/tsconfig.json` intentionally has `"files": []` so Vercel’s automatic post-build `tsc` is a no-op. Real checking runs in the build command via `pnpm --filter @workspace/api-server run typecheck` (`tsconfig.app.json`).

## Why “Emit skipped” happened

Vercel runs `tsc` when `tsconfig.json` exists at the project root. With `include: ["src"]`, `rootDir: "src"`, and imports from `@workspace/db` / `@workspace/api-zod` (sources under `lib/`), TypeScript cannot emit those dependency files into `src/` and reports `src/routes/health.ts: Emit skipped` (often alongside TS6305 when composite `dist` was missing).

esbuild owns production output; TypeScript is typecheck-only.

## Local checks (match CI)

```bash
cd artifacts/api-server
cd ../.. && pnpm install
cd ../.. && pnpm run build:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
npx tsc -p tsconfig.json   # should exit 0 (empty project)
```

## Environment variables

Add production secrets in Vercel → Settings → Environment Variables (never commit `.env`).
